<?php

namespace App\Http\Resources;

use App\Models\Market;
use App\Models\Selection;
use App\Models\SportEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SportEvent */
class FixtureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var SportEvent $event */
        $event = $this->resource;
        $clock = $event->liveClock();

        $mainMarket = $event->markets
            ->firstWhere('is_main', true)
            ?? $event->markets->first();

        return [
            'id' => $event->public_id,
            'competitionId' => $event->competition?->slug,
            'competitionName' => $event->competition?->name,
            'kickoffIso' => $event->kickoff_at?->utc()->toIso8601String(),
            'endsAtIso' => $event->ends_at?->utc()->toIso8601String(),
            'status' => $event->status->value,
            'minute' => $clock['minute'],
            'period' => $clock['period'],
            'extraTime' => $clock['extraTime'],
            'home' => [
                'id' => $event->homeTeam?->slug,
                'name' => $event->displayHomeName(),
                'shortName' => $event->displayHomeShort(),
            ],
            'away' => [
                'id' => $event->awayTeam?->slug,
                'name' => $event->displayAwayName(),
                'shortName' => $event->displayAwayShort(),
            ],
            'score' => $event->score_home === null && $event->score_away === null
                ? null
                : [
                    'home' => (int) $event->score_home,
                    'away' => (int) $event->score_away,
                ],
            'resultSide' => $event->result_side,
            'marketsCount' => $event->markets
                ->filter(fn (Market $m) => $m->visible_to_customer && $m->status === 'open')
                ->count(),
            'mainMarket' => $mainMarket
                ? $mainMarket->selections->map(fn (Selection $s) => $this->quote($s))->values()->all()
                : [],
            'publicationState' => $event->publication_state->value,
        ];
    }

    public static function marketPayload(Market $market): array
    {
        return [
            'id' => $market->public_id,
            'fixtureId' => $market->event?->public_id ?? null,
            'name' => $market->name,
            'type' => $market->type ?? '1x2',
            'params' => $market->params,
            'status' => $market->status,
            'visibleToCustomer' => (bool) $market->visible_to_customer,
            'isMain' => (bool) $market->is_main,
            'selections' => $market->selections->map(function (Selection $s) {
                return [
                    'selectionId' => $s->public_id,
                    'label' => $s->label,
                    'side' => $s->side,
                    'outcomeKey' => $s->outcome_key,
                    'decimalOdds' => (float) $s->decimal_odds,
                    'state' => $s->state,
                    'movement' => $s->movement,
                ];
            })->values()->all(),
        ];
    }

    private function quote(Selection $s): array
    {
        return [
            'selectionId' => $s->public_id,
            'label' => $s->label,
            'side' => $s->side,
            'decimalOdds' => (float) $s->decimal_odds,
            'state' => $s->state,
            'movement' => $s->movement,
        ];
    }
}
