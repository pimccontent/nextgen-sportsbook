<?php

namespace Tests\Unit;

use App\Services\SportsData\EmbeddedWorldLeaguesProvider;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EmbeddedWorldLeaguesProviderTest extends TestCase
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

    public function test_generates_obscure_league_fixtures_offline(): void
    {
        $provider = new EmbeddedWorldLeaguesProvider;
        $fixtures = $provider->fetchFixtures(null, [
            'obscure_live_sync' => false,
        ]);

        $this->assertNotEmpty($fixtures);
        $codes = [];
        foreach ($fixtures as $dto) {
            $this->assertFalse($dto->isTopLeague);
            $this->assertSame('upcoming', $dto->status);
            $this->assertStringStartsWith('emb:', $dto->providerEventId);
            $codes[$dto->competitionCode] = true;
        }

        $this->assertArrayHasKey('gpl', $codes);
        $this->assertArrayHasKey('bot-pl', $codes);
        $this->assertArrayHasKey('mdv-dpl', $codes);
        $this->assertGreaterThanOrEqual(15, count($codes));
    }

    public function test_live_sync_falls_back_to_catalogue_when_empty(): void
    {
        Http::fake([
            'www.thesportsdb.com/*' => Http::response(['events' => null], 200),
        ]);

        $provider = new EmbeddedWorldLeaguesProvider;
        $fixtures = $provider->fetchFixtures('123', [
            'obscure_live_sync' => true,
        ]);

        $this->assertNotEmpty($fixtures);
        foreach ($fixtures as $dto) {
            $this->assertFalse($dto->isTopLeague);
            $this->assertStringStartsWith('emb:', $dto->providerEventId);
        }

        Http::assertSent(fn () => true);
    }

    public function test_live_sync_uses_thesportsdb_events_when_present(): void
    {
        Http::fake([
            'www.thesportsdb.com/*' => Http::response([
                'events' => [
                    [
                        'idEvent' => '999001',
                        'strHomeTeam' => 'Live Home FC',
                        'strAwayTeam' => 'Live Away FC',
                        'dateEvent' => '2026-12-01',
                        'strTime' => '16:00:00',
                    ],
                ],
            ], 200),
        ]);

        $provider = new EmbeddedWorldLeaguesProvider;
        $fixtures = $provider->fetchFixtures('123', [
            'obscure_live_sync' => true,
        ]);

        $this->assertNotEmpty($fixtures);
        $this->assertTrue(
            collect($fixtures)->contains(
                fn ($dto) => $dto->providerEventId === 'tsdb:999001'
                    && $dto->homeName === 'Live Home FC'
                    && $dto->isTopLeague === false
            )
        );
    }
}
