<?php

namespace App\Services;

use App\Models\Market;
use App\Models\Selection;
use App\Models\SportEvent;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class MarketCatalogService
{
    /**
     * @return array<string, array{name: string, is_main: bool, sort_order: int, params?: array<string, mixed>, selections: list<array{label: string, outcome_key: string, side?: string|null, odds: float}>}>
     */
    public function templates(): array
    {
        return [
            '1x2' => [
                'name' => '1X2',
                'is_main' => true,
                'sort_order' => 0,
                'selections' => [
                    ['label' => '1', 'outcome_key' => 'home', 'side' => 'home', 'odds' => 2.1],
                    ['label' => 'X', 'outcome_key' => 'draw', 'side' => 'draw', 'odds' => 3.2],
                    ['label' => '2', 'outcome_key' => 'away', 'side' => 'away', 'odds' => 3.4],
                ],
            ],
            'double_chance' => [
                'name' => 'Double Chance',
                'is_main' => false,
                'sort_order' => 10,
                'selections' => [
                    ['label' => '1X', 'outcome_key' => '1x', 'side' => null, 'odds' => 1.35],
                    ['label' => '12', 'outcome_key' => '12', 'side' => null, 'odds' => 1.28],
                    ['label' => 'X2', 'outcome_key' => 'x2', 'side' => null, 'odds' => 1.4],
                ],
            ],
            'btts' => [
                'name' => 'Both Teams To Score',
                'is_main' => false,
                'sort_order' => 20,
                'selections' => [
                    ['label' => 'Yes', 'outcome_key' => 'yes', 'side' => null, 'odds' => 1.8],
                    ['label' => 'No', 'outcome_key' => 'no', 'side' => null, 'odds' => 1.95],
                ],
            ],
            'over_under' => [
                'name' => 'Over/Under',
                'is_main' => false,
                'sort_order' => 30,
                'params' => ['line' => 2.5],
                'selections' => [
                    ['label' => 'Over', 'outcome_key' => 'over', 'side' => null, 'odds' => 1.9],
                    ['label' => 'Under', 'outcome_key' => 'under', 'side' => null, 'odds' => 1.9],
                ],
            ],
            'correct_score' => [
                'name' => 'Correct Score',
                'is_main' => false,
                'sort_order' => 40,
                'params' => ['max_goals' => 3],
                'selections' => $this->correctScoreSelections(3),
            ],
        ];
    }

    /**
     * @return list<array{label: string, outcome_key: string, side: null, odds: float}>
     */
    private function correctScoreSelections(int $maxGoals): array
    {
        $out = [];
        for ($h = 0; $h <= $maxGoals; $h++) {
            for ($a = 0; $a <= $maxGoals; $a++) {
                $key = "h{$h}_a{$a}";
                // Simple demo odds: favour lower totals / draws slightly.
                $spread = abs($h - $a);
                $total = $h + $a;
                $odds = round(6.5 + ($total * 1.8) + ($spread * 1.2), 2);
                $out[] = [
                    'label' => "{$h}-{$a}",
                    'outcome_key' => $key,
                    'side' => null,
                    'odds' => max(3.5, min($odds, 55.0)),
                ];
            }
        }
        // No catch-all "Other" — admins can add custom scores via addCorrectScoreSelection().

        return $out;
    }

    /**
     * Add a custom correct-score outcome (e.g. 4-2) to an existing correct_score market.
     */
    public function addCorrectScoreSelection(Market $market, int $homeGoals, int $awayGoals, float $odds): Selection
    {
        if ($market->type !== 'correct_score') {
            throw new InvalidArgumentException('Custom scores can only be added to Correct Score markets.');
        }
        if ($homeGoals < 0 || $awayGoals < 0 || $homeGoals > 20 || $awayGoals > 20) {
            throw new InvalidArgumentException('Goals must be between 0 and 20.');
        }
        if ($odds < 1.01) {
            throw new InvalidArgumentException('Odds must be at least 1.01.');
        }

        $key = "h{$homeGoals}_a{$awayGoals}";
        if ($market->selections()->where('outcome_key', $key)->exists()) {
            throw new InvalidArgumentException("Score {$homeGoals}-{$awayGoals} already exists on this market.");
        }

        $suffix = 'cs-'.$homeGoals.$awayGoals.'-'.Str::lower(Str::random(4));
        $eventPublic = $market->event?->public_id ?? 'evt';

        $selection = Selection::query()->create([
            'market_id' => $market->id,
            'public_id' => $eventPublic.'-'.$suffix.'-'.$key,
            'label' => "{$homeGoals}-{$awayGoals}",
            'side' => null,
            'outcome_key' => $key,
            'decimal_odds' => $odds,
            'state' => 'open',
            'odds_version' => 1,
        ]);

        $params = $market->params ?? [];
        $params['max_goals'] = max((int) ($params['max_goals'] ?? 3), $homeGoals, $awayGoals);
        $market->params = $params;
        $market->save();

        return $selection;
    }

    /**
     * @param  array{line?: float|int}|null  $params
     */
    public function addMarket(SportEvent $event, string $type, ?array $params = null, bool $visible = true): Market
    {
        $templates = $this->templates();
        if (! isset($templates[$type])) {
            throw new InvalidArgumentException('Unknown market type.');
        }

        if ($type === '1x2' && $event->markets()->where('type', '1x2')->exists()) {
            throw new InvalidArgumentException('1X2 market already exists on this fixture.');
        }

        if ($type !== '1x2' && $event->markets()->where('type', $type)->where('status', '!=', 'removed')->exists()) {
            // Allow multiple O/U lines; block duplicate non-line types.
            if ($type !== 'over_under') {
                throw new InvalidArgumentException('This market type already exists on the fixture.');
            }
        }

        $tpl = $templates[$type];
        $mergedParams = array_merge($tpl['params'] ?? [], $params ?? []);
        $line = isset($mergedParams['line']) ? (float) $mergedParams['line'] : null;
        $name = $tpl['name'];
        if ($type === 'over_under' && $line !== null) {
            $name = 'Over/Under '.$line;
            $mergedParams['line'] = $line;
        }

        $suffix = $type === 'over_under' && $line !== null
            ? 'ou-'.str_replace('.', '', (string) $line).'-'.Str::lower(Str::random(4))
            : $type.'-'.Str::lower(Str::random(4));

        $market = Market::query()->create([
            'event_id' => $event->id,
            'public_id' => 'm-'.$event->public_id.'-'.$suffix,
            'name' => $name,
            'type' => $type,
            'params' => $mergedParams ?: null,
            'status' => 'open',
            'visible_to_customer' => $visible,
            'is_main' => (bool) $tpl['is_main'],
            'sort_order' => (int) $tpl['sort_order'],
        ]);

        foreach ($tpl['selections'] as $sel) {
            $label = $sel['label'];
            if ($type === 'over_under' && $line !== null) {
                $label = $sel['outcome_key'] === 'over' ? 'Over '.$line : 'Under '.$line;
            }
            Selection::query()->create([
                'market_id' => $market->id,
                'public_id' => $event->public_id.'-'.$suffix.'-'.$sel['outcome_key'],
                'label' => $label,
                'side' => $sel['side'] ?? null,
                'outcome_key' => $sel['outcome_key'],
                'decimal_odds' => $sel['odds'],
                'state' => 'open',
                'odds_version' => 1,
            ]);
        }

        return $market->load('selections');
    }

    public function ensureDefaultExtras(SportEvent $event): void
    {
        if (! $event->markets()->where('type', '1x2')->exists()) {
            $this->addMarket($event, '1x2');
        }
        foreach (['double_chance', 'btts', 'over_under', 'correct_score'] as $type) {
            if (! $event->markets()->where('type', $type)->exists()) {
                $this->addMarket($event, $type, $type === 'over_under' ? ['line' => 2.5] : null);
            }
        }
    }

    /**
     * Build selection_public_id => won|lost|void from fixture score / 1X2 result.
     *
     * @return array<string, string>
     */
    public function resultsFromFixture(SportEvent $event, string $resultSide, ?int $scoreHome, ?int $scoreAway): array
    {
        $map = [];
        $home = $scoreHome;
        $away = $scoreAway;
        $total = ($home !== null && $away !== null) ? $home + $away : null;

        foreach ($event->markets as $market) {
            foreach ($market->selections as $sel) {
                $key = $sel->outcome_key ?: $sel->side;
                if ($resultSide === 'void') {
                    $map[$sel->public_id] = 'void';
                    continue;
                }

                $outcome = match ($market->type) {
                    '1x2' => $this->match1x2($key, $resultSide),
                    'double_chance' => $this->matchDoubleChance($key, $resultSide),
                    'btts' => ($home === null || $away === null)
                        ? null
                        : $this->matchBtts($key, $home, $away),
                    'over_under' => $total === null
                        ? null
                        : $this->matchOverUnder($key, $total, (float) (($market->params ?? [])['line'] ?? 2.5)),
                    'correct_score' => ($home === null || $away === null)
                        ? null
                        : $this->matchCorrectScore(
                            $key,
                            $home,
                            $away,
                            (int) (($market->params ?? [])['max_goals'] ?? 3)
                        ),
                    default => null,
                };

                if ($outcome !== null) {
                    $map[$sel->public_id] = $outcome;
                }
            }
        }

        return $map;
    }

    private function match1x2(?string $key, string $resultSide): string
    {
        return $key === $resultSide ? 'won' : 'lost';
    }

    private function matchDoubleChance(?string $key, string $resultSide): string
    {
        return match ($key) {
            '1x' => in_array($resultSide, ['home', 'draw'], true) ? 'won' : 'lost',
            '12' => in_array($resultSide, ['home', 'away'], true) ? 'won' : 'lost',
            'x2' => in_array($resultSide, ['draw', 'away'], true) ? 'won' : 'lost',
            default => 'lost',
        };
    }

    private function matchBtts(?string $key, int $home, int $away): string
    {
        $yes = $home > 0 && $away > 0;
        if ($key === 'yes') {
            return $yes ? 'won' : 'lost';
        }
        if ($key === 'no') {
            return $yes ? 'lost' : 'won';
        }

        return 'lost';
    }

    private function matchOverUnder(?string $key, int $total, float $line): string
    {
        if (abs($total - $line) < 0.0001) {
            return 'void';
        }
        $over = $total > $line;
        if ($key === 'over') {
            return $over ? 'won' : 'lost';
        }
        if ($key === 'under') {
            return $over ? 'lost' : 'won';
        }

        return 'lost';
    }

    /**
     * Settles against full-time (or final recorded) score.
     * Exact outcome_key match wins; custom high scores work the same as grid scores.
     * Legacy "other" still settles as catch-all for scores above max_goals.
     */
    private function matchCorrectScore(?string $key, int $home, int $away, int $maxGoals): string
    {
        $exact = "h{$home}_a{$away}";

        if ($key === 'other') {
            $isWithinDefaultGrid = $home <= $maxGoals && $away <= $maxGoals;

            return $isWithinDefaultGrid ? 'lost' : 'won';
        }

        return $key === $exact ? 'won' : 'lost';
    }
}
