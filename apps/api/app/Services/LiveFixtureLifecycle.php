<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Models\EventScript;
use App\Models\SportEvent;

/**
 * Promotes due kickoffs and runs armed match scripts.
 * Invoked on fixture reads + fixtures:tick.
 */
final class LiveFixtureLifecycle
{
    /** Wall-clock safety net when no ends_at / script (90' + HT + buffer). */
    private const DEFAULT_MATCH_SECONDS = 2 * 60 * 60;

    public function __construct(
        private readonly ScriptedMatchRunner $runner,
    ) {
    }

    public function syncDueEvents(int $limit = 80): void
    {
        // Scripted fixtures: runner handles promote + periods + goals + settle.
        $this->runner->tick($limit);

        $activeScriptIds = EventScript::query()
            ->whereIn('status', ['armed', 'running'])
            ->pluck('event_id')
            ->all();

        // Upcoming whose schedule already ended → played (skip live).
        SportEvent::query()
            ->where('status', EventStatus::Upcoming)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->when($activeScriptIds !== [], fn ($q) => $q->whereNotIn('id', $activeScriptIds))
            ->limit($limit)
            ->update([
                'status' => EventStatus::Finished,
                'period' => 'FT',
                'clock_started_at' => null,
            ]);

        // Kickoff reached → Live.
        $due = SportEvent::query()
            ->where('status', EventStatus::Upcoming)
            ->where('kickoff_at', '<=', now())
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->when($activeScriptIds !== [], fn ($q) => $q->whereNotIn('id', $activeScriptIds))
            ->orderBy('kickoff_at')
            ->limit($limit)
            ->get();

        foreach ($due as $event) {
            $event->status = EventStatus::Live;
            $event->period = $event->period ?: '1H';
            if ($event->minute === null) {
                $event->minute = 0;
            }
            if ($event->score_home === null) {
                $event->score_home = 0;
            }
            if ($event->score_away === null) {
                $event->score_away = 0;
            }
            if (! $event->clock_started_at) {
                $event->clock_started_at = $event->kickoff_at ?? now();
            }
            $event->save();
        }

        // Live → Finished: explicit FT period (incl. stuck rows).
        SportEvent::query()
            ->where('status', EventStatus::Live)
            ->where('period', 'FT')
            ->limit($limit)
            ->update([
                'status' => EventStatus::Finished,
                'clock_started_at' => null,
            ]);

        // Live → Finished: ends_at reached (non-active-script).
        SportEvent::query()
            ->where('status', EventStatus::Live)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->when($activeScriptIds !== [], fn ($q) => $q->whereNotIn('id', $activeScriptIds))
            ->limit($limit)
            ->update([
                'status' => EventStatus::Finished,
                'period' => 'FT',
                'clock_started_at' => null,
            ]);

        // Live → Finished: completed scripts that somehow stayed live.
        $completedScriptIds = EventScript::query()
            ->where('status', 'completed')
            ->pluck('event_id')
            ->all();
        if ($completedScriptIds !== []) {
            SportEvent::query()
                ->where('status', EventStatus::Live)
                ->whereIn('id', $completedScriptIds)
                ->limit($limit)
                ->update([
                    'status' => EventStatus::Finished,
                    'period' => 'FT',
                    'clock_started_at' => null,
                ]);
        }

        // Live → Finished: non-scripted safety net when ends_at missing.
        $stale = SportEvent::query()
            ->where('status', EventStatus::Live)
            ->whereNull('ends_at')
            ->whereNotNull('kickoff_at')
            ->where('kickoff_at', '<=', now()->subSeconds(self::DEFAULT_MATCH_SECONDS))
            ->when($activeScriptIds !== [], fn ($q) => $q->whereNotIn('id', $activeScriptIds))
            ->when($completedScriptIds !== [], fn ($q) => $q->whereNotIn('id', $completedScriptIds))
            ->orderBy('kickoff_at')
            ->limit($limit)
            ->get();

        foreach ($stale as $event) {
            $event->status = EventStatus::Finished;
            $event->period = 'FT';
            $event->clock_started_at = null;
            $event->save();
        }
    }
}
