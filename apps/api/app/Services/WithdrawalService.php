<?php

namespace App\Services;

use App\Models\PaymentIntent;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class WithdrawalService
{
    public function __construct(
        private readonly TenantSettingsService $settings,
        private readonly WalletService $wallets,
        private readonly LedgerService $ledger,
    ) {
    }

    public function request(User $user, int $amountMinor, string $idempotencyKey): PaymentIntent
    {
        $tenant = Tenant::default();
        $rules = $this->settings->getGroup($tenant, 'wallet')['payload'];
        $min = (int) $rules['min_withdrawal_minor'];
        $max = (int) $rules['max_withdrawal_minor'];
        $fee = (int) $rules['withdrawal_fee_minor'];
        if ($amountMinor < $min || $amountMinor > $max) {
            throw new InvalidArgumentException('Withdrawal amount outside configured Ghana Cedis limits.');
        }

        $user->loadMissing('profile');
        $prefs = $user->profile?->preferences ?? [];
        if (! empty($rules['withdrawal_require_kyc'])) {
            $kycStatus = $prefs['kyc']['status'] ?? 'none';
            if (! in_array($kycStatus, ['pending', 'verified'], true)) {
                throw new InvalidArgumentException('Complete KYC before withdrawing.');
            }
        }
        if (! empty($rules['withdrawal_require_payout_details'])) {
            $payout = $prefs['payout'] ?? [];
            $hasMomo = ($payout['method'] ?? null) === 'momo' && ! empty($payout['momo_number']);
            $hasBank = ($payout['method'] ?? null) === 'bank' && ! empty($payout['account_number']);
            if (! $hasMomo && ! $hasBank) {
                throw new InvalidArgumentException('Add payout details before withdrawing.');
            }
        }

        $dailyLimit = (int) ($rules['withdrawal_daily_limit_minor'] ?? 0);
        if ($dailyLimit > 0) {
            $todayTotal = (int) PaymentIntent::query()
                ->where('user_id', $user->id)
                ->where('direction', 'withdrawal')
                ->whereNotIn('status', ['failed', 'rejected'])
                ->whereDate('created_at', now()->toDateString())
                ->sum('amount_minor');
            if ($todayTotal + $amountMinor > $dailyLimit) {
                throw new InvalidArgumentException('Daily withdrawal limit exceeded.');
            }
        }

        $existing = PaymentIntent::query()
            ->where('tenant_id', $tenant->id)
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) {
            return $existing;
        }

        $total = $amountMinor + $fee;

        return DB::transaction(function () use ($user, $amountMinor, $fee, $total, $idempotencyKey, $tenant, $rules) {
            $wallet = $this->wallets->forUser($user);
            if ($wallet->available_minor < $total) {
                throw new InvalidArgumentException('Insufficient available balance.');
            }

            $this->ledger->reserveStake($wallet, $total);

            $approval = (string) $rules['withdrawal_approval'];
            $threshold = (int) $rules['withdrawal_auto_threshold_minor'];
            $auto = $approval === 'auto'
                || ($approval === 'threshold' && $amountMinor <= $threshold);

            $intent = PaymentIntent::query()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'provider' => 'paystack',
                'direction' => 'withdrawal',
                'status' => $auto ? 'approved' : 'pending_review',
                'amount_minor' => $amountMinor,
                'currency' => 'GHS',
                'idempotency_key' => $idempotencyKey,
                'provider_reference' => 'WD_'.Str::upper(Str::random(12)),
                'provider_payload' => ['fee_minor' => $fee, 'total_minor' => $total],
            ]);

            if ($auto) {
                return $this->finalize($intent);
            }

            return $intent;
        });
    }

    public function approve(PaymentIntent $intent): PaymentIntent
    {
        if ($intent->direction !== 'withdrawal') {
            throw new RuntimeException('Not a withdrawal.');
        }

        return DB::transaction(function () use ($intent) {
            $intent = PaymentIntent::query()->where('id', $intent->id)->lockForUpdate()->firstOrFail();
            if ($intent->status === 'completed') {
                return $intent;
            }
            if (! in_array($intent->status, ['pending_review', 'approved'], true)) {
                throw new RuntimeException('Withdrawal not approvable.');
            }

            return $this->finalize($intent);
        });
    }

    public function reject(PaymentIntent $intent): PaymentIntent
    {
        if ($intent->direction !== 'withdrawal' || $intent->status !== 'pending_review') {
            throw new RuntimeException('Withdrawal cannot be rejected.');
        }

        return DB::transaction(function () use ($intent) {
            $intent = PaymentIntent::query()->where('id', $intent->id)->lockForUpdate()->firstOrFail();
            $wallet = Wallet::query()->where('id', $intent->wallet_id)->lockForUpdate()->firstOrFail();
            $total = (int) ($intent->provider_payload['total_minor'] ?? $intent->amount_minor);
            $this->ledger->releaseReservedToAvailable($wallet, $total);
            $intent->status = 'rejected';
            $intent->save();

            return $intent;
        });
    }

    private function finalize(PaymentIntent $intent): PaymentIntent
    {
        $tenant = Tenant::query()->findOrFail($intent->tenant_id);
        $wallet = Wallet::query()->where('id', $intent->wallet_id)->lockForUpdate()->firstOrFail();
        $total = (int) ($intent->provider_payload['total_minor'] ?? $intent->amount_minor);

        $this->ledger->consumeReserved($wallet, $total);
        $this->ledger->post(
            $tenant,
            'wd-complete:'.$intent->idempotency_key,
            'withdrawal',
            [
                ['account' => 'customer_liability', 'debit' => $total, 'wallet_id' => $wallet->id],
                ['account' => 'cash_clearing', 'credit' => $total],
            ],
            'payment_intent',
            $intent->id,
            'Withdrawal paid (sandbox)'
        );

        $intent->status = 'completed';
        $intent->completed_at = now();
        $intent->save();

        return $intent;
    }
}
