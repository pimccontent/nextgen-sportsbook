<?php

namespace App\Services;

use App\Models\PaymentIntent;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Payments\PaystackAdapter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class PaymentService
{
    public function __construct(
        private readonly TenantSettingsService $settings,
        private readonly WalletService $wallets,
        private readonly PaystackAdapter $paystack,
        private readonly CommissionService $commissions,
    ) {
    }

    public function initiateDeposit(User $user, int $amountMinor, string $idempotencyKey): PaymentIntent
    {
        $tenant = Tenant::default();
        $walletRules = $this->settings->getGroup($tenant, 'wallet')['payload'];
        $min = (int) $walletRules['min_deposit_minor'];
        $max = (int) $walletRules['max_deposit_minor'];
        if ($amountMinor < $min || $amountMinor > $max) {
            $minGhs = number_format($min / 100, 2, '.', '');
            $maxGhs = number_format($max / 100, 2, '.', '');
            throw new InvalidArgumentException("Deposit must be between GHS {$minGhs} and GHS {$maxGhs}.");
        }

        $existing = PaymentIntent::query()
            ->where('tenant_id', $tenant->id)
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($user, $amountMinor, $idempotencyKey, $tenant) {
            $wallet = $this->wallets->forUser($user);
            $intent = PaymentIntent::query()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'provider' => 'paystack',
                'direction' => 'deposit',
                'status' => 'pending',
                'amount_minor' => $amountMinor,
                'currency' => 'GHS',
                'idempotency_key' => $idempotencyKey,
                'provider_reference' => 'NG_'.Str::upper(Str::random(16)),
            ]);

            $email = $user->email ?: 'customer'.$user->id.'@nextgen.local';
            $init = $this->paystack->initializeDeposit($tenant, $intent, $email);
            $intent->authorization_url = $init['authorization_url'];
            $intent->provider_reference = $init['reference'];
            $intent->provider_payload = $init;
            $intent->save();

            return $intent;
        });
    }

    public function completeMockDeposit(string $reference, ?User $owner = null): PaymentIntent
    {
        $tenant = Tenant::default();

        return DB::transaction(function () use ($reference, $tenant, $owner) {
            $intent = PaymentIntent::query()
                ->where('tenant_id', $tenant->id)
                ->where('provider_reference', $reference)
                ->lockForUpdate()
                ->first();

            if (! $intent) {
                throw new RuntimeException('Payment intent not found.');
            }
            if ($owner && (int) $intent->user_id !== (int) $owner->id) {
                throw new RuntimeException('Payment intent not found.');
            }
            if ($intent->status === 'completed') {
                return $intent;
            }

            $wallet = $intent->wallet()->firstOrFail();
            $this->wallets->creditDeposit(
                $tenant,
                $wallet,
                $intent->amount_minor,
                'deposit:'.$intent->idempotency_key,
                $intent->id
            );

            $rules = $this->settings->getGroup($tenant, 'commissions')['payload'];
            $defaultCommissionable = (bool) ($rules['deposit_commissionable_default'] ?? true);

            $intent->status = 'completed';
            $intent->completed_at = now();
            $intent->commissionable = $defaultCommissionable;
            $intent->commission_decided_at = now();
            $intent->save();

            app(BonusService::class)->awardDepositBonus($intent);
            $this->commissions->accrueOnDeposit($intent);

            return $intent;
        });
    }
}
