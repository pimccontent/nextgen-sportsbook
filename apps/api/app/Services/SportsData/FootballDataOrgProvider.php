<?php

namespace App\Services\SportsData;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Free-tier provider: https://www.football-data.org/
 * Requires X-Auth-Token. Rate-limited on free plan.
 */
final class FootballDataOrgProvider implements SportsDataProvider
{
    public function fetchFixtures(?string $apiKey, array $options): array
    {
        if (! $apiKey) {
            throw new RuntimeException('football-data.org requires a free API token in Settings → Sports data.');
        }

        $codes = array_filter(array_map('trim', explode(',', (string) ($options['competition_codes'] ?? 'PL,PD,BL1'))));
        $topCodes = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL'];
        $fixtures = [];

        foreach ($codes as $code) {
            $isTop = in_array($code, $topCodes, true);
            if ($isTop && ! ($options['sync_top_leagues'] ?? true)) {
                continue;
            }
            if (! $isTop && ! ($options['sync_other_leagues'] ?? true)) {
                continue;
            }

            $response = Http::withHeaders(['X-Auth-Token' => $apiKey])
                ->timeout(20)
                ->get("https://api.football-data.org/v4/competitions/{$code}/matches", [
                    'status' => 'SCHEDULED',
                ]);

            if (! $response->successful()) {
                throw new RuntimeException("football-data.org error for {$code}: HTTP ".$response->status());
            }

            $body = $response->json();
            $compName = $body['competition']['name'] ?? $code;
            $area = $body['competition']['area']['name'] ?? 'International';

            foreach ($body['matches'] ?? [] as $match) {
                $home = $match['homeTeam']['name'] ?? 'Home';
                $away = $match['awayTeam']['name'] ?? 'Away';
                $fixtures[] = new SportsFixtureDto(
                    providerEventId: 'fd:'.($match['id'] ?? uniqid()),
                    competitionCode: strtolower($code),
                    competitionName: $compName,
                    country: $area,
                    homeName: $home,
                    homeShort: strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $home) ?: 'HOM', 0, 3)),
                    awayName: $away,
                    awayShort: strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $away) ?: 'AWY', 0, 3)),
                    kickoffIso: $match['utcDate'] ?? now()->toIso8601String(),
                    status: 'upcoming',
                    isTopLeague: $isTop,
                );
            }
        }

        return $fixtures;
    }
}
