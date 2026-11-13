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

    public function index(): JsonResponse
    {
        $tenant = Tenant::default();
        $rows = PaymentIntent::query()
            ->where('tenant_id', $tenant->id)
            ->where('direction', 'withdrawal')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (PaymentIntent $p) => [
                'id' => $p->id,
                'userId' => $p->user_id,
                'amountMinor' => $p->amount_minor,
                'status' => $p->status,
                'reference' => $p->provider_reference,
                'createdAt' => $p->created_at?->toIso8601String(),
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
