<?php

namespace App\Services;

use App\Models\Bet;
use App\Models\PaymentIntent;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

final class BonusService
{
    public function __construct(
        private readonly TenantSettingsService $settings,
        private readonly LedgerService $ledger,
        private readonly WalletService $wallets,
    ) {
    }

    public function awardDepositBonus(PaymentIntent $intent): ?int
    {
        if ($intent->direction !== 'deposit' || $intent->status !== 'completed') {
            return null;
        }

        $tenant = Tenant::query()->findOrFail($intent->tenant_id);
        $promo = $this->settings->getGroup($tenant, 'promotions')['payload'];
        if (empty($promo['deposit_bonus_enabled'])) {
            return null;
        }

        $percentBps = (int) ($promo['deposit_bonus_percent_bps'] ?? 0);
        $maxMinor = (int) ($promo['deposit_bonus_max_minor'] ?? 0);
        if ($percentBps <= 0) {
            return null;
        }

        if (! empty($promo['deposit_bonus_first_only'])) {
            $prior = PaymentIntent::query()
                ->where('user_id', $intent->user_id)
                ->where('direction', 'deposit')
                ->where('status', 'completed')
                ->where('id', '!=', $intent->id)
                ->exists();
            if ($prior) {
                return null;
            }
        }

        $bonus = intdiv($intent->amount_minor * $percentBps, 10000);
        if ($maxMinor > 0) {
            $bonus = min($bonus, $maxMinor);
        }
        if ($bonus <= 0) {
            return null;
        }

        return DB::transaction(function () use ($tenant, $intent, $bonus) {
            $wallet = Wallet::query()->where('id', $intent->wallet_id)->lockForUpdate()->firstOrFail();
            $this->creditPromo(
                $tenant,
                $wallet,
                $bonus,
                'deposit-bonus:'.$intent->idempotency_key,
                'payment_intent',
                $intent->id,
                'Top-up bonus'
            );

            return $bonus;
        });
    }

    public function awardWinBonus(Bet $bet): ?int
    {
        if ($bet->status !== 'won') {
            return null;
        }

        $tenant = Tenant::query()->findOrFail($bet->tenant_id);
        $promo = $this->settings->getGroup($tenant, 'promotions')['payload'];
        if (empty($promo['win_bonus_enabled'])) {
            return null;
        }

        $percentBps = (int) ($promo['win_bonus_percent_bps'] ?? 0);
        $maxMinor = (int) ($promo['win_bonus_max_minor'] ?? 0);
        if ($percentBps <= 0) {
            return null;
        }

        $netWin = max(0, $bet->potential_return_minor - $bet->stake_minor);
        $bonus = intdiv($netWin * $percentBps, 10000);
        if ($maxMinor > 0) {
            $bonus = min($bonus, $maxMinor);
        }
        if ($bonus <= 0) {
            return null;
        }

        return DB::transaction(function () use ($tenant, $bet, $bonus) {
            $wallet = Wallet::query()->where('id', $bet->wallet_id)->lockForUpdate()->firstOrFail();
            $this->creditPromo(
                $tenant,
                $wallet,
                $bonus,
                'win-bonus:'.$bet->public_id,
                'bet',
                $bet->id,
                'Win bonus'
            );

            return $bonus;
        });
    }

    /** @return array<string, mixed> */
    public function publicPayload(Tenant $tenant): array
    {
        $promo = $this->settings->getGroup($tenant, 'promotions')['payload'];

        return [
            'deposit_bonus_enabled' => (bool) ($promo['deposit_bonus_enabled'] ?? false),
            'deposit_bonus_percent_bps' => (int) ($promo['deposit_bonus_percent_bps'] ?? 0),
            'deposit_bonus_max_minor' => (int) ($promo['deposit_bonus_max_minor'] ?? 0),
            'deposit_bonus_first_only' => (bool) ($promo['deposit_bonus_first_only'] ?? false),
            'deposit_bonus_title' => $promo['deposit_bonus_title'] ?? 'Top-up bonus',
            'deposit_bonus_blurb' => $promo['deposit_bonus_blurb'] ?? '',
            'win_bonus_enabled' => (bool) ($promo['win_bonus_enabled'] ?? false),
            'win_bonus_percent_bps' => (int) ($promo['win_bonus_percent_bps'] ?? 0),
            'win_bonus_max_minor' => (int) ($promo['win_bonus_max_minor'] ?? 0),
            'win_bonus_title' => $promo['win_bonus_title'] ?? 'Win bonus',
            'win_bonus_blurb' => $promo['win_bonus_blurb'] ?? '',
        ];
    }

    private function creditPromo(
        Tenant $tenant,
        Wallet $wallet,
        int $bonusMinor,
        string $idempotencyKey,
        string $refType,
        int $refId,
        string $memo,
    ): void {
        $this->ledger->post(
            $tenant,
            $idempotencyKey,
            'promo_bonus',
            [
                ['account' => 'promo_expense', 'debit' => $bonusMinor],
                ['account' => 'customer_liability', 'credit' => $bonusMinor, 'wallet_id' => $wallet->id],
            ],
            $refType,
            $refId,
            $memo
        );
        $wallet->refresh();
        $this->ledger->creditAvailable($wallet, $bonusMinor);
    }
}
