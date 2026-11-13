<?php

namespace App\Services;

use App\Models\Bet;
use App\Models\Tenant;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class SettlementService
{
    public function __construct(
        private readonly LedgerService $ledger,
        private readonly BonusService $bonuses,
    ) {
    }

    /**
     * @param  array<string, string>  $results  selection_public_id => won|lost|void
     */
    public function settleBet(Bet $bet, array $results): Bet
    {
        if ($bet->status !== 'open') {
            return $bet->load('selections');
        }

        $tenant = Tenant::query()->findOrFail($bet->tenant_id);

        return DB::transaction(function () use ($bet, $results, $tenant) {
            $bet = Bet::query()->where('id', $bet->id)->lockForUpdate()->firstOrFail();
            if ($bet->status !== 'open') {
                return $bet->load('selections');
            }

            $won = true;
            $allVoid = true;
            foreach ($bet->selections as $selection) {
                $result = $results[$selection->selection_public_id] ?? null;
                if (! in_array($result, ['won', 'lost', 'void'], true)) {
                    throw new RuntimeException('Missing result for selection '.$selection->selection_public_id);
                }
                $selection->result = $result;
                $selection->save();
                if ($result !== 'void') {
                    $allVoid = false;
                }
                if ($result === 'lost') {
                    $won = false;
                }
            }

            $wallet = Wallet::query()->where('id', $bet->wallet_id)->lockForUpdate()->firstOrFail();
            $stake = $bet->stake_minor;

            if ($allVoid) {
                $this->ledger->releaseReservedToAvailable($wallet, $stake);
                $this->ledger->post(
                    $tenant,
                    'bet-void:'.$bet->public_id,
                    'bet_void',
                    [
                        ['account' => 'betting_liability', 'debit' => $stake],
                        ['account' => 'customer_liability', 'credit' => $stake, 'wallet_id' => $wallet->id],
                    ],
                    'bet',
                    $bet->id,
                    'Bet voided'
                );
                $bet->status = 'void';
            } elseif ($won) {
                $payout = $bet->potential_return_minor;
                $this->ledger->consumeReserved($wallet, $stake);
                $this->ledger->creditAvailable($wallet, $payout);
                // Stake leaves open-bet liability; payout increases customer liability;
                // house funds the difference from revenue (balanced).
                $this->ledger->post(
                    $tenant,
                    'bet-win:'.$bet->public_id,
                    'bet_win',
                    [
                        ['account' => 'betting_liability', 'debit' => $stake],
                        ['account' => 'betting_revenue', 'debit' => $payout],
                        ['account' => 'customer_liability', 'credit' => $payout, 'wallet_id' => $wallet->id],
                        ['account' => 'betting_revenue', 'credit' => $stake],
                    ],
                    'bet',
                    $bet->id,
                    'Bet won'
                );
                $bet->status = 'won';
            } else {
                $this->ledger->consumeReserved($wallet, $stake);
                $this->ledger->post(
                    $tenant,
                    'bet-lose:'.$bet->public_id,
                    'bet_lose',
                    [
                        ['account' => 'betting_liability', 'debit' => $stake],
                        ['account' => 'betting_revenue', 'credit' => $stake],
                    ],
                    'bet',
                    $bet->id,
                    'Bet lost'
                );
                $bet->status = 'lost';
            }

            $bet->settled_at = now();
            $bet->save();

            if ($bet->status === 'won') {
                $this->bonuses->awardWinBonus($bet);
            }

            return $bet->load('selections');
        });
    }
}
