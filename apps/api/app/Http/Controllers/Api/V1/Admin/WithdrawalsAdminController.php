<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\PaymentIntent;
use App\Models\Tenant;
use App\Services\AuditLogger;
use App\Services\WithdrawalService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class WithdrawalsAdminController
{
    public function __construct(
        private readonly WithdrawalService $withdrawals,
        private readonly AuditLogger $audit,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::default();
        $data = $request->validate([
            'user_id' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'max:40'],
            'q' => ['nullable', 'string', 'max:80'],
        ]);

        $query = PaymentIntent::query()
            ->where('tenant_id', $tenant->id)
            ->where('direction', 'withdrawal')
            ->with('user')
            ->orderByDesc('id')
            ->limit(200);

        if (! empty($data['user_id'])) {
            $query->where('user_id', (int) $data['user_id']);
        }
        if (! empty($data['status']) && $data['status'] !== 'all') {
            $query->where('status', $data['status']);
        }
        if (! empty($data['q'])) {
            $q = trim($data['q']);
            $query->where(function ($inner) use ($q) {
                $inner->where('provider_reference', 'ilike', '%'.$q.'%')
                    ->orWhereHas('user', function ($u) use ($q) {
                        $u->where('phone', 'ilike', '%'.$q.'%')
                            ->orWhere('name', 'ilike', '%'.$q.'%')
                            ->orWhere('email', 'ilike', '%'.$q.'%');
                    });
            });
        }

        $rows = $query->get()->map(fn (PaymentIntent $p) => [
            'id' => $p->id,
            'userId' => $p->user_id,
            'amountMinor' => $p->amount_minor,
            'currency' => $p->currency,
            'status' => $p->status,
            'reference' => $p->provider_reference,
            'createdAt' => $p->created_at?->toIso8601String(),
            'completedAt' => $p->completed_at?->toIso8601String(),
            'customer' => [
                'id' => $p->user_id,
                'name' => $p->user?->name,
                'phone' => $p->user?->phone,
                'email' => $p->user?->email,
            ],
        ]);

        return ApiResponse::success(['withdrawals' => $rows->values()]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $intent = PaymentIntent::query()
            ->where('tenant_id', Tenant::default()->id)
            ->where('id', $id)
            ->first();
        if (! $intent) {
            return ApiResponse::error('Not found', 404);
        }
        try {
            $done = $this->withdrawals->approve($intent);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }
        $this->audit->log($request->user(), 'withdrawal.approve', $request, ['id' => $id]);

        return ApiResponse::success(['withdrawal' => ['id' => $done->id, 'status' => $done->status]]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $intent = PaymentIntent::query()
            ->where('tenant_id', Tenant::default()->id)
            ->where('id', $id)
            ->first();
        if (! $intent) {
            return ApiResponse::error('Not found', 404);
        }
        try {
            $done = $this->withdrawals->reject($intent);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }
        $this->audit->log($request->user(), 'withdrawal.reject', $request, ['id' => $id]);

        return ApiResponse::success(['withdrawal' => ['id' => $done->id, 'status' => $done->status]]);
    }
}
