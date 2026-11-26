<?php

namespace App\Http\Controllers\Api\V1;

use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

final class HealthController
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'api' => 'ok',
            'database' => 'unchecked',
            'redis' => 'unchecked',
        ];

        try {
            DB::connection()->getPdo();
            $checks['database'] = 'ok';
        } catch (Throwable) {
            $checks['database'] = 'unavailable';
        }

        try {
            Redis::ping();
            $checks['redis'] = 'ok';
        } catch (Throwable) {
            $checks['redis'] = 'unavailable';
        }

        $healthy = $checks['api'] === 'ok';

        return ApiResponse::success([
            'service' => 'nextgen-api',
            'status' => $healthy ? 'healthy' : 'degraded',
            'checks' => $checks,
            'note' => $healthy
                ? 'API process up'
                : 'API up but database/redis checks failed',
        ], 'Health check');
    }
}
