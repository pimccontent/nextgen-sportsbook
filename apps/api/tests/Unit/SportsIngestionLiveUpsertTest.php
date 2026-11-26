<?php

namespace Tests\Unit;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use App\Models\Competition;
use App\Models\Sport;
use App\Models\SportEvent;
use App\Models\Team;
use App\Models\Tenant;
use App\Services\SportsData\SportsFixtureDto;
use App\Services\SportsIngestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SportsIngestionLiveUpsertTest extends TestCase
{
    use RefreshDatabase;

    private function seedLockedEvent(): SportEvent
    {
        Tenant::query()->create([
            'slug' => 'default',
            'name' => 'Default',
            'status' => 'active',
        ]);

        $sport = Sport::query()->create([
            'slug' => 'football',
            'name' => 'Football',
            'status' => 'active',
        ]);
        $comp = Competition::query()->create([
            'sport_id' => $sport->id,
            'slug' => 'epl',
            'name' => 'Premier League',
            'country' => 'England',
            'status' => 'active',
        ]);
        $home = Team::query()->create([
            'sport_id' => $sport->id,
            'slug' => 'arsenal',
            'name' => 'Arsenal',
            'short_name' => 'ARS',
        ]);
        $away = Team::query()->create([
            'sport_id' => $sport->id,
            'slug' => 'chelsea',
            'name' => 'Chelsea',
            'short_name' => 'CHE',
        ]);

        return SportEvent::query()->create([
            'public_id' => 'fx-locked-1',
            'competition_id' => $comp->id,
            'home_team_id' => $home->id,
            'away_team_id' => $away->id,
            'kickoff_at' => now()->subHour(),
            'timezone' => 'UTC',
            'status' => EventStatus::Live,
            'minute' => 10,
            'period' => '1H',
            'score_home' => 0,
            'score_away' => 0,
            'admin_locked' => true,
            'publication_state' => PublicationState::Published,
            'provider_event_id' => 'tsdb:441613',
            'provider_source' => 'thesportsdb',
            'published_at' => now(),
        ]);
    }

    public function test_admin_locked_fixture_skips_provider_live_upsert(): void
    {
        $event = $this->seedLockedEvent();
        $ingestion = app(SportsIngestionService::class);

        $result = $ingestion->applyUnlockedDto(
            new SportsFixtureDto(
                providerEventId: 'tsdb:441613',
                competitionCode: 'epl',
                competitionName: 'Premier League',
                country: 'England',
                homeName: 'Arsenal',
                homeShort: 'ARS',
                awayName: 'Chelsea',
                awayShort: 'CHE',
                kickoffIso: now()->subHour()->toIso8601String(),
                status: 'live',
                scoreHome: 3,
                scoreAway: 2,
                isTopLeague: true,
                minute: 88,
                period: '2H',
            ),
            'thesportsdb',
            [
                'auto_publish' => false,
                'default_home_odds' => 2.1,
                'default_draw_odds' => 3.2,
                'default_away_odds' => 3.4,
            ]
        );

        $this->assertTrue($result['skipped'] ?? false);
        $event->refresh();
        $this->assertSame(0, $event->score_home);
        $this->assertSame(10, $event->minute);
    }

    public function test_unlocked_fixture_applies_live_minute_and_score(): void
    {
        $event = $this->seedLockedEvent();
        $event->admin_locked = false;
        $event->save();

        $ingestion = app(SportsIngestionService::class);
        $result = $ingestion->applyUnlockedDto(
            new SportsFixtureDto(
                providerEventId: 'tsdb:441613',
                competitionCode: 'epl',
                competitionName: 'Premier League',
                country: 'England',
                homeName: 'Arsenal',
                homeShort: 'ARS',
                awayName: 'Chelsea',
                awayShort: 'CHE',
                kickoffIso: now()->subHour()->toIso8601String(),
                status: 'live',
                scoreHome: 2,
                scoreAway: 1,
                isTopLeague: true,
                minute: 55,
                period: '2H',
            ),
            'thesportsdb',
            [
                'auto_publish' => false,
                'default_home_odds' => 2.1,
                'default_draw_odds' => 3.2,
                'default_away_odds' => 3.4,
            ]
        );

        $this->assertFalse($result['created']);
        $this->assertArrayNotHasKey('skipped', $result);
        $event->refresh();
        $this->assertSame(EventStatus::Live, $event->status);
        $this->assertSame(2, $event->score_home);
        $this->assertSame(1, $event->score_away);
        $this->assertSame(55, $event->minute);
        $this->assertSame('2H', $event->period);
        $this->assertNotNull($event->clock_started_at);
    }
}
