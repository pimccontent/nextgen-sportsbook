<?php

namespace App\Services\SportsData;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Fetches live/finished state for a single provider event id.
 * Catalogue sync stays separate — this is the in-play adapter.
 */
final class LiveProviderLookup
{
    public function __construct(private readonly ?TheSportsDbClient $tsdb = null)
    {
    }

    public static function isPollable(string $providerEventId): bool
    {
        return str_starts_with($providerEventId, 'tsdb:')
            || str_starts_with($providerEventId, 'oldb:')
            || str_starts_with($providerEventId, 'fd:');
    }

    public static function isSynthetic(string $providerEventId): bool
    {
        return str_starts_with($providerEventId, 'emb:')
            || str_starts_with($providerEventId, 'custom:')
            || str_starts_with($providerEventId, 'mock:');
    }

    /**
     * @param  array<string, mixed>  $context  Existing event hints (competition code/name/country, team names).
     */
    public function lookup(string $providerEventId, ?string $apiKey, array $context = []): ?SportsFixtureDto
    {
        if (str_starts_with($providerEventId, 'tsdb:')) {
            return $this->lookupTheSportsDb(substr($providerEventId, 5), $apiKey ?: '123', $context);
        }
        if (str_starts_with($providerEventId, 'oldb:')) {
            return $this->lookupOpenLigaDb(substr($providerEventId, 5), $context);
        }
        if (str_starts_with($providerEventId, 'fd:')) {
            return $this->lookupFootballData(substr($providerEventId, 3), $apiKey, $context);
        }

        return null;
    }

