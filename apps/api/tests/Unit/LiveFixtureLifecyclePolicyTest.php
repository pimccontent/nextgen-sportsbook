<?php

namespace Tests\Unit;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use App\Models\Competition;
use App\Models\Sport;
use App\Models\SportEvent;
use App\Models\Team;
use App\Services\LiveFixtureLifecycle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveFixtureLifecyclePolicyTest extends TestCase
{
    use RefreshDatabase;

    private function seedEvent(string $providerEventId, EventStatus $status, bool $adminLocked): SportEvent
    {
        $sport = Sport::query()->firstOrCreate(
            ['slug' => 'football'],
            ['name' => 'Football', 'status' => 'active']
        );
        $comp = Competition::query()->firstOrCreate(
            ['slug' => 'test-league'],
            [
                'sport_id' => $sport->id,
                'name' => 'Test League',
                'country' => 'Test',
                'status' => 'active',
            ]
        );
        $home = Team::query()->firstOrCreate(
            ['slug' => 'home-fc'],
            ['sport_id' => $sport->id, 'name' => 'Home FC', 'short_name' => 'HOM']
        );
        $away = Team::query()->firstOrCreate(
            ['slug' => 'away-fc-'.md5($providerEventId)],
            ['sport_id' => $sport->id, 'name' => 'Away FC', 'short_name' => 'AWY']
        );

        return SportEvent::query()->create([
            'public_id' => 'fx-'.substr(md5($providerEventId), 0, 12),
            'competition_id' => $comp->id,
            'home_team_id' => $home->id,
            'away_team_id' => $away->id,
            'kickoff_at' => now()->subMinutes(30),
            'timezone' => 'UTC',
            'status' => $status,
            'minute' => $status === EventStatus::Live ? 20 : null,
            'period' => $status === EventStatus::Live ? '1H' : null,
            'score_home' => 0,
            'score_away' => 0,
            'admin_locked' => $adminLocked,
            'publication_state' => PublicationState::Published,
            'provider_event_id' => $providerEventId,
            'provider_source' => 'test',
            'published_at' => now(),
        ]);
    }

    public function test_unlocked_emb_live_is_demoted_to_upcoming(): void
    {
        $lifecycle = app(LiveFixtureLifecycle::class);

        $event = $this->seedEvent('emb:gpl:20261126:a-b', EventStatus::Live, false);
        $lifecycle->syncDueEvents(80);
        $event->refresh();

        $this->assertSame(EventStatus::Upcoming, $event->status);
        $this->assertNull($event->minute);
        $this->assertNull($event->period);
        $this->assertNull($event->clock_started_at);
    }

    public function test_unlocked_emb_upcoming_is_not_auto_promoted_to_live(): void
    {
        $lifecycle = app(LiveFixtureLifecycle::class);

        $event = $this->seedEvent('emb:bot-pl:20261126:a-b', EventStatus::Upcoming, false);
        $lifecycle->syncDueEvents(80);
        $event->refresh();

        $this->assertSame(EventStatus::Upcoming, $event->status);
    }

    public function test_unlocked_tsdb_upcoming_is_not_auto_promoted_to_live(): void
    {
        $lifecycle = app(LiveFixtureLifecycle::class);

        $event = $this->seedEvent('tsdb:441613', EventStatus::Upcoming, false);
        $lifecycle->syncDueEvents(80);
        $event->refresh();

        $this->assertSame(EventStatus::Upcoming, $event->status);
    }

    public function test_admin_locked_upcoming_is_promoted_to_live_at_kickoff(): void
    {
        $lifecycle = app(LiveFixtureLifecycle::class);

        $event = $this->seedEvent('tsdb:999001', EventStatus::Upcoming, true);
        $lifecycle->syncDueEvents(80);
        $event->refresh();

        $this->assertSame(EventStatus::Live, $event->status);
        $this->assertNotNull($event->clock_started_at);
    }
}
