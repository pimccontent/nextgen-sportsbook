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
     * @param  array<string, mixed>  $data
     */
    public function upsertDraft(SportEvent $event, array $data): EventScript
    {
        $mode = ($data['clock_mode'] ?? 'sandbox') === 'live' ? 'live' : 'sandbox';
        $defaultsHalf = $mode === 'live' ? 45 * 60 : 60;
        $defaultsBreak = $mode === 'live' ? 15 * 60 : 15;

        $firstHalf = max(10, (int) ($data['first_half_seconds'] ?? $data['half_length_seconds'] ?? $defaultsHalf));
        $secondHalf = max(10, (int) ($data['second_half_seconds'] ?? $data['half_length_seconds'] ?? $firstHalf));
        $break = max(5, (int) ($data['ht_break_seconds'] ?? $defaultsBreak));
        $etFirst = max(0, (int) ($data['et_first_seconds'] ?? 0));
        $etSecond = max(0, (int) ($data['et_second_seconds'] ?? 0));
        $etBreak = max(0, (int) ($data['et_break_seconds'] ?? 0));
        $penalties = (bool) ($data['penalties_enabled'] ?? false);
        $etEnabled = $etFirst > 0;

        $htHome = (int) ($data['planned_ht_score_home'] ?? 0);
        $htAway = (int) ($data['planned_ht_score_away'] ?? 0);
        $ftHome = (int) $data['planned_score_home'];
        $ftAway = (int) $data['planned_score_away'];
        $etHome = array_key_exists('planned_et_score_home', $data) && $data['planned_et_score_home'] !== null
            ? (int) $data['planned_et_score_home']
            : $ftHome;
        $etAway = array_key_exists('planned_et_score_away', $data) && $data['planned_et_score_away'] !== null
            ? (int) $data['planned_et_score_away']
            : $ftAway;
        $penOutcome = $data['planned_pen_outcome'] ?? 'none';
        if (! in_array($penOutcome, ['home', 'away', 'none'], true)) {
            throw new InvalidArgumentException('Invalid penalty outcome.');
        }

        $goals = array_values(array_filter(
            is_array($data['goals'] ?? null) ? $data['goals'] : [],
            fn ($g) => is_array($g) && in_array(($g['side'] ?? ''), ['home', 'away'], true)
                && in_array(($g['period'] ?? ''), ['1H', '2H', 'ET1', 'ET2'], true)
        ));

        // Timed goals are the source of truth when provided; otherwise synthesize from scores.
        if ($goals === []) {
            $goals = $this->synthesizeGoalsFromScores(
                $htHome,
                $htAway,
                $ftHome,
                $ftAway,
                $etEnabled,
                $etHome,
                $etAway
            );
        } else {
            [$htHome, $htAway, $ftHome, $ftAway, $etHome, $etAway] = $this->scoresFromGoals(
                $goals,
                $etEnabled,
                $ftHome,
                $ftAway
            );
        }

        $goals1H = array_values(array_filter($goals, fn ($g) => ($g['period'] ?? '') === '1H'));
        $goals2H = array_values(array_filter($goals, fn ($g) => ($g['period'] ?? '') === '2H'));
        $goalsEt1 = array_values(array_filter($goals, fn ($g) => ($g['period'] ?? '') === 'ET1'));
        $goalsEt2 = array_values(array_filter($goals, fn ($g) => ($g['period'] ?? '') === 'ET2'));

        if ($etEnabled && ($etHome < $ftHome || $etAway < $ftAway)) {
            throw new InvalidArgumentException('Extra-time scores cannot be lower than full-time.');
        }

        $finalHome = $etEnabled ? $etHome : $ftHome;
        $finalAway = $etEnabled ? $etAway : $ftAway;
        $result = (string) ($data['planned_result_side'] ?? '');

        if ($penalties && $finalHome === $finalAway) {
            if (! in_array($penOutcome, ['home', 'away'], true)) {
                throw new InvalidArgumentException('Select a penalty shootout winner when scores are level.');
            }
            $result = $penOutcome;
        } else {
            $penOutcome = 'none';
            if ($result === '') {
                $result = $finalHome === $finalAway ? 'draw' : ($finalHome > $finalAway ? 'home' : 'away');
            }
            if (! in_array($result, ['home', 'draw', 'away'], true)) {
                throw new InvalidArgumentException('Invalid planned result.');
            }
            if ($result === 'draw' && $finalHome !== $finalAway) {
                throw new InvalidArgumentException('Draw requires equal final scores.');
            }
            if ($result === 'home' && $finalHome <= $finalAway) {
                throw new InvalidArgumentException('Home win requires higher final home score (or penalties).');
            }
            if ($result === 'away' && $finalAway <= $finalHome) {
                throw new InvalidArgumentException('Away win requires higher final away score (or penalties).');
            }
        }

        return DB::transaction(function () use (
            $event, $mode, $firstHalf, $secondHalf, $break, $etFirst, $etSecond, $etBreak,
            $penalties, $etEnabled, $result, $htHome, $htAway, $ftHome, $ftAway, $etHome, $etAway,
            $penOutcome, $goals1H, $goals2H, $goalsEt1, $goalsEt2, $data
        ) {
            $script = EventScript::query()->updateOrCreate(
                ['event_id' => $event->id],
                [
                    'status' => 'draft',
                    'clock_mode' => $mode,
                    'half_length_seconds' => $firstHalf,
                    'first_half_seconds' => $firstHalf,
                    'second_half_seconds' => $secondHalf,
                    'ht_break_seconds' => $break,
                    'et_first_seconds' => $etFirst,
                    'et_second_seconds' => $etSecond,
                    'et_break_seconds' => $etBreak,
                    'penalties_enabled' => $penalties,
                    'planned_result_side' => $result,
                    'planned_ht_score_home' => $htHome,
                    'planned_ht_score_away' => $htAway,
                    'planned_score_home' => $ftHome,
                    'planned_score_away' => $ftAway,
                    'planned_et_score_home' => $etEnabled ? $etHome : null,
                    'planned_et_score_away' => $etEnabled ? $etAway : null,
                    'planned_pen_outcome' => $penOutcome === 'none' ? null : $penOutcome,
                    'auto_settle' => (bool) ($data['auto_settle'] ?? true),
                    'armed_at' => null,
                    'started_at' => null,
                    'completed_at' => null,
                ]
            );

            EventScriptEvent::query()->where('script_id', $script->id)->delete();

            $rows = [];
            $seq = 1;
            $add = function (array $row) use (&$rows, &$seq, $script) {
                $row['script_id'] = $script->id;
                $row['seq'] = $seq++;
                $rows[] = $row;
            };

            $add([
                'type' => 'period_change',
                'at_period' => '1H',
                'at_elapsed_seconds' => 0,
                'to_period' => '1H',
                'side' => null,
                'player_id' => null,
                'player_name_snapshot' => null,
            ]);

            foreach ($goals1H as $g) {
                $add($this->goalRow($g, '1H', (int) round(((int) $g['minute'] / 45) * $firstHalf)));
            }

            $tHt = $firstHalf;
            $add([
                'type' => 'period_change',
                'at_period' => '1H',
                'at_elapsed_seconds' => $tHt,
                'to_period' => 'HT',
                'side' => null,
                'player_id' => null,
                'player_name_snapshot' => null,
            ]);

            $t2h = $firstHalf + $break;
            $add([
                'type' => 'period_change',
                'at_period' => 'HT',
                'at_elapsed_seconds' => $t2h,
                'to_period' => '2H',
                'side' => null,
                'player_id' => null,
                'player_name_snapshot' => null,
            ]);

            foreach ($goals2H as $g) {
                $add($this->goalRow(
                    $g,
                    '2H',
                    $t2h + (int) round(((int) $g['minute'] / 45) * $secondHalf)
                ));
            }

            $tFt = $firstHalf + $break + $secondHalf;
            $add([
                'type' => 'period_change',
                'at_period' => '2H',
                'at_elapsed_seconds' => $tFt,
                'to_period' => 'FT',
                'side' => null,
                'player_id' => null,
                'player_name_snapshot' => null,
            ]);

            $endAt = $tFt;
            if ($etEnabled) {
                $tEt1 = $tFt + 1;
                $add([
                    'type' => 'period_change',
                    'at_period' => 'FT',
                    'at_elapsed_seconds' => $tEt1,
                    'to_period' => 'ET1',
                    'side' => null,
                    'player_id' => null,
                    'player_name_snapshot' => null,
                ]);
                foreach ($goalsEt1 as $g) {
                    $add($this->goalRow(
                        $g,
                        'ET1',
                        $tEt1 + (int) round(((int) $g['minute'] / 15) * max(1, $etFirst))
                    ));
                }
                $tEtBreak = $tEt1 + $etFirst;
                if ($etSecond > 0) {
                    $add([
                        'type' => 'period_change',
                        'at_period' => 'ET1',
                        'at_elapsed_seconds' => $tEtBreak + $etBreak,
                        'to_period' => 'ET2',
                        'side' => null,
                        'player_id' => null,
                        'player_name_snapshot' => null,
                    ]);
                    $tEt2 = $tEtBreak + $etBreak;
                    foreach ($goalsEt2 as $g) {
                        $add($this->goalRow(
                            $g,
                            'ET2',
                            $tEt2 + (int) round(((int) $g['minute'] / 15) * max(1, $etSecond))
                        ));
                    }
                    $endAt = $tEt2 + $etSecond;
                } else {
                    $endAt = $tEtBreak;
                }
            }

            if ($penalties && (($etEnabled && $etHome === $etAway) || (! $etEnabled && $ftHome === $ftAway))) {
                $add([
                    'type' => 'period_change',
                    'at_period' => $etEnabled ? 'ET2' : 'FT',
                    'at_elapsed_seconds' => $endAt + 1,
                    'to_period' => 'PEN',
                    'side' => null,
                    'player_id' => null,
                    'player_name_snapshot' => null,
                ]);
                $endAt += 5;
            }

            $add([
                'type' => 'match_end',
                'at_period' => $penalties && (($etEnabled && $etHome === $etAway) || (! $etEnabled && $ftHome === $ftAway))
                    ? 'PEN'
                    : ($etEnabled ? 'ET2' : '2H'),
                'at_elapsed_seconds' => $endAt + 1,
                'to_period' => 'FT',
                'side' => null,
                'player_id' => null,
                'player_name_snapshot' => null,
            ]);

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

    /**
     * @param  list<array{period?: string, side?: string, minute?: int, player_id?: int|null}>  $goals
     * @return array{0:int,1:int,2:int,3:int,4:int,5:int}
     */
    private function scoresFromGoals(array $goals, bool $etEnabled, int $fallbackFtHome, int $fallbackFtAway): array
    {
        $count = function (array $periods, string $side) use ($goals): int {
            return count(array_filter(
                $goals,
                fn ($g) => ($g['side'] ?? '') === $side && in_array(($g['period'] ?? ''), $periods, true)
            ));
        };

        $htHome = $count(['1H'], 'home');
        $htAway = $count(['1H'], 'away');
        $ftHome = $count(['1H', '2H'], 'home');
        $ftAway = $count(['1H', '2H'], 'away');
        if ($ftHome === 0 && $ftAway === 0 && ($fallbackFtHome > 0 || $fallbackFtAway > 0)) {
            // Allow score-only drafts that still include stray empty goal rows filtered out earlier.
            $ftHome = $fallbackFtHome;
            $ftAway = $fallbackFtAway;
        }
        $etHome = $etEnabled ? $count(['1H', '2H', 'ET1', 'ET2'], 'home') : $ftHome;
        $etAway = $etEnabled ? $count(['1H', '2H', 'ET1', 'ET2'], 'away') : $ftAway;

        return [$htHome, $htAway, $ftHome, $ftAway, $etHome, $etAway];
    }

    /**
     * @return list<array{period: string, minute: int, side: string, player_id: null}>
     */
    private function synthesizeGoalsFromScores(
        int $htHome,
        int $htAway,
        int $ftHome,
        int $ftAway,
        bool $etEnabled,
        int $etHome,
        int $etAway
    ): array {
        $goals = [];
        $push = function (string $period, string $side, int $minute) use (&$goals): void {
            $goals[] = [
                'period' => $period,
                'minute' => max(1, min(45, $minute)),
                'side' => $side,
                'player_id' => null,
            ];
        };

        $place = function (string $period, string $side, int $count, int $startMin) use ($push): void {
            for ($i = 0; $i < $count; $i++) {
                $push($period, $side, $startMin + ($i * 8));
            }
        };

        $place('1H', 'home', $htHome, 12);
        $place('1H', 'away', $htAway, 18);

        $place('2H', 'home', max(0, $ftHome - $htHome), 10);
        $place('2H', 'away', max(0, $ftAway - $htAway), 16);

        if ($etEnabled) {
            $place('ET1', 'home', max(0, (int) ceil(($etHome - $ftHome) / 2)), 5);
            $place('ET1', 'away', max(0, (int) ceil(($etAway - $ftAway) / 2)), 8);
            $place('ET2', 'home', max(0, $etHome - $ftHome - (int) ceil(($etHome - $ftHome) / 2)), 4);
            $place('ET2', 'away', max(0, $etAway - $ftAway - (int) ceil(($etAway - $ftAway) / 2)), 7);
        }

        return $goals;
    }

    /**
     * @param  array{side: string, player_id?: int|null}  $g
     * @return array<string, mixed>
     */
    private function goalRow(array $g, string $period, int $elapsed): array
    {
        $playerId = $g['player_id'] ?? null;
        $playerName = null;
        if ($playerId) {
            $player = Player::query()->find($playerId);
            $playerName = $player?->name;
        }

        return [
            'type' => 'goal',
            'at_period' => $period,
            'at_elapsed_seconds' => max(0, $elapsed),
            'to_period' => null,
            'side' => $g['side'],
            'player_id' => $playerName ? $playerId : null,
            'player_name_snapshot' => $playerName,
        ];
    }
}
