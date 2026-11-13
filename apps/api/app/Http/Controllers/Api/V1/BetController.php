<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\BettingService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

final class BetController
{
    public function __construct(private readonly BettingService $betting)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'bets' => $this->betting->listForUser($request->user()),
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $bet = $this->betting->findForUser($request->user(), $id);
        if (! $bet) {
            return ApiResponse::error('Bet not found', 404);
        }

        return ApiResponse::success([
            'bet' => $this->betting->payload($bet, true),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'stake_minor' => ['required', 'integer', 'min:1'],
            'idempotency_key' => ['required', 'string', 'max:128'],
            'selections' => ['required', 'array', 'min:1'],
            'selections.*.selection_public_id' => ['required', 'string'],
            'selections.*.quoted_odds' => ['required', 'numeric', 'min:1'],
        ]);

        try {
            $bet = $this->betting->place(
                $request->user(),
                (int) $data['stake_minor'],
                $data['selections'],
                $data['idempotency_key']
            );
        } catch (InvalidArgumentException|RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success([
            'bet' => $this->betting->payload($bet),
        ], 'Bet accepted', 201);
    }
}
