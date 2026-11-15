<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\BookingCodeService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;

final class PublicBookingCodesController
{
    public function __construct(private readonly BookingCodeService $bookingCodes)
    {
    }

    public function index(): JsonResponse
    {
        $rows = array_map(
            fn ($b) => $b->toPublicArray(),
            $this->bookingCodes->listedPublic()
        );

        return ApiResponse::success(['bookingCodes' => $rows]);
    }

    public function show(string $code): JsonResponse
    {
        try {
            $row = $this->bookingCodes->resolve($code);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 404);
        }

        return ApiResponse::success(['bookingCode' => $row->toDetailArray()]);
    }
}
