<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\BookingCode;
use App\Models\Tenant;
use App\Services\AuditLogger;
use App\Services\BookingCodeService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

final class BookingCodesAdminController
{
    public function __construct(
        private readonly BookingCodeService $bookingCodes,
        private readonly AuditLogger $audit,
    ) {
    }

    public function index(): JsonResponse
    {
        $rows = BookingCode::query()
            ->where('tenant_id', Tenant::default()->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (BookingCode $b) => $b->toDetailArray());

        return ApiResponse::success(['bookingCodes' => $rows->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'selection_public_ids' => ['required', 'array', 'min:1', 'max:20'],
            'selection_public_ids.*' => ['required', 'string', 'max:64'],
            'listed' => ['nullable', 'boolean'],
            'expires_at' => ['nullable', 'date'],
        ]);

        try {
            $code = $this->bookingCodes->create(
                $request->user(),
                'admin',
                array_map(fn ($id) => ['selection_public_id' => $id], $data['selection_public_ids']),
                (bool) ($data['listed'] ?? true),
                isset($data['expires_at']) ? new \DateTimeImmutable($data['expires_at']) : null,
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log($request->user(), 'booking_code.create', $request, [
            'code' => $code->code,
        ], BookingCode::class, $code->id);

        return ApiResponse::success(['bookingCode' => $code->toDetailArray()], 'Booking code created', 201);
    }

    public function revoke(Request $request, string $code): JsonResponse
    {
        $row = BookingCode::query()
            ->where('tenant_id', Tenant::default()->id)
            ->where('code', strtoupper($code))
            ->first();
        if (! $row) {
            return ApiResponse::error('Not found', 404);
        }
        $row->status = 'revoked';
        $row->listed = false;
        $row->save();

        $this->audit->log($request->user(), 'booking_code.revoke', $request, [
            'code' => $row->code,
        ], BookingCode::class, $row->id);

        return ApiResponse::success(['bookingCode' => $row->toDetailArray()], 'Revoked');
    }
}