    /**
     * Optional premium V2 livescore overlay keyed by idEvent.
     *
     * @return array<string, array{scoreHome: ?int, scoreAway: ?int, minute: ?int, period: ?string, status: string}>
     */
    public function theSportsDbLivescoreIndex(string $apiKey): array
    {
        $client = $this->tsdb ?? new TheSportsDbClient;
        $rows = $client->fetchSoccerLivescores($apiKey);
        if ($rows === null || $rows === []) {
            return [];
        }

        $index = [];
        foreach ($rows as $row) {
            $id = (string) ($row['idEvent'] ?? '');
            if ($id === '') {
                continue;
            }
            $progress = (string) ($row['strProgress'] ?? '');
            $statusRaw = (string) ($row['strStatus'] ?? '');
            [$status, $minute, $period] = $this->mapTsdbProgress($progress, $statusRaw);
            $index[$id] = [
                'scoreHome' => $this->nullableInt($row['intHomeScore'] ?? null),
                'scoreAway' => $this->nullableInt($row['intAwayScore'] ?? null),
                'minute' => $minute,
                'period' => $period,
                'status' => $status,
            ];
        }

        return $index;
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function lookupTheSportsDb(string $eventId, string $apiKey, array $context): ?SportsFixtureDto
    {
        $client = $this->tsdb ?? new TheSportsDbClient;
        $event = $client->lookupEvent($apiKey, $eventId);
        if ($event === null || $event === []) {
            return null;
        }

        $home = trim((string) ($event['strHomeTeam'] ?? $context['homeName'] ?? ''));
        $away = trim((string) ($event['strAwayTeam'] ?? $context['awayName'] ?? ''));
        if ($home === '' || $away === '') {
            return null;
        }

        $date = $event['dateEvent'] ?? null;
        $time = $event['strTime'] ?: '15:00:00';
        if (is_string($time) && strlen($time) === 5) {
            $time .= ':00';
        }
        $kickoff = $date
            ? $date.'T'.$time.'+00:00'
            : (string) ($context['kickoffIso'] ?? now()->toIso8601String());

        $statusRaw = (string) ($event['strStatus'] ?? $event['strProgress'] ?? '');
        [$status, $minute, $period] = $this->mapTsdbProgress(
            (string) ($event['strProgress'] ?? ''),
            $statusRaw
        );

        // Finished scores often present without a clear live flag.
        $scoreHome = $this->nullableInt($event['intHomeScore'] ?? null);
        $scoreAway = $this->nullableInt($event['intAwayScore'] ?? null);
        if ($status === 'upcoming' && $scoreHome !== null && $scoreAway !== null) {
            $finishedHint = strtoupper($statusRaw);
            if (in_array($finishedHint, ['FT', 'AET', 'PEN', 'FINISHED', 'MATCH FINISHED'], true)
                || str_contains(strtolower((string) ($event['strProgress'] ?? '')), 'final')
            ) {
                $status = 'finished';
                $period = $period ?: 'FT';
            }
        }

        $compCode = (string) ($context['competitionCode'] ?? $event['idLeague'] ?? 'tsdb');
        $compName = (string) ($context['competitionName'] ?? $event['strLeague'] ?? 'TheSportsDB');
        $country = (string) ($context['country'] ?? $event['strCountry'] ?? 'International');

        return new SportsFixtureDto(
            providerEventId: 'tsdb:'.$eventId,
            competitionCode: Str::slug($compCode) ?: 'tsdb',
            competitionName: $compName,
            country: $country,
            homeName: $home,
            homeShort: $this->short($home),
            awayName: $away,
            awayShort: $this->short($away),
            kickoffIso: $kickoff,
            status: $status,
            scoreHome: $scoreHome,
            scoreAway: $scoreAway,
            isTopLeague: (bool) ($context['isTopLeague'] ?? false),
            minute: $minute,
            period: $period,
        );
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function lookupOpenLigaDb(string $matchId, array $context): ?SportsFixtureDto
    {
        $league = (string) ($context['competitionCode'] ?? $context['openligadb_league'] ?? 'bl1');
        $league = strtolower($league);
        $url = "https://api.openligadb.de/getmatchdata/{$league}";

        try {
            $res = Http::timeout(20)->acceptJson()->get($url);
        } catch (\Throwable $e) {
            Log::warning('openligadb live lookup failed', ['error' => $e->getMessage()]);

            return null;
        }

        if (! $res->successful()) {
            return null;
        }

        $rows = $res->json();
        if (! is_array($rows)) {
            return null;
        }

        $row = null;
        foreach ($rows as $candidate) {
            if (! is_array($candidate)) {
                continue;
            }
            if ((string) ($candidate['matchID'] ?? '') === $matchId) {
                $row = $candidate;
                break;
            }
        }

        if ($row === null) {
            return null;
        }

        $home = (string) ($row['team1']['teamName'] ?? $context['homeName'] ?? 'Home');
        $away = (string) ($row['team2']['teamName'] ?? $context['awayName'] ?? 'Away');
        $kickoff = (string) ($row['matchDateTimeUTC'] ?? $row['matchDateTime'] ?? $context['kickoffIso'] ?? now()->toIso8601String());
        $finished = (bool) ($row['matchIsFinished'] ?? false);

        $scoreHome = null;
        $scoreAway = null;
        $results = $row['matchResults'] ?? [];
        if (is_array($results) && $results !== []) {
            $final = end($results);
            if (is_array($final)) {
                $scoreHome = isset($final['pointsTeam1']) ? (int) $final['pointsTeam1'] : null;
                $scoreAway = isset($final['pointsTeam2']) ? (int) $final['pointsTeam2'] : null;
            }
        }

        $kickoffAt = strtotime($kickoff) ?: null;
        $started = $kickoffAt !== null && $kickoffAt <= time();

        if ($finished) {
            $status = 'finished';
            $period = 'FT';
            $minute = null;
        } elseif ($started) {
            $status = 'live';
            $period = '1H';
            $minute = null;
        } else {
            $status = 'upcoming';
            $period = null;
            $minute = null;
        }

        return new SportsFixtureDto(
            providerEventId: 'oldb:'.$matchId,
            competitionCode: strtoupper($league),
            competitionName: (string) ($row['leagueName'] ?? $context['competitionName'] ?? 'OpenLigaDB'),
            country: (string) ($context['country'] ?? 'Germany'),
            homeName: $home,
            homeShort: $this->short($home),
            awayName: $away,
            awayShort: $this->short($away),
            kickoffIso: $kickoff,
            status: $status,
            scoreHome: $scoreHome,
            scoreAway: $scoreAway,
            isTopLeague: true,
            minute: $minute,
            period: $period,
        );
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function lookupFootballData(string $matchId, ?string $apiKey, array $context): ?SportsFixtureDto
    {
        if (! $apiKey) {
            return null;
        }

        try {
            $res = Http::withHeaders(['X-Auth-Token' => $apiKey])
                ->timeout(20)
                ->get("https://api.football-data.org/v4/matches/{$matchId}");
        } catch (\Throwable $e) {
            Log::warning('football-data live lookup failed', ['error' => $e->getMessage()]);

            return null;
        }

        if (! $res->successful()) {
            return null;
        }

        $match = $res->json();
        if (! is_array($match)) {
            return null;
        }

        $home = (string) ($match['homeTeam']['name'] ?? $context['homeName'] ?? 'Home');
        $away = (string) ($match['awayTeam']['name'] ?? $context['awayName'] ?? 'Away');
        $code = (string) ($match['competition']['code'] ?? $context['competitionCode'] ?? 'FD');
        $compName = (string) ($match['competition']['name'] ?? $context['competitionName'] ?? 'Football Data');
        $country = (string) ($match['area']['name'] ?? $context['country'] ?? 'International');
        $kickoff = (string) ($match['utcDate'] ?? $context['kickoffIso'] ?? now()->toIso8601String());

        $apiStatus = strtoupper((string) ($match['status'] ?? 'SCHEDULED'));
        [$status, $period] = match ($apiStatus) {
            'LIVE', 'IN_PLAY' => ['live', '1H'],
            'PAUSED', 'HALFTIME' => ['live', 'HT'],
            'FINISHED', 'AWARDED' => ['finished', 'FT'],
            'POSTPONED' => ['upcoming', null],
            'CANCELLED', 'SUSPENDED' => ['upcoming', null],
            default => ['upcoming', null],
        };

        $scoreHome = $this->nullableInt($match['score']['fullTime']['home'] ?? $match['score']['regularTime']['home'] ?? null);
        $scoreAway = $this->nullableInt($match['score']['fullTime']['away'] ?? $match['score']['regularTime']['away'] ?? null);
        if ($scoreHome === null) {
            $scoreHome = $this->nullableInt($match['score']['halfTime']['home'] ?? null);
        }
        if ($scoreAway === null) {
            $scoreAway = $this->nullableInt($match['score']['halfTime']['away'] ?? null);
        }

        $minute = null;
        if (isset($match['minute']) && is_numeric($match['minute'])) {
            $minute = (int) $match['minute'];
        }

        return new SportsFixtureDto(
            providerEventId: 'fd:'.$matchId,
            competitionCode: strtolower($code),
            competitionName: $compName,
            country: $country,
            homeName: $home,
            homeShort: $this->short($home),
            awayName: $away,
            awayShort: $this->short($away),
            kickoffIso: $kickoff,
            status: $status,
            scoreHome: $scoreHome,
            scoreAway: $scoreAway,
            isTopLeague: true,
            minute: $minute,
            period: $period,
        );
    }

    /**
     * @return array{0: string, 1: ?int, 2: ?string} status, minute, period
     */
    private function mapTsdbProgress(string $progress, string $statusRaw): array
    {
        $raw = strtoupper(trim($statusRaw !== '' ? $statusRaw : $progress));
        $progressLower = strtolower($progress);

        if ($raw === '' || in_array($raw, ['NS', 'NOT STARTED', 'SCHEDULED', 'TIME TO BE DEFINED', 'TBD'], true)) {
            return ['upcoming', null, null];
        }

        if (in_array($raw, ['FT', 'AET', 'PEN', 'FINISHED', 'MATCH FINISHED'], true)
            || str_contains($progressLower, 'final')
        ) {
            return ['finished', null, 'FT'];
        }

        if (in_array($raw, ['HT', 'HALFTIME', 'PAUSE'], true)) {
            return ['live', 45, 'HT'];
        }

        if (preg_match('/(\d{1,3})/', $progress, $m)) {
            $minute = (int) $m[1];
            $period = $minute <= 45 ? '1H' : '2H';

            return ['live', $minute, $period];
        }

        if (in_array($raw, ['1H', '2H', 'ET', 'LIVE', 'IN PLAY', 'IN_PLAY'], true)
            || str_contains($progressLower, 'st')
            || str_contains($progressLower, 'nd')
            || str_contains($progressLower, 'rd')
            || str_contains($progressLower, 'th')
        ) {
            return ['live', null, in_array($raw, ['2H', 'ET'], true) ? $raw : '1H'];
        }

        return ['upcoming', null, null];
    }

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }

    private function short(string $name): string
    {
        $clean = preg_replace('/[^A-Za-z]/', '', $name) ?: 'TM';

        return strtoupper(substr($clean, 0, 3));
    }
}
