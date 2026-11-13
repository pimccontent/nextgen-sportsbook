<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\AgentPayout;
use App\Models\CommissionEntry;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class AgentPayoutService
{
    public function __construct(
        private readonly TenantSettingsService $settings,
        private readonly CommissionService $commissions,
    ) {
    }

    public function request(Agent $agent, int $amountMinor, string $idempotencyKey): AgentPayout
    {
        $tenant = Tenant::default();
        $rules = $this->settings->getGroup($tenant, 'commissions')['payload'];
        $min = (int) ($rules['min_withdrawal_minor'] ?? 5000);
        if ($amountMinor < $min) {
            $minGhs = number_format($min / 100, 2, '.', '');
            throw new InvalidArgumentException("Minimum payout is GHS {$minGhs}.");
        }
        if (! $agent->payout_method || ! $agent->payout_account) {
            throw new InvalidArgumentException('Save a payout account before requesting payout.');
        }

        $existing = AgentPayout::query()
            ->where('tenant_id', $tenant->id)
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($agent, $amountMinor, $idempotencyKey, $tenant) {
            $this->commissions->releaseDueHolds($agent->id);
            $available = (int) CommissionEntry::query()
                ->where('agent_id', $agent->id)
                ->where('status', 'available')
                ->sum('amount_minor');
            if ($amountMinor > $available) {
                throw new InvalidArgumentException('Insufficient available commission.');
            }

            $remaining = $amountMinor;
            $entries = CommissionEntry::query()
                ->where('agent_id', $agent->id)
                ->where('status', 'available')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($entries as $entry) {
                if ($remaining <= 0) {
                    break;
                }
                if ($entry->amount_minor <= $remaining) {
                    $remaining -= $entry->amount_minor;
                    $entry->status = 'paid';
                    $entry->save();
                    continue;
                }

                $leftover = $entry->amount_minor - $remaining;
                $entry->amount_minor = $remaining;
                $entry->status = 'paid';
                $entry->save();

                CommissionEntry::query()->create([
                    'tenant_id' => $entry->tenant_id,
                    'agent_id' => $entry->agent_id,
                    'source' => $entry->source,
                    'bet_id' => $entry->bet_id,
                    'payment_intent_id' => null,
                    'status' => 'available',
                    'basis_minor' => $leftover,
                    'rate_bps' => $entry->rate_bps,
                    'amount_minor' => $leftover,
                    'hold_until' => null,
                ]);
                $remaining = 0;
            }

            if ($remaining !== 0) {
                throw new InvalidArgumentException('Could not allocate payout against available commissions.');
            }

            return AgentPayout::query()->create([
                'tenant_id' => $tenant->id,
                'agent_id' => $agent->id,
                'public_id' => 'ap-'.Str::lower(Str::random(12)),
                'status' => 'pending',
                'amount_minor' => $amountMinor,
                'currency' => 'GHS',
                'idempotency_key' => $idempotencyKey,
                'payout_method' => $agent->payout_method,
                'payout_network' => $agent->payout_network,
                'payout_account' => $agent->payout_account,
                'payout_account_name' => $agent->payout_account_name,
            ]);
        });
    }

    public function approve(AgentPayout $payout): AgentPayout
    {
        if ($payout->status !== 'pending') {
            throw new RuntimeException('Payout not approvable.');
        }
        $payout->status = 'paid';
        $payout->processed_at = now();
        $payout->save();

        return $payout;
    }

    public function reject(AgentPayout $payout, ?string $note = null): AgentPayout
    {
        if ($payout->status !== 'pending') {
            throw new RuntimeException('Payout cannot be rejected.');
        }
        // Sandbox: commissions already marked paid at request time; rejection notes only.
        $payout->status = 'rejected';
        $payout->admin_note = $note;
        $payout->processed_at = now();
        $payout->save();

        return $payout;
    }
}
