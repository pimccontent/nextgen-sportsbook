<?php

namespace App\Http\Controllers\Api\V1\Agent;

use App\Models\Agent;
use App\Models\CommissionEntry;
use App\Services\CommissionService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CommissionController
{
    public function __construct(private readonly CommissionService $commissions)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $agent = Agent::query()->where('user_id', $request->user()->id)->first();
        if (! $agent) {
            return ApiResponse::error('Agent profile not found', 404);
        }

        $this->commissions->releaseDueHolds($agent->id);

        $entries = CommissionEntry::query()
            ->where('agent_id', $agent->id)
            ->whereIn('status', ['pending', 'available', 'paid'])
            ->with('paymentIntent')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (CommissionEntry $e) => [
                'id' => $e->id,
                'source' => $e->source ?: 'bet',
                'status' => $e->status,
                'basisMinor' => $e->basis_minor,
                'rateBps' => $e->rate_bps,
                'amountMinor' => $e->amount_minor,
                'holdUntil' => $e->hold_until?->utc()->toIso8601String(),
                'betId' => $e->bet_id,
                'depositReference' => $e->paymentIntent?->provider_reference,
                'depositAmountMinor' => $e->paymentIntent?->amount_minor,
            ]);

        return ApiResponse::success([
            'summary' => $this->commissions->summaryForAgent($agent->id),
            'entries' => $entries->values(),
        ]);
    }
}
