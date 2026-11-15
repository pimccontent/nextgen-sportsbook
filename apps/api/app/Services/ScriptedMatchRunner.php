<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Models\EventScript;
use App\Models\EventScriptEvent;
use App\Models\SportEvent;
use Illuminate\Support\Facades\DB;

final class ScriptedMatchRunner
{
    public function __construct(
        private readonly FixtureSettlementService $settlement,
    ) {
    }

    public function tick(int $limit = 80): void
    {
        $scripts = EventScript::query()
            ->whereIn('status', ['armed', 'running'])
            ->with(['event', 'timeline'])
            ->orderBy('id')
            ->limit($limit)
            ->get();

        foreach ($scripts as $script) {
            if ($script->event) {
                $this->apply($script->event, $script);
            }
        }
    }

    public function applyForEvent(SportEvent $event): void
    {
        $script = EventScript::query()
            ->where('event_id', $event->id)
            ->whereIn('status', ['armed', 'running'])
            ->with('timeline')
            ->first();
        if ($script) {
            $this->apply($event, $script);
        }
    }

    private function apply(SportEvent $event, EventScript $script): void
    {
        if (! $event->kickoff_at || $event->kickoff_at->isFuture()) {
            return;
        }

        DB::transaction(function () use ($event, $script) {
            $event = SportEvent::query()->where('id', $event->id)->lockForUpdate()->firstOrFail();
            $script = EventScript::query()->where('id', $script->id)->lockForUpdate()->with('timeline')->firstOrFail();
            if (! in_array($script->status, ['armed', 'running'], true)) {
                return;
            }

            if ($event->status === EventStatus::Upcoming) {
                $event->status = EventStatus::Live;
                $event->period = '1H';
                $event->minute = 0;
                $event->score_home = $event->score_home ?? 0;
                $event->score_away = $event->score_away ?? 0;
                $event->clock_started_at = $event->kickoff_at;
                $event->admin_locked = true;
                $event->save();
                $script->status = 'running';
                $script->started_at = $script->started_at ?? now();
                $script->save();
            }

            if ($script->status === 'armed' && $event->status === EventStatus::Live) {
                $script->status = 'running';
                $script->started_at = $script->started_at ?? now();
                $script->save();
            }

            $elapsed = max(0, (int) $event->kickoff_at->diffInSeconds(now()));

            foreach ($script->timeline as $row) {
                if ($row->applied_at) {
                    continue;
                }
                if ($row->at_elapsed_seconds > $elapsed) {
                    break;
                }
                $this->applyRow($event, $script, $row);
                $event->refresh();
            }

            $this->updateDisplayClock($event, $script, $elapsed);
        });
    }

    private function applyRow(SportEvent $event, EventScript $script, EventScriptEvent $row): void
    {
        if ($row->type === 'goal') {
            if ($row->side === 'home') {
                $event->score_home = (int) $event->score_home + 1;
            } elseif ($row->side === 'away') {
                $event->score_away = (int) $event->score_away + 1;
            }
            $event->save();
        }

        if ($row->type === 'period_change' && $row->to_period) {
            $event->period = $row->to_period;
            if ($row->to_period === 'HT') {
                $event->clock_started_at = null;
                $event->minute = 45;
                $event->extra_time_minute = null;
            } elseif ($row->to_period === '2H') {
                $event->clock_started_at = now();
                $event->minute = 45;
                $event->extra_time_minute = null;
            } elseif ($row->to_period === '1H') {
                $event->clock_started_at = $event->kickoff_at;
                $event->minute = 0;
                $event->extra_time_minute = null;
            } elseif ($row->to_period === 'FT') {
                $event->clock_started_at = null;
                $event->minute = 90;
                $event->extra_time_minute = null;
            } elseif ($row->to_period === 'ET1') {
                $event->clock_started_at = now();
                $event->minute = 90;
                $event->extra_time_minute = 0;
            } elseif ($row->to_period === 'ET2') {
                $event->clock_started_at = now();
                $event->minute = 105;
                $event->extra_time_minute = 0;
            } elseif ($row->to_period === 'PEN') {
                $event->clock_started_at = null;
                $event->minute = 120;
                $event->extra_time_minute = null;
            }
            $event->save();
        }

        if ($row->type === 'match_end') {
            $row->applied_at = now();
            $row->save();
            $script->status = 'completed';
            $script->completed_at = now();
            $script->save();

            $settleHome = $script->planned_et_score_home ?? $script->planned_score_home;
            $settleAway = $script->planned_et_score_away ?? $script->planned_score_away;
            $result = (string) $script->planned_result_side;
            if ($script->planned_pen_outcome && in_array($script->planned_pen_outcome, ['home', 'away'], true)) {
                $result = $script->planned_pen_outcome;
            }

            if ($script->auto_settle) {
                $this->settlement->finishAndSettle(
                    $event,
                    $result,
                    (int) $settleHome,
                    (int) $settleAway,
                );
            } else {
                $event->status = EventStatus::Finished;
                $event->period = 'FT';
                $event->clock_started_at = null;
                $event->result_side = $result;
                $event->score_home = $settleHome;
                $event->score_away = $settleAway;
                $event->save();
            }

            return;
        }

        $row->applied_at = now();
        $row->save();
    }

    private function updateDisplayClock(SportEvent $event, EventScript $script, int $elapsed): void
    {
        if ($event->status !== EventStatus::Live) {
            return;
        }
        $first = max(1, (int) ($script->first_half_seconds ?: $script->half_length_seconds));
        $second = max(1, (int) ($script->second_half_seconds ?: $script->half_length_seconds));
        $break = max(1, (int) $script->ht_break_seconds);
        $etFirst = max(0, (int) $script->et_first_seconds);
        $etSecond = max(0, (int) $script->et_second_seconds);
        $etBreak = max(0, (int) $script->et_break_seconds);

        if ($event->period === '1H') {
            $event->minute = (int) min(45, floor(($elapsed / $first) * 45));
            $event->save();
        } elseif ($event->period === '2H') {
            $intoSecond = max(0, $elapsed - $first - $break);
            $event->minute = (int) min(90, 45 + floor(($intoSecond / $second) * 45));
            $event->save();
        } elseif ($event->period === 'ET1' && $etFirst > 0) {
            $tEt1 = $first + $break + $second + 1;
            $into = max(0, $elapsed - $tEt1);
            $event->minute = 90;
            $event->extra_time_minute = (int) min(15, floor(($into / $etFirst) * 15));
            $event->save();
        } elseif ($event->period === 'ET2' && $etSecond > 0) {
            $tEt2 = $first + $break + $second + 1 + $etFirst + $etBreak;
            $into = max(0, $elapsed - $tEt2);
            $event->minute = 105;
            $event->extra_time_minute = (int) min(15, floor(($into / $etSecond) * 15));
            $event->save();
        }
    }
}
