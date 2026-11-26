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

        $allowMock = $this->sandboxMockAllowed($tenant);
        $email = $this->depositEmail($user, $allowMock);

        $existing = PaymentIntent::query()
            ->where('tenant_id', $tenant->id)
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($user, $amountMinor, $idempotencyKey, $tenant, $email, $allowMock) {
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

            try {
                $init = $this->paystack->initializeDeposit($tenant, $intent, $email, $allowMock);
            } catch (RuntimeException $e) {
                $intent->status = 'failed';
                $intent->provider_payload = ['error' => $e->getMessage()];
                $intent->save();
                throw new InvalidArgumentException($e->getMessage());
            }

            $intent->authorization_url = $init['authorization_url'];
            $intent->provider_reference = $init['reference'];
            $intent->provider_payload = $init;
            $intent->save();

            return $intent;
        });
    }

    /**
     * Sandbox-only client completion for mock intents. Never credits live/provider intents.
     */
    public function completeMockDeposit(string $reference, ?User $owner = null): PaymentIntent
    {
        $tenant = Tenant::default();
        if (! $this->sandboxMockAllowed($tenant)) {
            throw new RuntimeException('Manual deposit completion is not available.');
        }

        return $this->finalizeDeposit($reference, $owner, requireMock: true, providerAmountMinor: null);
    }

    /**
     * Admin-initiated cash credit (sandbox/test only). Creates a completed payment_intent
     * and posts a balanced deposit journal.
     */
    public function adminManualDeposit(
        User $customer,
        int $amountMinor,
        string $idempotencyKey,
        string $reason,
        ?User $admin = null
    ): PaymentIntent {
        $tenant = Tenant::default();
        if (! $this->sandboxMockAllowed($tenant)) {
            throw new RuntimeException('Manual deposits are only available in sandbox/test mode.');
        }

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

        return DB::transaction(function () use ($customer, $amountMinor, $idempotencyKey, $reason, $admin, $tenant) {
            $wallet = $this->wallets->forUser($customer);
            $reference = 'MAN_'.Str::upper(Str::random(14));
            $intent = PaymentIntent::query()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $customer->id,
                'wallet_id' => $wallet->id,
                'provider' => 'manual',
                'direction' => 'deposit',
                'status' => 'pending',
                'amount_minor' => $amountMinor,
                'currency' => 'GHS',
                'idempotency_key' => $idempotencyKey,
                'provider_reference' => $reference,
                'provider_payload' => [
                    'manual' => true,
                    'reason' => $reason,
                    'admin_id' => $admin?->id,
                ],
            ]);

            $this->wallets->creditDeposit(
                $tenant,
                $wallet,
                $amountMinor,
                'deposit:'.$idempotencyKey,
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

            return $intent->fresh(['user', 'commissionEntry']);
        });
    }

    /**
     * Provider webhook completion (server-side only).
     */
    public function completeProviderDeposit(string $reference, ?int $providerAmountMinor = null): PaymentIntent
    {
        return $this->finalizeDeposit($reference, null, requireMock: false, providerAmountMinor: $providerAmountMinor);
    }

    private function finalizeDeposit(
        string $reference,
        ?User $owner,
        bool $requireMock,
        ?int $providerAmountMinor
    ): PaymentIntent {
        $tenant = Tenant::default();

        return DB::transaction(function () use ($reference, $tenant, $owner, $requireMock, $providerAmountMinor) {
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
            if ($intent->direction !== 'deposit') {
                throw new RuntimeException('Invalid payment intent.');
            }

            $isMock = (bool) ($intent->provider_payload['mock'] ?? false);
            if ($requireMock && ! $isMock) {
                throw new RuntimeException('This deposit must be confirmed by the payment provider.');
            }
            if (! $requireMock && $isMock && ! $this->sandboxMockAllowed($tenant)) {
                throw new RuntimeException('Mock deposits are not accepted in live mode.');
            }

            if ($providerAmountMinor !== null && (int) $providerAmountMinor !== (int) $intent->amount_minor) {
                throw new RuntimeException('Payment amount mismatch.');
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

    public function sandboxMockAllowed(Tenant $tenant): bool
    {
        $ops = $this->settings->getGroup($tenant, 'operations')['payload'] ?? [];
        $payments = $this->settings->getGroup($tenant, 'payments')['payload'] ?? [];
        $environment = ($ops['environment'] ?? 'sandbox') === 'live' ? 'live' : 'sandbox';
        $mode = ($payments['mode'] ?? 'test') === 'live' ? 'live' : 'test';

        return $environment === 'sandbox' && $mode === 'test';
    }

    public function depositsConfigured(Tenant $tenant): bool
    {
        if ($this->sandboxMockAllowed($tenant)) {
            return true;
        }
        $secret = $this->settings->getSecretPlain($tenant, 'paystack_secret_key');

        return is_string($secret) && str_starts_with($secret, 'sk_');
    }

    private function depositEmail(User $user, bool $allowMock): string
    {
        $email = trim((string) ($user->email ?? ''));
        $synthetic = $email === '' || str_ends_with(strtolower($email), '@nextgen.local');

        if ($synthetic) {
            if ($allowMock) {
                return $email !== '' ? $email : ('user'.$user->id.'@nextgen.local');
            }
            throw new InvalidArgumentException(
                'Add a valid email address to your account before depositing.'
            );
        }

        return $email;
    }
}
