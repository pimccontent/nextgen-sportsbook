<?php

namespace App\Services\SportsData;

use Illuminate\Support\Facades\Http;

/**
 * Free German football API (no key): https://api.openligadb.de/
 */
final class OpenLigaDbProvider implements SportsDataProvider
{
    public function fetchFixtures(?string $apiKey, array $options): array
    {
        $leagueShortcut = (string) ($options['openligadb_league'] ?? 'bl1');
        $url = "https://api.openligadb.de/getmatchdata/{$leagueShortcut}";

        $res = Http::timeout(20)->acceptJson()->get($url);
        if (! $res->successful()) {
            return [];
        }

        $rows = $res->json();
        if (! is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = (string) ($row['matchID'] ?? '');
            if ($id === '') {
                continue;
            }
            $home = (string) ($row['team1']['teamName'] ?? 'Home');
            $away = (string) ($row['team2']['teamName'] ?? 'Away');
            $kickoff = (string) ($row['matchDateTimeUTC'] ?? $row['matchDateTime'] ?? now()->toIso8601String());
            $finished = (bool) ($row['matchIsFinished'] ?? false);
            $kickoffTs = strtotime($kickoff) ?: null;
            $started = $kickoffTs !== null && $kickoffTs <= time();
            $status = $finished ? 'finished' : ($started ? 'live' : 'upcoming');
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

            $out[] = new SportsFixtureDto(
                'oldb:'.$id,
                strtoupper($leagueShortcut),
                (string) ($row['leagueName'] ?? 'OpenLigaDB'),
                'Germany',
                $home,
                strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $home) ?: 'HOM', 0, 3)),
                $away,
                strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $away) ?: 'AWY', 0, 3)),
                $kickoff,
                $status,
                $scoreHome,
                $scoreAway,
                true,
                null,
                $finished ? 'FT' : ($started ? '1H' : null),
            );
        }

        return $out;
    }
}
