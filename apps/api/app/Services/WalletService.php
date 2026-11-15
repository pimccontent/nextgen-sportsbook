<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;

final class WalletService
{
    public function __construct(private readonly LedgerService $ledger)
    {
    }

    public function forUser(User $user, string $currency = 'GHS'): Wallet
    {
        $tenantId = $user->tenant_id ?? Tenant::default()->id;

        return Wallet::query()->firstOrCreate(
            ['user_id' => $user->id, 'currency' => $currency],
            [
                'tenant_id' => $tenantId,
                'available_minor' => 0,
                'bonus_minor' => 0,
                'pending_minor' => 0,
                'reserved_minor' => 0,
                'version' => 0,
            ]
        );
    }

    public function payload(Wallet $wallet): array
    {
        return [
            'currency' => $wallet->currency,
            'availableMinor' => $wallet->available_minor,
            'bonusMinor' => $wallet->bonus_minor ?? 0,
            'pendingMinor' => $wallet->pending_minor,
            'reservedMinor' => $wallet->reserved_minor,
            'withdrawableMinor' => $wallet->available_minor,
            'label' => 'Wallet',
        ];
    }

    public function creditDeposit(Tenant $tenant, Wallet $wallet, int $amountMinor, string $idempotencyKey, ?int $paymentIntentId = null): void
    {
        $this->ledger->post(
            $tenant,
            $idempotencyKey,
            'deposit',
            [
                ['account' => 'cash_clearing', 'debit' => $amountMinor],
                ['account' => 'customer_liability', 'credit' => $amountMinor, 'wallet_id' => $wallet->id],
            ],
            'payment_intent',
            $paymentIntentId,
            'Customer deposit'
        );
        $wallet->refresh();
        $this->ledger->creditAvailable($wallet, $amountMinor);
    }
}
