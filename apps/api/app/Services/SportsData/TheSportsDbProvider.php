<?php

namespace App\Services\SportsData;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Free public sports API for testing.
 * Docs: https://www.thesportsdb.com/api.php
 * Demo key "123" works without a paid plan.
 */
final class TheSportsDbProvider implements SportsDataProvider
{
    public function fetchFixtures(?string $apiKey, array $options): array
    {
        $key = $apiKey ?: '123';
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
                ['id' => '4685', 'code' => 'gpl', 'name' => 'Ghana Premier League', 'country' => 'Ghana', 'top' => false],
                ['id' => '4481', 'code' => 'europa', 'name' => 'UEFA Europa League', 'country' => 'Europe', 'top' => false],
            ]);
        }

        $fixtures = [];
        $errors = [];

        foreach ($leagues as $league) {
            try {
                $response = Http::timeout(25)->get(
                    "https://www.thesportsdb.com/api/v1/json/{$key}/eventsnextleague.php",
                    ['id' => $league['id']]
                );

                if (! $response->successful()) {
                    $errors[] = "{$league['code']} HTTP ".$response->status();
                    continue;
                }

                $events = $response->json('events') ?? [];
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
                    $kickoff = $date.'T'.$time.'+00:00';

                    $fixtures[] = new SportsFixtureDto(
                        providerEventId: 'tsdb:'.($event['idEvent'] ?? uniqid('e', true)),
                        competitionCode: $league['code'],
                        competitionName: $league['name'],
                        country: $league['country'],
                        homeName: $home,
                        homeShort: $this->short($home),
                        awayName: $away,
                        awayShort: $this->short($away),
                        kickoffIso: $kickoff,
                        status: 'upcoming',
                        isTopLeague: $league['top'],
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('thesportsdb league fetch failed', [
                    'league' => $league['code'],
                    'error' => $e->getMessage(),
                ]);
                $errors[] = $league['code'].': '.$e->getMessage();
            }
        }

        if ($fixtures === [] && $errors !== []) {
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
