<?php

namespace Database\Seeders;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use App\Models\Competition;
use App\Models\Market;
use App\Models\Selection;
use App\Models\Sport;
use App\Models\SportEvent;
use App\Models\Team;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SportsCatalogueSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $football = Sport::query()->updateOrCreate(
                ['slug' => 'football'],
                ['name' => 'Football', 'status' => 'active']
            );

            $competitions = [
                ['slug' => 'afcon-q', 'name' => 'AFCON Qualifiers', 'country' => 'International'],
                ['slug' => 'nations-a', 'name' => 'UEFA Nations League A', 'country' => 'International'],
                ['slug' => 'epl', 'name' => 'Premier League', 'country' => 'England'],
                ['slug' => 'laliga', 'name' => 'La Liga', 'country' => 'Spain'],
                ['slug' => 'gpl', 'name' => 'Ghana Premier League', 'country' => 'Ghana'],
            ];

            $competitionModels = [];
            foreach ($competitions as $c) {
                $competitionModels[$c['slug']] = Competition::query()->updateOrCreate(
                    ['slug' => $c['slug']],
                    [
                        'sport_id' => $football->id,
                        'name' => $c['name'],
                        'country' => $c['country'],
                        'season_label' => '2026',
                        'status' => 'active',
                        'provider_competition_id' => 'mock:'.$c['slug'],
                    ]
                );
            }

            $teams = [
                ['slug' => 'gha', 'name' => 'Ghana', 'short_name' => 'GHA'],
                ['slug' => 'som', 'name' => 'Somalia', 'short_name' => 'SOM'],
                ['slug' => 'ita', 'name' => 'Italy', 'short_name' => 'ITA'],
                ['slug' => 'fra', 'name' => 'France', 'short_name' => 'FRA'],
                ['slug' => 'eng', 'name' => 'England', 'short_name' => 'ENG'],
                ['slug' => 'cro', 'name' => 'Croatia', 'short_name' => 'CRO'],
                ['slug' => 'kod', 'name' => 'Asante Kotoko', 'short_name' => 'KOT'],
                ['slug' => 'hea', 'name' => 'Hearts of Oak', 'short_name' => 'HEA'],
                ['slug' => 'ars', 'name' => 'Arsenal', 'short_name' => 'ARS'],
                ['slug' => 'che', 'name' => 'Chelsea', 'short_name' => 'CHE'],
            ];

            $teamModels = [];
            foreach ($teams as $t) {
                $teamModels[$t['slug']] = Team::query()->updateOrCreate(
                    ['slug' => $t['slug']],
                    [
                        'sport_id' => $football->id,
                        'name' => $t['name'],
                        'short_name' => $t['short_name'],
                        'provider_team_id' => 'mock:'.$t['slug'],
                    ]
                );
            }

            $fixtures = [
                [
                    'public_id' => 'fx-gha-som',
                    'competition' => 'afcon-q',
                    'home' => 'gha',
                    'away' => 'som',
                    'kickoff' => '2026-11-12T19:45:00+00:00',
                    'status' => EventStatus::Live,
                    'minute' => 67,
                    'score_home' => 2,
                    'score_away' => 0,
                    'main' => [
                        ['id' => 'gha-1', 'label' => '1', 'side' => 'home', 'odds' => 1.17, 'state' => 'open', 'movement' => 'down'],
                        ['id' => 'gha-x', 'label' => 'X', 'side' => 'draw', 'odds' => 5.2, 'state' => 'open', 'movement' => 'up'],
                        ['id' => 'gha-2', 'label' => '2', 'side' => 'away', 'odds' => 27, 'state' => 'open', 'movement' => 'none'],
                    ],
                    'extra' => [
                        [
                            'id' => 'm-ou25',
                            'name' => 'Over/Under 2.5',
                            'selections' => [
                                ['id' => 'ou-o', 'label' => 'Over 2.5', 'side' => 'home', 'odds' => 1.62, 'state' => 'open'],
                                ['id' => 'ou-u', 'label' => 'Under 2.5', 'side' => 'away', 'odds' => 2.25, 'state' => 'open'],
                            ],
                        ],
                        [
                            'id' => 'm-btts',
                            'name' => 'Both Teams To Score',
                            'selections' => [
                                ['id' => 'btts-y', 'label' => 'Yes', 'side' => 'home', 'odds' => 2.4, 'state' => 'open'],
                                ['id' => 'btts-n', 'label' => 'No', 'side' => 'away', 'odds' => 1.55, 'state' => 'open'],
                            ],
                        ],
                    ],
                ],
                [
                    'public_id' => 'fx-ita-fra',
                    'competition' => 'nations-a',
                    'home' => 'ita',
                    'away' => 'fra',
                    'kickoff' => '2026-11-12T19:45:00+00:00',
                    'status' => EventStatus::Upcoming,
                    'main' => [
                        ['id' => 'ita-1', 'label' => '1', 'side' => 'home', 'odds' => 3.7, 'state' => 'open'],
                        ['id' => 'ita-x', 'label' => 'X', 'side' => 'draw', 'odds' => 3.75, 'state' => 'open'],
                        ['id' => 'ita-2', 'label' => '2', 'side' => 'away', 'odds' => 2.07, 'state' => 'open', 'movement' => 'up'],
                    ],
                    'extra' => [
                        [
                            'id' => 'm-ita-dc',
                            'name' => 'Double Chance',
                            'selections' => [
                                ['id' => 'dc-1x', 'label' => '1X', 'side' => 'home', 'odds' => 1.72, 'state' => 'open'],
                                ['id' => 'dc-12', 'label' => '12', 'side' => 'draw', 'odds' => 1.28, 'state' => 'open'],
                                ['id' => 'dc-x2', 'label' => 'X2', 'side' => 'away', 'odds' => 1.35, 'state' => 'open'],
                            ],
                        ],
                    ],
                ],
                [
                    'public_id' => 'fx-eng-cro',
                    'competition' => 'nations-a',
                    'home' => 'eng',
                    'away' => 'cro',
                    'kickoff' => '2026-11-12T17:30:00+00:00',
                    'status' => EventStatus::Upcoming,
                    'main' => [
                        ['id' => 'eng-1', 'label' => '1', 'side' => 'home', 'odds' => 1.31, 'state' => 'open'],
                        ['id' => 'eng-x', 'label' => 'X', 'side' => 'draw', 'odds' => 6.2, 'state' => 'suspended'],
                        ['id' => 'eng-2', 'label' => '2', 'side' => 'away', 'odds' => 11, 'state' => 'open', 'movement' => 'down'],
                    ],
                    'extra' => [],
                ],
                [
                    'public_id' => 'fx-kod-hea',
                    'competition' => 'gpl',
                    'home' => 'kod',
                    'away' => 'hea',
                    'kickoff' => '2026-11-13T16:00:00+00:00',
                    'status' => EventStatus::Upcoming,
                    'main' => [
                        ['id' => 'kod-1', 'label' => '1', 'side' => 'home', 'odds' => 2.15, 'state' => 'open'],
                        ['id' => 'kod-x', 'label' => 'X', 'side' => 'draw', 'odds' => 3.1, 'state' => 'open'],
                        ['id' => 'kod-2', 'label' => '2', 'side' => 'away', 'odds' => 3.4, 'state' => 'open'],
                    ],
                    'extra' => [],
                ],
                [
                    'public_id' => 'fx-ars-che',
                    'competition' => 'epl',
                    'home' => 'ars',
                    'away' => 'che',
                    'kickoff' => '2026-11-14T15:00:00+00:00',
                    'status' => EventStatus::Upcoming,
                    'main' => [
                        ['id' => 'ars-1', 'label' => '1', 'side' => 'home', 'odds' => 1.95, 'state' => 'open'],
                        ['id' => 'ars-x', 'label' => 'X', 'side' => 'draw', 'odds' => 3.55, 'state' => 'open'],
                        ['id' => 'ars-2', 'label' => '2', 'side' => 'away', 'odds' => 3.9, 'state' => 'closed'],
                    ],
                    'extra' => [],
                ],
            ];

            foreach ($fixtures as $fx) {
                $event = SportEvent::query()->updateOrCreate(
                    ['public_id' => $fx['public_id']],
                    [
                        'competition_id' => $competitionModels[$fx['competition']]->id,
                        'home_team_id' => $teamModels[$fx['home']]->id,
                        'away_team_id' => $teamModels[$fx['away']]->id,
                        'kickoff_at' => $fx['kickoff'],
                        'timezone' => 'UTC',
                        'status' => $fx['status'],
                        'minute' => $fx['minute'] ?? null,
                        'score_home' => $fx['score_home'] ?? null,
                        'score_away' => $fx['score_away'] ?? null,
                        'publication_state' => PublicationState::Published,
                        'provider_event_id' => 'mock:'.$fx['public_id'],
                        'provider_source' => 'mock',
                        'provider_ingested_at' => now(),
                        'published_at' => now(),
                        'suspended_at' => null,
                    ]
                );

                $main = Market::query()->updateOrCreate(
                    ['public_id' => 'm-'.$fx['public_id'].'-1x2'],
                    [
                        'event_id' => $event->id,
                        'name' => '1X2',
                        'type' => '1x2',
                        'status' => 'open',
                        'visible_to_customer' => true,
                        'is_main' => true,
                        'sort_order' => 0,
                    ]
                );

                foreach ($fx['main'] as $sel) {
                    Selection::query()->updateOrCreate(
                        ['public_id' => $sel['id']],
                        [
                            'market_id' => $main->id,
                            'label' => $sel['label'],
                            'side' => $sel['side'],
                            'outcome_key' => $sel['side'],
                            'decimal_odds' => $sel['odds'],
                            'state' => $sel['state'],
                            'movement' => $sel['movement'] ?? null,
                            'odds_version' => 1,
                        ]
                    );
                }

                $catalog = app(\App\Services\MarketCatalogService::class);
                $catalog->ensureDefaultExtras($event->fresh('markets'));
            }
        });
    }
}
