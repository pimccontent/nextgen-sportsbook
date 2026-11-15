<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\AgentPayout;
use App\Services\AgentPayoutService;
use App\Services\AuditLogger;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class AgentPayoutsAdminController
{
    public function __construct(
        private readonly AgentPayoutService $payouts,
        private readonly AuditLogger $audit,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $q = AgentPayout::query()
            ->with(['agent.user.profile'])
            ->orderByDesc('id');
        if (is_string($status) && $status !== '' && $status !== 'all') {
            $q->where('status', $status);
        }

        $rows = $q->limit(100)->get()->map(fn (AgentPayout $p) => $this->payload($p));

        return ApiResponse::success(['payouts' => $rows->values()]);
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $payout = AgentPayout::query()->where('public_id', $id)->firstOrFail();
        try {
            $payout = $this->payouts->approve($payout);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log($request->user(), 'agent_payout.approve', $request, [
            'public_id' => $payout->public_id,
            'amount_minor' => $payout->amount_minor,
        ], AgentPayout::class, $payout->id);

        return ApiResponse::success(['payout' => $this->payload($payout->load('agent.user.profile'))], 'Approved');
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        $payout = AgentPayout::query()->where('public_id', $id)->firstOrFail();
        try {
            $payout = $this->payouts->reject($payout, $data['note'] ?? null);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log($request->user(), 'agent_payout.reject', $request, [
            'public_id' => $payout->public_id,
            'amount_minor' => $payout->amount_minor,
        ], AgentPayout::class, $payout->id);

        return ApiResponse::success(['payout' => $this->payload($payout->load('agent.user.profile'))], 'Rejected — commissions restored');
    }

    private function payload(AgentPayout $p): array
    {
        $agent = $p->agent;

        return [
            'id' => $p->public_id,
            'status' => $p->status,
            'amountMinor' => (int) $p->amount_minor,
            'method' => $p->payout_method,
            'network' => $p->payout_network,
            'account' => $p->payout_account,
            'accountName' => $p->payout_account_name,
            'adminNote' => $p->admin_note,
            'createdAt' => optional($p->created_at)?->toIso8601String(),
            'processedAt' => optional($p->processed_at)?->toIso8601String(),
            'agent' => [
                'id' => $agent?->public_id,
                'name' => $agent?->user?->profile?->display_name
                    ?? $agent?->user?->name
                    ?? 'Agent',
                'email' => $agent?->user?->email,
            ],
        ];
    }
}
