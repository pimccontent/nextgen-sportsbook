<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\Bet;
use App\Services\AuditLogger;
use App\Services\BettingService;
use App\Services\SettlementService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class SettlementAdminController
{
    public function __construct(
        private readonly SettlementService $settlement,
        private readonly BettingService $betting,
        private readonly AuditLogger $audit,
    ) {
    }

    public function openBets(): JsonResponse
    {
        $bets = Bet::query()
            ->where('status', 'open')
            ->with('selections')
            ->orderBy('placed_at')
            ->limit(100)
            ->get()
            ->map(fn (Bet $b) => $this->betting->payload($b));

        return ApiResponse::success(['bets' => $bets->values()]);
    }

    public function settle(Request $request, string $publicId): JsonResponse
    {
        $data = $request->validate([
            'results' => ['required', 'array', 'min:1'],
            'results.*' => ['required', 'in:won,lost,void'],
        ]);

        $bet = Bet::query()->where('public_id', $publicId)->with('selections')->first();
        if (! $bet) {
            return ApiResponse::error('Bet not found', 404);
        }

        try {
            $settled = $this->settlement->settleBet($bet, $data['results']);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log(
            $request->user(),
            'bet.settle',
            $request,
            ['public_id' => $publicId, 'status' => $settled->status],
            Bet::class,
            $settled->id
        );

        return ApiResponse::success([
            'bet' => $this->betting->payload($settled),
        ], 'Bet settled');
    }
}
