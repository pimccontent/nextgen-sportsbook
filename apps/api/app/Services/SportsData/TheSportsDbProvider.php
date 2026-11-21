<?php

namespace App\Services\SportsData;

use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Free public sports API for testing.
 * Docs: https://www.thesportsdb.com/api.php
 * Demo key "123" works without a paid plan (strict rate limits).
 */
final class TheSportsDbProvider implements SportsDataProvider
{
    public function __construct(private readonly ?TheSportsDbClient $client = null)
    {
    }

    public function fetchFixtures(?string $apiKey, array $options): array
    {
        $key = $apiKey ?: '123';
        $client = $this->client ?? new TheSportsDbClient;
        $leagues = [];

        if ($options['sync_top_leagues'] ?? true) {
            $leagues = array_merge($leagues, [
                ['id' => '4328', 'code' => 'epl', 'name' => 'English Premier League', 'country' => 'England', 'top' => true],
                ['id' => '4335', 'code' => 'laliga', 'name' => 'Spanish La Liga', 'country' => 'Spain', 'top' => true],
                ['id' => '4331', 'code' => 'bundesliga', 'name' => 'German Bundesliga', 'country' => 'Germany', 'top' => true],
                ['id' => '4332', 'code' => 'seriea', 'name' => 'Italian Serie A', 'country' => 'Italy', 'top' => true],
                ['id' => '4334', 'code' => 'ligue1', 'name' => 'French Ligue 1', 'country' => 'France', 'top' => true],
                ['id' => '4480', 'code' => 'ucl', 'name' => 'UEFA Champions League', 'country' => 'Europe', 'top' => true],
            ]);
        }

        if ($options['sync_other_leagues'] ?? true) {
            $leagues = array_merge($leagues, [
                ['id' => '4329', 'code' => 'championship', 'name' => 'English League Championship', 'country' => 'England', 'top' => false],
                ['id' => '4346', 'code' => 'eredivisie', 'name' => 'Dutch Eredivisie', 'country' => 'Netherlands', 'top' => false],
                ['id' => '4351', 'code' => 'primeira', 'name' => 'Portuguese Primeira Liga', 'country' => 'Portugal', 'top' => false],
                ['id' => '4396', 'code' => 'spl', 'name' => 'Scottish Premiership', 'country' => 'Scotland', 'top' => false],
                ['id' => '4974', 'code' => 'gpl', 'name' => 'Ghana Premier League', 'country' => 'Ghana', 'top' => false],
                ['id' => '4481', 'code' => 'europa', 'name' => 'UEFA Europa League', 'country' => 'Europe', 'top' => false],
            ]);
        }

        $fixtures = [];
        $errors = [];
        $rateLimited = false;

        foreach ($leagues as $index => $league) {
            // Space requests — free demo key 123 is aggressively rate-limited.
            if ($index > 0) {
                TheSportsDbClient::pauseBetweenLeagues();
            }

            $events = $client->fetchNextLeagueEvents($key, $league['id'], $league['code']);
            if ($events === null) {
                $rateLimited = true;
                $errors[] = "{$league['code']} rate-limited or unreachable";
                // Stop further TheSportsDB calls; ingestion can still merge obscure leagues.
                break;
            }

            if ($events === []) {
                $errors[] = "{$league['code']} empty";
                continue;
            }

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
                    isTopLeague: $league['top'],
                );
            }
        }

        if ($fixtures === [] && $errors !== []) {
            Log::warning('thesportsdb sync produced no fixtures', ['errors' => $errors]);

            if ($rateLimited) {
                throw new RuntimeException(
                    'TheSportsDB rate-limited this sync (HTTP 429). Wait 1–2 minutes and try again, '.
                    'or switch Sports data provider to embedded_world (obscure leagues) or mock (offline).'
                );
            }

            throw new RuntimeException('TheSportsDB returned no fixtures. '.implode('; ', $errors));
        }

        return $fixtures;
    }

    private function short(string $name): string
    {
        $clean = preg_replace('/[^A-Za-z]/', '', $name) ?: 'TM';

        return strtoupper(substr($clean, 0, 3));
    }
}
