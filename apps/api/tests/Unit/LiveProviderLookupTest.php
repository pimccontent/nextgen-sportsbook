<?php

namespace Tests\Unit;

use App\Services\SportsData\LiveProviderLookup;
use App\Services\SportsData\TheSportsDbClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LiveProviderLookupTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        TheSportsDbClient::$skipThrottle = true;
    }

    protected function tearDown(): void
    {
        TheSportsDbClient::$skipThrottle = false;
        parent::tearDown();
    }

    public function test_pollable_and_synthetic_helpers(): void
    {
        $this->assertTrue(LiveProviderLookup::isPollable('tsdb:123'));
        $this->assertTrue(LiveProviderLookup::isPollable('oldb:99'));
        $this->assertTrue(LiveProviderLookup::isPollable('fd:55'));
        $this->assertFalse(LiveProviderLookup::isPollable('emb:gpl:1'));
        $this->assertTrue(LiveProviderLookup::isSynthetic('emb:gpl:1'));
        $this->assertTrue(LiveProviderLookup::isSynthetic('custom:x'));
        $this->assertTrue(LiveProviderLookup::isSynthetic('mock:epl-1'));
    }

    public function test_thesportsdb_lookup_maps_finished_scores(): void
    {
        Http::fake([
            'www.thesportsdb.com/api/v1/json/*/lookupevent.php*' => Http::response([
                'events' => [[
                    'idEvent' => '441613',
                    'strHomeTeam' => 'Arsenal',
                    'strAwayTeam' => 'Chelsea',
                    'dateEvent' => '2026-11-26',
                    'strTime' => '15:00:00',
                    'strStatus' => 'FT',
                    'intHomeScore' => '2',
                    'intAwayScore' => '1',
                    'strLeague' => 'Premier League',
                    'idLeague' => '4328',
                ]],
            ], 200),
        ]);

        $dto = (new LiveProviderLookup)->lookup('tsdb:441613', '123', [
            'competitionCode' => 'epl',
            'competitionName' => 'English Premier League',
            'country' => 'England',
        ]);

        $this->assertNotNull($dto);
        $this->assertSame('tsdb:441613', $dto->providerEventId);
        $this->assertSame('finished', $dto->status);
        $this->assertSame(2, $dto->scoreHome);
        $this->assertSame(1, $dto->scoreAway);
        $this->assertSame('FT', $dto->period);
    }

    public function test_football_data_lookup_maps_live_minute(): void
    {
        Http::fake([
            'api.football-data.org/v4/matches/42' => Http::response([
                'id' => 42,
                'utcDate' => '2026-11-26T15:00:00Z',
                'status' => 'IN_PLAY',
                'minute' => 67,
                'homeTeam' => ['name' => 'Home FC'],
                'awayTeam' => ['name' => 'Away United'],
                'competition' => ['code' => 'PL', 'name' => 'Premier League'],
                'area' => ['name' => 'England'],
                'score' => [
                    'fullTime' => ['home' => null, 'away' => null],
                    'regularTime' => ['home' => 1, 'away' => 0],
                ],
            ], 200),
        ]);

        $dto = (new LiveProviderLookup)->lookup('fd:42', 'token', []);

        $this->assertNotNull($dto);
        $this->assertSame('live', $dto->status);
        $this->assertSame(67, $dto->minute);
        $this->assertSame(1, $dto->scoreHome);
        $this->assertSame(0, $dto->scoreAway);
    }

    public function test_openligadb_lookup_maps_in_progress_as_live(): void
    {
        Http::fake([
            'api.openligadb.de/getmatchdata/bl1' => Http::response([
                [
                    'matchID' => 1001,
                    'team1' => ['teamName' => 'Bayern'],
                    'team2' => ['teamName' => 'Dortmund'],
                    'matchDateTimeUTC' => now()->subHour()->utc()->toIso8601String(),
                    'matchIsFinished' => false,
                    'leagueName' => 'Bundesliga',
                    'matchResults' => [
                        ['pointsTeam1' => 2, 'pointsTeam2' => 1],
                    ],
                ],
            ], 200),
        ]);

        $dto = (new LiveProviderLookup)->lookup('oldb:1001', null, [
            'competitionCode' => 'bl1',
        ]);

        $this->assertNotNull($dto);
        $this->assertSame('live', $dto->status);
        $this->assertSame(2, $dto->scoreHome);
        $this->assertSame(1, $dto->scoreAway);
        $this->assertSame('1H', $dto->period);
    }
}
