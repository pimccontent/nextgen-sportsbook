<?php

namespace App\Services\SportsData;

final class MockSportsDataProvider implements SportsDataProvider
{
    public function fetchFixtures(?string $apiKey, array $options): array
    {
        $now = now('UTC');

        $top = [
            new SportsFixtureDto('mock:epl-1', 'PL', 'Premier League', 'England', 'Manchester City', 'MCI', 'Liverpool', 'LIV', $now->copy()->addDays(1)->toIso8601String(), 'upcoming', null, null, true),
            new SportsFixtureDto('mock:laliga-1', 'PD', 'La Liga', 'Spain', 'Real Madrid', 'RMA', 'Barcelona', 'BAR', $now->copy()->addDays(2)->toIso8601String(), 'upcoming', null, null, true),
            new SportsFixtureDto('mock:bundes-1', 'BL1', 'Bundesliga', 'Germany', 'Bayern Munich', 'BAY', 'Dortmund', 'BVB', $now->copy()->addDays(2)->setHour(18)->toIso8601String(), 'upcoming', null, null, true),
            new SportsFixtureDto('mock:serie-1', 'SA', 'Serie A', 'Italy', 'Inter', 'INT', 'AC Milan', 'MIL', $now->copy()->addDays(3)->toIso8601String(), 'upcoming', null, null, true),
            new SportsFixtureDto('mock:ligue-1', 'FL1', 'Ligue 1', 'France', 'PSG', 'PSG', 'Marseille', 'OM', $now->copy()->addDays(3)->setHour(20)->toIso8601String(), 'upcoming', null, null, true),
        ];

        $other = [
            new SportsFixtureDto('mock:gpl-1', 'GPL', 'Ghana Premier League', 'Ghana', 'Asante Kotoko', 'KOT', 'Hearts of Oak', 'HEA', $now->copy()->addDays(1)->setHour(16)->toIso8601String(), 'upcoming', null, null, false),
            new SportsFixtureDto('mock:gpl-2', 'GPL', 'Ghana Premier League', 'Ghana', 'Medeama', 'MED', 'Bechem United', 'BEC', $now->copy()->addDays(4)->toIso8601String(), 'upcoming', null, null, false),
            new SportsFixtureDto('mock:gpl-3', 'GPL', 'Ghana Premier League', 'Ghana', 'Dreams FC', 'DRM', 'Accra Lions', 'ACL', $now->copy()->addDays(2)->setHour(15)->toIso8601String(), 'upcoming', null, null, false),
            new SportsFixtureDto('mock:afcon-1', 'AFCON', 'AFCON Qualifiers', 'International', 'Ghana', 'GHA', 'Nigeria', 'NGA', $now->copy()->addDays(5)->toIso8601String(), 'upcoming', null, null, false),
            new SportsFixtureDto('mock:caf-1', 'CAF', 'CAF Champions League', 'Africa', 'Al Ahly', 'AHL', 'Esperance', 'EST', $now->copy()->addDays(6)->toIso8601String(), 'upcoming', null, null, false),
            new SportsFixtureDto('mock:championship-1', 'ELC', 'Championship', 'England', 'Leeds United', 'LEE', 'Leicester', 'LEI', $now->copy()->addDays(2)->setHour(15)->toIso8601String(), 'upcoming', null, null, false),
            new SportsFixtureDto('mock:eredivisie-1', 'DED', 'Eredivisie', 'Netherlands', 'Ajax', 'AJX', 'PSV', 'PSV', $now->copy()->addDays(3)->setHour(19)->toIso8601String(), 'upcoming', null, null, false),
            new SportsFixtureDto('mock:liga-portugal-1', 'PPL', 'Liga Portugal', 'Portugal', 'Benfica', 'BEN', 'Porto', 'POR', $now->copy()->addDays(4)->setHour(20)->toIso8601String(), 'upcoming', null, null, false),
            new SportsFixtureDto('mock:mls-1', 'MLS', 'MLS', 'USA', 'Inter Miami', 'MIA', 'LAFC', 'LFC', $now->copy()->addDays(5)->setHour(01)->toIso8601String(), 'upcoming', null, null, false),
        ];

        $out = [];
        if ($options['sync_top_leagues'] ?? true) {
            $out = array_merge($out, $top);
        }
        if ($options['sync_other_leagues'] ?? true) {
            $out = array_merge($out, $other);
        }

        return $out;
    }
}
