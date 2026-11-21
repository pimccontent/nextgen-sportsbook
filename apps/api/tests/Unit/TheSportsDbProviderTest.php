<?php

namespace Tests\Unit;

use App\Services\SportsData\TheSportsDbProvider;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class TheSportsDbProviderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        \App\Services\SportsData\TheSportsDbClient::$skipThrottle = true;
    }

    protected function tearDown(): void
    {
        \App\Services\SportsData\TheSportsDbClient::$skipThrottle = false;
        parent::tearDown();
    }

    public function test_retries_429_then_imports_fixtures(): void
    {
        Http::fake([
            'www.thesportsdb.com/*' => Http::sequence()
                ->push(['error' => 'rate'], 429)
                ->push([
                    'events' => [
                        [
                            'idEvent' => '1001',
                            'strHomeTeam' => 'Arsenal',
                            'strAwayTeam' => 'Chelsea',
                            'dateEvent' => '2026-12-10',
                            'strTime' => '15:00:00',
                        ],
                    ],
                ], 200)
                ->whenEmpty(Http::response(['events' => []], 200)),
        ]);

        $provider = new TheSportsDbProvider;
        $fixtures = $provider->fetchFixtures('123', [
            'sync_top_leagues' => true,
            'sync_other_leagues' => false,
        ]);

        $this->assertNotEmpty($fixtures);
        $this->assertSame('tsdb:1001', $fixtures[0]->providerEventId);
        $this->assertSame('Arsenal', $fixtures[0]->homeName);
    }

    public function test_rate_limit_message_when_all_leagues_fail(): void
    {
        Http::fake([
            'www.thesportsdb.com/*' => Http::response(['error' => 'rate'], 429),
        ]);

        $provider = new TheSportsDbProvider;

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('rate-limited');

        $provider->fetchFixtures('123', [
            'sync_top_leagues' => true,
            'sync_other_leagues' => false,
        ]);
    }
}
