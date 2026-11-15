<?php

namespace App\Http\Controllers\Api\V1\Agent;

use App\Models\Agent;
use App\Models\BookingCode;
use App\Services\BookingCodeService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

final class BookingCodesAgentController
{
    public function __construct(private readonly BookingCodeService $bookingCodes)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        if (! $agent->can_create_booking_codes) {
            return ApiResponse::error('Booking codes are not enabled for this agent.', 403);
        }

        $rows = BookingCode::query()
            ->where('created_by_user_id', $request->user()->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (BookingCode $b) => $b->toDetailArray());

        return ApiResponse::success(['bookingCodes' => $rows->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        if (! $agent->can_create_booking_codes) {
            return ApiResponse::error('Booking codes are not enabled for this agent.', 403);
        }

        $data = $request->validate([
            'selection_public_ids' => ['required', 'array', 'min:1', 'max:20'],
            'selection_public_ids.*' => ['required', 'string', 'max:64'],
            'listed' => ['nullable', 'boolean'],
            'expires_at' => ['nullable', 'date'],
        ]);

        try {
            $code = $this->bookingCodes->create(
                $request->user(),
                'agent',
                array_map(fn ($id) => ['selection_public_id' => $id], $data['selection_public_ids']),
                (bool) ($data['listed'] ?? true),
                isset($data['expires_at']) ? new \DateTimeImmutable($data['expires_at']) : null,
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(['bookingCode' => $code->toDetailArray()], 'Booking code created', 201);
    }

    private function agent(Request $request): Agent
    {
        $agent = Agent::query()->where('user_id', $request->user()->id)->first();
        abort_unless($agent, 404, 'Agent profile not found');

        return $agent;
    }
}
