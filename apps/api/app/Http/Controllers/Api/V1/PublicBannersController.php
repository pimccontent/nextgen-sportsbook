<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Banner;
use App\Models\Tenant;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;

final class PublicBannersController
{
    public function __invoke(): JsonResponse
    {
        $tenant = Tenant::default();
        $banners = Banner::query()
            ->where('tenant_id', $tenant->id)
            ->customerVisible()
            ->get()
            ->map(fn (Banner $b) => $b->toPublicArray())
            ->values();

        return ApiResponse::success(['banners' => $banners]);
    }
}
