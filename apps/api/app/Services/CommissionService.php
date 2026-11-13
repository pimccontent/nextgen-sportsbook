<?php

namespace App\Services;

use App\Models\Bet;
use App\Models\CommissionEntry;
use App\Models\PaymentIntent;
use App\Models\Profile;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class CommissionService
{
    public function __construct(private readonly TenantSettingsService $settings)
    {
    }

    public function accrueOnBet(Tenant $tenant, User $customer, Bet $bet): ?CommissionEntry
    {
        $rules = $this->settings->getGroup($tenant, 'commissions')['payload'];
        if (! ($rules['bet_commissions_enabled'] ?? true)) {
            return null;
        }

        $agentId = $this->referredAgentId($customer);
        if (! $agentId) {
            return null;
        }

        $basis = (string) $rules['basis'];
        $basisMinor = $basis === 'turnover' ? $bet->stake_minor : 0;
        if ($basisMinor <= 0) {
            return null;
        }

        $rate = (int) $rules['rate_bps'];
        $amount = (int) floor($basisMinor * $rate / 10000);
        if ($amount <= 0) {
            return null;
        }
        $holdDays = (int) $rules['hold_days'];

        return CommissionEntry::query()->create([
            'tenant_id' => $tenant->id,
            'agent_id' => $agentId,
            'source' => 'bet',
            'bet_id' => $bet->id,
            'payment_intent_id' => null,
            'status' => 'pending',
            'basis_minor' => $basisMinor,
            'rate_bps' => $rate,
            'amount_minor' => $amount,
            'hold_until' => now()->addDays($holdDays),
        ]);
    }

    public function accrueOnDeposit(PaymentIntent $intent): ?CommissionEntry
    {
        if ($intent->direction !== 'deposit' || $intent->status !== 'completed') {
            return null;
        }
        if ($intent->commissionable !== true) {
            return null;
        }

        $tenant = Tenant::query()->findOrFail($intent->tenant_id);
        $rules = $this->settings->getGroup($tenant, 'commissions')['payload'];
        if (! ($rules['deposit_commissions_enabled'] ?? true)) {
            return null;
        }

        $existing = CommissionEntry::query()
            ->where('payment_intent_id', $intent->id)
            ->where('status', '!=', 'voided')
            ->first();
        if ($existing) {
            return $existing;
        }

        $customer = User::query()->find($intent->user_id);
        if (! $customer) {
            return null;
        }
        $agentId = $this->referredAgentId($customer);
        if (! $agentId) {
            return null;
        }

        $basisMinor = (int) $intent->amount_minor;
        if ($basisMinor <= 0) {
            return null;
        }
        $rate = (int) $rules['rate_bps'];
        $amount = (int) floor($basisMinor * $rate / 10000);
        if ($amount <= 0) {
            return null;
        }
        $holdDays = (int) $rules['hold_days'];

        return CommissionEntry::query()->create([
            'tenant_id' => $tenant->id,
            'agent_id' => $agentId,
            'source' => 'deposit',
            'bet_id' => null,
            'payment_intent_id' => $intent->id,
            'status' => 'pending',
            'basis_minor' => $basisMinor,
            'rate_bps' => $rate,
            'amount_minor' => $amount,
            'hold_until' => now()->addDays($holdDays),
        ]);
    }

    public function voidDepositCommission(PaymentIntent $intent): void
    {
        CommissionEntry::query()
            ->where('payment_intent_id', $intent->id)
            ->whereIn('status', ['pending', 'available'])
            ->update(['status' => 'voided']);
    }

    public function releaseDueHolds(?int $agentId = null): int
    {
        $q = CommissionEntry::query()
            ->where('status', 'pending')
            ->whereNotNull('hold_until')
            ->where('hold_until', '<=', now());
        if ($agentId) {
            $q->where('agent_id', $agentId);
        }

        return $q->update(['status' => 'available']);
    }

    /**
     * @return array{pendingMinor: int, heldMinor: int, availableMinor: int, paidMinor: int}
     */
    public function summaryForAgent(int $agentId): array
    {
        $this->releaseDueHolds($agentId);

        $rows = CommissionEntry::query()
            ->where('agent_id', $agentId)
            ->whereIn('status', ['pending', 'available', 'paid'])
            ->selectRaw('status, sum(amount_minor) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $pending = (int) ($rows['pending'] ?? 0);
        $available = (int) ($rows['available'] ?? 0);
        $paid = (int) ($rows['paid'] ?? 0);

        return [
            'pendingMinor' => $pending,
            'heldMinor' => $pending,
            'availableMinor' => $available,
            'paidMinor' => $paid,
        ];
    }

    public function setDepositCommissionable(PaymentIntent $intent, bool $commissionable): PaymentIntent
    {
        return DB::transaction(function () use ($intent, $commissionable) {
            $intent = PaymentIntent::query()->where('id', $intent->id)->lockForUpdate()->firstOrFail();
            $intent->commissionable = $commissionable;
            $intent->commission_decided_at = now();
            $intent->save();

            if ($commissionable && $intent->status === 'completed') {
                $this->accrueOnDeposit($intent);
            } else {
                $this->voidDepositCommission($intent);
            }

            return $intent->fresh();
        });
    }

    private function referredAgentId(User $customer): ?int
    {
        $profile = Profile::query()->where('user_id', $customer->id)->first();
        $agentId = $profile?->preferences['referred_by_agent_id'] ?? null;

        return $agentId ? (int) $agentId : null;
    }
}
