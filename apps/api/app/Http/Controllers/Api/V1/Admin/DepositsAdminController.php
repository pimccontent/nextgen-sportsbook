<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserRole;
use App\Models\PaymentIntent;
use App\Models\Profile;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\CommissionService;
use App\Services\PaymentService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class DepositsAdminController
{
    public function __construct(
        private readonly CommissionService $commissions,
        private readonly AuditLogger $audit,
        private readonly PaymentService $payments,
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
                'provider' => $p->provider,
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
                'manualReason' => is_array($p->provider_payload)
                    ? ($p->provider_payload['reason'] ?? null)
                    : null,
            ];
        });

        return ApiResponse::success(['deposits' => $deposits->values()]);
    }

    public function manualCredit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'integer', 'min:1'],
            'phone' => ['nullable', 'string', 'max:32'],
            'amount_minor' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'min:3', 'max:240'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
        ]);

        if (empty($data['user_id']) && empty($data['phone'])) {
            return ApiResponse::error('Provide user_id or phone.', 422);
        }

        $customerQuery = User::query()
            ->where('tenant_id', Tenant::default()->id)
            ->where('role', UserRole::Customer);

        if (! empty($data['user_id'])) {
            $customerQuery->where('id', (int) $data['user_id']);
        } else {
            $phone = preg_replace('/\D+/', '', (string) $data['phone']) ?? '';
            $customerQuery->where(function ($q) use ($phone, $data) {
                $q->where('phone', $data['phone'])
                    ->orWhere('phone', $phone)
                    ->orWhere('phone', 'like', '%'.substr($phone, -9));
            });
        }

        $customer = $customerQuery->first();
        if (! $customer) {
            return ApiResponse::error('Customer not found.', 404);
        }

        $idempotency = $data['idempotency_key'] ?? ('admin-manual-'.Str::uuid()->toString());

        try {
            $intent = $this->payments->adminManualDeposit(
                $customer,
                (int) $data['amount_minor'],
                $idempotency,
                trim($data['reason']),
                $request->user()
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log($request->user(), 'deposit.manual', $request, [
            'payment_intent_id' => $intent->id,
            'user_id' => $customer->id,
            'amount_minor' => $intent->amount_minor,
            'reason' => $data['reason'],
        ], PaymentIntent::class, $intent->id);

        return ApiResponse::success([
            'deposit' => [
                'id' => $intent->id,
                'reference' => $intent->provider_reference,
                'status' => $intent->status,
                'amountMinor' => $intent->amount_minor,
                'provider' => $intent->provider,
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                ],
            ],
        ], 'Manual deposit credited', 201);
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
