<?php

namespace App\Services\SportsData;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Free embedded provider for lesser-known worldwide leagues.
 * Default: generate upcoming fixtures from the in-repo catalogue (offline).
 * Optional: sync real kickoffs from TheSportsDB; fall back to generated per league.
 */
final class EmbeddedWorldLeaguesProvider implements SportsDataProvider
{
    public function __construct(private readonly ?TheSportsDbClient $client = null)
    {
    }

    public function fetchFixtures(?string $apiKey, array $options): array
    {
        $leagues = $this->catalogue();
        $liveSync = (bool) ($options['obscure_live_sync'] ?? false);
        $key = $apiKey ?: '123';
        $client = $this->client ?? new TheSportsDbClient;
        $fixtures = [];
        $liveIndex = 0;
        $liveDisabled = false;

        foreach ($leagues as $league) {
            $live = [];
            if ($liveSync && ! $liveDisabled && ! empty($league['thesportsdb_id'])) {
                if ($liveIndex > 0) {
                    TheSportsDbClient::pauseBetweenLeagues();
                }
                $liveIndex++;
                $result = $this->fetchLiveLeague($client, $key, $league);
                $live = $result['fixtures'];
                if ($result['rate_limited']) {
                    // Stop hammering TheSportsDB; fill remaining leagues from catalogue.
                    $liveDisabled = true;
                    Log::warning('embedded_world stopping live sync after rate limit; using catalogue for remaining leagues');
                }
            }

            if ($live !== []) {
                $fixtures = array_merge($fixtures, $live);
            } else {
                $fixtures = array_merge($fixtures, $this->generateLeagueFixtures($league));
            }
        }

        return $fixtures;
    }

    /**
     * @return list<array{
     *   code: string,
     *   name: string,
     *   country: string,
     *   thesportsdb_id: string|null,
     *   teams: list<array{name: string, short: string}>
     * }>
     */
    private function catalogue(): array
    {
        $path = resource_path('sports/obscure_leagues.php');
        /** @var list<array{code: string, name: string, country: string, thesportsdb_id: string|null, teams: list<array{name: string, short: string}>}> $leagues */
        $leagues = require $path;

        return $leagues;
    }

    /**
     * @param  array{code: string, name: string, country: string, thesportsdb_id: string|null, teams: list<array{name: string, short: string}>}  $league
     * @return array{fixtures: list<SportsFixtureDto>, rate_limited: bool}
     */
    private function fetchLiveLeague(TheSportsDbClient $client, string $key, array $league): array
    {
        $events = $client->fetchNextLeagueEvents($key, (string) $league['thesportsdb_id'], $league['code']);
        if ($events === null) {
            Log::info('embedded_world live sync rate-limited; using catalogue', [
                'league' => $league['code'],
            ]);

            return ['fixtures' => [], 'rate_limited' => true];
        }
        if ($events === []) {
            Log::info('embedded_world live sync empty; using catalogue', [
                'league' => $league['code'],
            ]);

            return ['fixtures' => [], 'rate_limited' => false];
        }

        $fixtures = [];
        foreach ($events as $event) {
            $home = trim((string) ($event['strHomeTeam'] ?? ''));
            $away = trim((string) ($event['strAwayTeam'] ?? ''));
            if ($home === '' || $away === '') {
                continue;
            }

            $date = $event['dateEvent'] ?? null;
            $time = $event['strTime'] ?: '15:00:00';
            if (! $date) {
                continue;
            }
            if (strlen($time) === 5) {
                $time .= ':00';
            }

            $fixtures[] = new SportsFixtureDto(
                providerEventId: 'tsdb:'.($event['idEvent'] ?? uniqid('e', true)),
                competitionCode: $league['code'],
                competitionName: $league['name'],
                country: $league['country'],
                homeName: $home,
                homeShort: $this->short($home),
                awayName: $away,
                awayShort: $this->short($away),
                kickoffIso: $date.'T'.$time.'+00:00',
                status: 'upcoming',
                isTopLeague: false,
            );
        }

        return ['fixtures' => $fixtures, 'rate_limited' => false];
    }

    /**
     * Round-robin pairings over the next ~12 days (2 fixtures per league-day slot).
     *
     * @param  array{code: string, name: string, country: string, thesportsdb_id: string|null, teams: list<array{name: string, short: string}>}  $league
     * @return list<SportsFixtureDto>
     */
    private function generateLeagueFixtures(array $league): array
    {
        $teams = $league['teams'] ?? [];
        if (count($teams) < 2) {
            return [];
        }

        $fixtures = [];
        $pairIndex = 0;
        $n = count($teams);
        $days = 12;

        for ($day = 1; $day <= $days; $day++) {
            $home = $teams[$pairIndex % $n];
            $away = $teams[($pairIndex + 1 + intdiv($pairIndex, $n)) % $n];
            if ($home['name'] === $away['name']) {
                $away = $teams[($pairIndex + 2) % $n];
            }

            $kickoff = now('UTC')->startOfDay()->addDays($day)->setTime(15 + ($pairIndex % 3), 0);
            $ymd = $kickoff->format('Ymd');
            $homeSlug = Str::slug($home['name']);
            $awaySlug = Str::slug($away['name']);

            $fixtures[] = new SportsFixtureDto(
                providerEventId: "emb:{$league['code']}:{$ymd}:{$homeSlug}-{$awaySlug}",
                competitionCode: $league['code'],
                competitionName: $league['name'],
                country: $league['country'],
                homeName: $home['name'],
                homeShort: $home['short'],
                awayName: $away['name'],
                awayShort: $away['short'],
                kickoffIso: $kickoff->toIso8601String(),
                status: 'upcoming',
                isTopLeague: false,
            );

            $pairIndex++;
        }

        return $fixtures;
    }

    private function short(string $name): string
    {
        $clean = preg_replace('/[^A-Za-z]/', '', $name) ?: 'TM';

        return strtoupper(substr($clean, 0, 3));
    }
}
