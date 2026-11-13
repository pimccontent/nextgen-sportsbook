<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\TenantSettingsService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;

final class PublicConfigController
{
    public function __construct(private readonly TenantSettingsService $settings)
    {
    }

    public function __invoke(): JsonResponse
    {
        $tenant = $this->settings->defaultTenant();

        return ApiResponse::success($this->settings->publicConfig($tenant));
    }
}
