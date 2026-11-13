<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\PaymentIntent;
use App\Models\Profile;
use App\Models\Tenant;
use App\Services\AuditLogger;
use App\Services\CommissionService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DepositsAdminController
{
    public function __construct(
        private readonly CommissionService $commissions,
        private readonly AuditLogger $audit,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::default();
        $status = $request->query('status');

        $query = PaymentIntent::query()
            ->where('tenant_id', $tenant->id)
            ->where('direction', 'deposit')
            ->with(['user', 'commissionEntry'])
            ->orderByDesc('id')
            ->limit(200);

        if (is_string($status) && $status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }

        $deposits = $query->get()->map(function (PaymentIntent $p) {
            $prefs = Profile::query()->where('user_id', $p->user_id)->value('preferences') ?? [];
            $entry = $p->commissionEntry;

            return [
                'id' => $p->id,
                'reference' => $p->provider_reference,
                'status' => $p->status,
                'amountMinor' => $p->amount_minor,
                'currency' => $p->currency,
                'commissionable' => $p->commissionable,
                'commissionDecidedAt' => $p->commission_decided_at?->utc()->toIso8601String(),
                'completedAt' => $p->completed_at?->utc()->toIso8601String(),
                'customer' => [
                    'id' => $p->user_id,
                    'name' => $p->user?->name,
                    'phone' => $p->user?->phone,
                ],
                'referredAgentId' => $prefs['referred_by_agent_id'] ?? null,
                'referralCode' => $prefs['referral_code'] ?? null,
                'commission' => $entry && $entry->status !== 'voided' ? [
                    'id' => $entry->id,
                    'status' => $entry->status,
                    'amountMinor' => $entry->amount_minor,
                ] : null,
            ];
        });

        return ApiResponse::success(['deposits' => $deposits->values()]);
    }

    public function setCommissionable(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::default();
        $data = $request->validate([
            'commissionable' => ['required', 'boolean'],
        ]);

        $intent = PaymentIntent::query()
            ->where('tenant_id', $tenant->id)
            ->where('direction', 'deposit')
            ->where('id', $id)
            ->first();
        if (! $intent) {
            return ApiResponse::error('Deposit not found', 404);
        }

        $intent = $this->commissions->setDepositCommissionable($intent, (bool) $data['commissionable']);

        $this->audit->log($request->user(), 'deposit.commissionable', $request, [
            'payment_intent_id' => $intent->id,
            'commissionable' => $intent->commissionable,
        ], PaymentIntent::class, $intent->id);

        return ApiResponse::success([
            'deposit' => [
                'id' => $intent->id,
                'commissionable' => $intent->commissionable,
                'commission' => $intent->commissionEntry && $intent->commissionEntry->status !== 'voided' ? [
                    'id' => $intent->commissionEntry->id,
                    'status' => $intent->commissionEntry->status,
                    'amountMinor' => $intent->commissionEntry->amount_minor,
                ] : null,
            ],
        ], 'Commissionable flag updated');
    }
}
