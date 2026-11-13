<?php

namespace App\Services;

use App\Models\EventScript;
use App\Models\EventScriptEvent;
use App\Models\Player;
use App\Models\SportEvent;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class MatchScriptService
{
    /**
     * @param  array{
     *   clock_mode?: string,
     *   half_length_seconds?: int,
     *   ht_break_seconds?: int,
     *   planned_result_side: string,
     *   planned_score_home: int,
     *   planned_score_away: int,
     *   auto_settle?: bool,
     *   goals?: list<array{period: string, minute: int, side: string, player_id?: int|null}>
     * }  $data
     */
    public function upsertDraft(SportEvent $event, array $data): EventScript
    {
        $result = $data['planned_result_side'];
        if (! in_array($result, ['home', 'draw', 'away'], true)) {
            throw new InvalidArgumentException('Invalid planned result.');
        }

        $home = (int) $data['planned_score_home'];
        $away = (int) $data['planned_score_away'];
        $goals = $data['goals'] ?? [];
        $goalHome = count(array_filter($goals, fn ($g) => ($g['side'] ?? '') === 'home'));
        $goalAway = count(array_filter($goals, fn ($g) => ($g['side'] ?? '') === 'away'));
        if ($goalHome !== $home || $goalAway !== $away) {
            throw new InvalidArgumentException('Goal list must match planned score.');
        }
        if ($result === 'draw' && $home !== $away) {
            throw new InvalidArgumentException('Draw requires equal scores.');
        }
        if ($result === 'home' && $home <= $away) {
            throw new InvalidArgumentException('Home win requires higher home score.');
        }
        if ($result === 'away' && $away <= $home) {
            throw new InvalidArgumentException('Away win requires higher away score.');
        }

        $mode = ($data['clock_mode'] ?? 'sandbox') === 'live' ? 'live' : 'sandbox';
        $half = (int) ($data['half_length_seconds'] ?? ($mode === 'live' ? 45 * 60 : 60));
        $break = (int) ($data['ht_break_seconds'] ?? ($mode === 'live' ? 15 * 60 : 15));
        $half = max(10, $half);
        $break = max(5, $break);

        return DB::transaction(function () use ($event, $mode, $half, $break, $result, $home, $away, $goals, $data) {
            $script = EventScript::query()->updateOrCreate(
                ['event_id' => $event->id],
                [
                    'status' => 'draft',
                    'clock_mode' => $mode,
                    'half_length_seconds' => $half,
                    'ht_break_seconds' => $break,
                    'planned_result_side' => $result,
                    'planned_score_home' => $home,
                    'planned_score_away' => $away,
                    'auto_settle' => (bool) ($data['auto_settle'] ?? true),
                    'armed_at' => null,
                    'started_at' => null,
                    'completed_at' => null,
                ]
            );

            EventScriptEvent::query()->where('script_id', $script->id)->delete();

            $seq = 1;
            $rows = [];
            $rows[] = [
                'script_id' => $script->id,
                'seq' => $seq++,
                'type' => 'period_change',
                'at_period' => '1H',
                'at_elapsed_seconds' => 0,
                'to_period' => '1H',
                'side' => null,
                'player_id' => null,
                'player_name_snapshot' => null,
            ];

            foreach ($goals as $g) {
                $period = $g['period'] === '2H' ? '2H' : '1H';
                $minute = max(0, (int) $g['minute']);
                $elapsed = $period === '1H'
                    ? (int) round(($minute / 45) * $half)
                    : $half + $break + (int) round(($minute / 45) * $half);
                $playerId = $g['player_id'] ?? null;
                $playerName = null;
                if ($playerId) {
                    $player = Player::query()->find($playerId);
                    $playerName = $player?->name;
                }
                $rows[] = [
                    'script_id' => $script->id,
                    'seq' => $seq++,
                    'type' => 'goal',
                    'at_period' => $period,
                    'at_elapsed_seconds' => $elapsed,
                    'to_period' => null,
                    'side' => $g['side'],
                    'player_id' => $playerName ? $playerId : null,
                    'player_name_snapshot' => $playerName,
                ];
            }

            $rows[] = [
                'script_id' => $script->id,
                'seq' => $seq++,
                'type' => 'period_change',
                'at_period' => '1H',
                'at_elapsed_seconds' => $half,
                'to_period' => 'HT',
                'side' => null,
                'player_id' => null,
                'player_name_snapshot' => null,
            ];
            $rows[] = [
                'script_id' => $script->id,
                'seq' => $seq++,
                'type' => 'period_change',
                'at_period' => 'HT',
                'at_elapsed_seconds' => $half + $break,
                'to_period' => '2H',
                'side' => null,
                'player_id' => null,
                'player_name_snapshot' => null,
            ];
            $rows[] = [
                'script_id' => $script->id,
                'seq' => $seq++,
                'type' => 'match_end',
                'at_period' => '2H',
                'at_elapsed_seconds' => $half + $break + $half,
                'to_period' => 'FT',
                'side' => null,
                'player_id' => null,
                'player_name_snapshot' => null,
            ];

            usort($rows, fn ($a, $b) => $a['at_elapsed_seconds'] <=> $b['at_elapsed_seconds'] ?: $a['seq'] <=> $b['seq']);
            $i = 1;
            foreach ($rows as $row) {
                $row['seq'] = $i++;
                $row['created_at'] = now();
                $row['updated_at'] = now();
                EventScriptEvent::query()->insert($row);
            }

            return $script->fresh('timeline');
        });
    }

    public function arm(SportEvent $event): EventScript
    {
        $script = EventScript::query()->where('event_id', $event->id)->with('timeline')->first();
        if (! $script || $script->timeline->isEmpty()) {
            throw new InvalidArgumentException('Save a match script before arming.');
        }
        if (! in_array($script->status, ['draft', 'paused', 'cancelled'], true)) {
            throw new InvalidArgumentException('Script cannot be armed in status '.$script->status);
        }

        $script->status = 'armed';
        $script->armed_at = now();
        $script->save();

        $event->admin_locked = true;
        $event->save();

        return $script->fresh('timeline');
    }

    public function pause(SportEvent $event): ?EventScript
    {
        $script = EventScript::query()->where('event_id', $event->id)->first();
        if (! $script || ! in_array($script->status, ['armed', 'running'], true)) {
            return $script;
        }
        $script->status = 'paused';
        $script->save();

        return $script;
    }
}
