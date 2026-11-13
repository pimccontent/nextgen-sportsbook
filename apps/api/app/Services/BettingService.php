<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use App\Models\Bet;
use App\Models\BetSelection;
use App\Models\Selection;
use App\Models\SportEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class BettingService
{
    public function __construct(
        private readonly TenantSettingsService $settings,
        private readonly WalletService $wallets,
        private readonly LedgerService $ledger,
        private readonly CommissionService $commissions,
    ) {
    }

    /**
     * @param  list<array{selection_public_id: string, quoted_odds: float}>  $legs
     */
    public function place(User $user, int $stakeMinor, array $legs, string $idempotencyKey): Bet
    {
        $tenant = Tenant::default();
        $rules = $this->settings->getGroup($tenant, 'betting')['payload'];

        $existing = Bet::query()
            ->where('tenant_id', $tenant->id)
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) {
            return $existing->load('selections');
        }

        if ($stakeMinor < (int) $rules['min_stake_minor'] || $stakeMinor > (int) $rules['max_stake_minor']) {
            throw new InvalidArgumentException('Stake outside configured limits.');
        }

        if (count($legs) < 1) {
            throw new InvalidArgumentException('At least one selection is required.');
        }

        $betTypes = (string) $rules['bet_types'];
        if (count($legs) > 1 && $betTypes === 'singles') {
            throw new InvalidArgumentException('Accumulators are disabled for this deployment.');
        }

        return DB::transaction(function () use ($user, $stakeMinor, $legs, $idempotencyKey, $tenant, $rules) {
            $wallet = $this->wallets->forUser($user);
            $resolved = [];
            $combined = 1.0;

            foreach ($legs as $leg) {
                $selection = Selection::query()
                    ->where('public_id', $leg['selection_public_id'])
                    ->with(['market.event.competition'])
                    ->first();
                if (! $selection || ! $selection->market || ! $selection->market->event) {
                    throw new InvalidArgumentException('Selection not found.');
                }

                $event = $selection->market->event;
                if ($event->publication_state !== PublicationState::Published) {
                    throw new InvalidArgumentException('Event is not available.');
                }
                if ($selection->state !== 'open' || $selection->market->status !== 'open') {
                    throw new InvalidArgumentException('Selection is not open.');
                }
                if ($rules['prematch_only'] && $event->status !== EventStatus::Upcoming) {
                    throw new InvalidArgumentException('Only pre-match betting is enabled.');
                }

                $quoted = (float) $leg['quoted_odds'];
                $current = (float) $selection->decimal_odds;
                $policy = (string) $rules['odds_change_policy'];
                if (abs($quoted - $current) > 0.0001) {
                    if ($policy === 'reject') {
                        throw new InvalidArgumentException('Odds changed; bet rejected.');
                    }
                    if ($policy === 'reconfirm') {
                        throw new InvalidArgumentException('Odds changed; re-confirm required.');
                    }
                    // offer_new: accept current odds
                }

                $accepted = $policy === 'offer_new' ? $current : $current;
                $combined *= $accepted;
                $resolved[] = compact('selection', 'event', 'accepted');
            }

            $potential = (int) round($stakeMinor * $combined);
            if ($potential > (int) $rules['max_payout_minor']) {
                throw new InvalidArgumentException('Potential payout exceeds configured max.');
            }

            $this->ledger->reserveStake($wallet, $stakeMinor);

            $bet = Bet::query()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'public_id' => 'bet_'.Str::lower(Str::random(12)),
                'type' => count($resolved) === 1 ? 'single' : 'accumulator',
                'status' => 'open',
                'stake_minor' => $stakeMinor,
                'potential_return_minor' => $potential,
                'combined_odds' => round($combined, 4),
                'idempotency_key' => $idempotencyKey,
                'placed_at' => now(),
            ]);

            foreach ($resolved as $row) {
                /** @var Selection $selection */
                $selection = $row['selection'];
                /** @var SportEvent $event */
                $event = $row['event'];
                BetSelection::query()->create([
                    'bet_id' => $bet->id,
                    'event_id' => $event->id,
                    'market_id' => $selection->market_id,
                    'selection_id' => $selection->id,
                    'event_public_id' => $event->public_id,
                    'selection_public_id' => $selection->public_id,
                    'label' => $selection->label,
                    'market_name' => $selection->market->name,
                    'accepted_odds' => $row['accepted'],
                    'odds_version' => $selection->odds_version,
                    'result' => 'pending',
                ]);
            }

            $this->ledger->post(
                $tenant,
                'bet-reserve:'.$bet->public_id,
                'bet_reserve',
                [
                    ['account' => 'customer_liability', 'debit' => $stakeMinor, 'wallet_id' => $wallet->id],
                    ['account' => 'betting_liability', 'credit' => $stakeMinor],
                ],
                'bet',
                $bet->id,
                'Stake reserved'
            );

            $this->commissions->accrueOnBet($tenant, $user, $bet);

            return $bet->load('selections');
        });
    }

    public function listForUser(User $user): array
    {
        return Bet::query()
            ->where('user_id', $user->id)
            ->with('selections')
            ->orderByDesc('placed_at')
            ->limit(50)
            ->get()
            ->map(fn (Bet $b) => $this->payload($b, true))
            ->all();
    }

    public function findForUser(User $user, string $publicId): ?Bet
    {
        return Bet::query()
            ->where('user_id', $user->id)
            ->where('public_id', $publicId)
            ->with('selections')
            ->first();
    }

    public function payload(Bet $bet, bool $enrichFixtures = true): array
    {
        $events = [];
        if ($enrichFixtures) {
            $ids = $bet->selections->pluck('event_public_id')->filter()->unique()->all();
            if ($ids !== []) {
                $events = SportEvent::query()
                    ->whereIn('public_id', $ids)
                    ->with(['homeTeam', 'awayTeam'])
                    ->get()
                    ->keyBy('public_id');
            }
        }

        return [
            'id' => $bet->public_id,
            'placedAtIso' => $bet->placed_at?->utc()->toIso8601String(),
            'settledAtIso' => $bet->settled_at?->utc()->toIso8601String(),
            'status' => $bet->status,
            'type' => $bet->type,
            'stakeMinor' => $bet->stake_minor,
            'potentialReturnMinor' => $bet->potential_return_minor,
            'combinedOdds' => (float) $bet->combined_odds,
            'selections' => $bet->selections->map(function (BetSelection $s) use ($events) {
                /** @var SportEvent|null $event */
                $event = $events[$s->event_public_id] ?? null;
                $clock = $event?->liveClock();

                return [
                    'fixtureId' => $s->event_public_id,
                    'selectionId' => $s->selection_public_id,
                    'marketName' => $s->market_name,
                    'label' => $s->label,
                    'decimalOdds' => (float) $s->accepted_odds,
                    'result' => $s->result,
                    'fixtureLabel' => $event
                        ? $event->displayHomeName().' vs '.$event->displayAwayName()
                        : null,
                    'fixtureStatus' => $event?->status->value,
                    'period' => $clock['period'] ?? null,
                    'minute' => $clock['minute'] ?? null,
                    'score' => $event && ($event->score_home !== null || $event->score_away !== null)
                        ? [
                            'home' => (int) $event->score_home,
                            'away' => (int) $event->score_away,
                        ]
                        : null,
                ];
            })->values()->all(),
        ];
    }
}
