<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Models\Bet;
use App\Models\SportEvent;
use Illuminate\Support\Facades\DB;

final class FixtureSettlementService
{
    public function __construct(
        private readonly MarketCatalogService $markets,
        private readonly SettlementService $settlement,
    ) {
    }

    /**
     * Finish fixture with scores/result and settle open bets that are fully covered.
     *
     * @return array{betsSettled: int}
     */
    public function finishAndSettle(
        SportEvent $event,
        string $resultSide,
        ?int $scoreHome,
        ?int $scoreAway,
        bool $closeMarkets = true,
    ): array {
        return DB::transaction(function () use ($event, $resultSide, $scoreHome, $scoreAway, $closeMarkets) {
            $event = SportEvent::query()->where('id', $event->id)->lockForUpdate()->with('markets.selections')->firstOrFail();

            if ($scoreHome !== null) {
                $event->score_home = $scoreHome;
            }
            if ($scoreAway !== null) {
                $event->score_away = $scoreAway;
            }

            $resultsMap = $this->markets->resultsFromFixture(
                $event,
                $resultSide,
                $event->score_home !== null ? (int) $event->score_home : null,
                $event->score_away !== null ? (int) $event->score_away : null,
            );

            if ($closeMarkets) {
                foreach ($event->markets as $market) {
                    foreach ($market->selections as $sel) {
                        if (isset($resultsMap[$sel->public_id])) {
                            $sel->state = 'closed';
                            $sel->save();
                        }
                    }
                    if ($market->selections->every(fn ($s) => $s->state === 'closed')) {
                        $market->status = 'closed';
                        $market->save();
                    }
                }
            }

            $event->status = EventStatus::Finished;
            $event->period = 'FT';
            $event->clock_started_at = null;
            $event->result_side = $resultSide;
            $event->admin_locked = true;
            $event->save();

            return ['betsSettled' => $this->settleOpenBets($resultsMap)];
        });
    }

    /** @param array<string, string> $resultsMap */
    public function settleOpenBets(array $resultsMap): int
    {
        if ($resultsMap === []) {
            return 0;
        }

        $settled = 0;
        $bets = Bet::query()
            ->where('status', 'open')
            ->whereHas('selections', fn ($q) => $q->whereIn('selection_public_id', array_keys($resultsMap)))
            ->with('selections')
            ->get();

        foreach ($bets as $bet) {
            $betResults = [];
            $complete = true;
            foreach ($bet->selections as $bs) {
                if (isset($resultsMap[$bs->selection_public_id])) {
                    $betResults[$bs->selection_public_id] = $resultsMap[$bs->selection_public_id];
                } else {
                    $complete = false;
                }
            }
            if ($complete && count($betResults) === $bet->selections->count()) {
                $this->settlement->settleBet($bet, $betResults);
                $settled++;
            }
        }

        return $settled;
    }
}
