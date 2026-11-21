<?php

namespace Tests\Unit;

use App\Services\SportsData\EmbeddedWorldLeaguesProvider;
use App\Services\SportsData\TheSportsDbClient;
use App\Services\SportsData\TheSportsDbProvider;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

/**
 * Verifies TheSportsDB rate-limit + obscure catalogue still yields fixtures
 * without touching the shared database (no RefreshDatabase).
 */
class SportsIngestionObscureMergeTest extends TestCase
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

    public function test_obscure_catalogue_fills_when_thesportsdb_rate_limited(): void
    {
        Http::fake([
            'www.thesportsdb.com/*' => Http::response(['error' => 'rate'], 429),
        ]);

        $primary = new TheSportsDbProvider;
        $primaryError = null;
        $primaryFixtures = [];
        try {
            $primaryFixtures = $primary->fetchFixtures('123', [
                'sync_top_leagues' => true,
                'sync_other_leagues' => false,
            ]);
        } catch (RuntimeException $e) {
            $primaryError = $e->getMessage();
        }

        $obscure = (new EmbeddedWorldLeaguesProvider)->fetchFixtures('123', [
            'obscure_live_sync' => false,
        ]);

        $this->assertNotNull($primaryError);
        $this->assertSame([], $primaryFixtures);
        $this->assertNotEmpty($obscure);
        $this->assertTrue(collect($obscure)->every(fn ($dto) => $dto->isTopLeague === false));
    }
}
