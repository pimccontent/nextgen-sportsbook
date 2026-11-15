<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantSettingsService;
use App\Shared\Http\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks customer/agent API traffic while maintenance is on.
 * Admin routes and public/config + health remain available.
 */
final class RejectDuringMaintenance
{
    public function __construct(private readonly TenantSettingsService $settings)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $path = $request->path(); // e.g. api/v1/customer/wallet

        if (
            $request->is('api/v1/health')
            || $request->is('api/v1/public/config')
            || $request->is('api/v1/public/*')
            || $request->is('api/v1/webhooks/*')
            || $request->is('api/v1/auth/*')
            || $request->is('api/v1/admin/*')
        ) {
            return $next($request);
        }

        // Only gate customer + agent portals (and their sports catalogue reads when browsing as customers).
        $gatesCustomerBrowse = $request->is('api/v1/fixtures*')
            || $request->is('api/v1/competitions*')
            || $request->is('api/v1/sports*')
            || $request->is('api/v1/customer/*')
            || $request->is('api/v1/agent/*');

        if (! $gatesCustomerBrowse) {
            return $next($request);
        }

        $ops = $this->settings->getGroup(Tenant::default(), 'operations')['payload'];
        if (! ($ops['maintenance_enabled'] ?? false)) {
            return $next($request);
        }

        return ApiResponse::error(
            (string) ($ops['maintenance_message'] ?? 'Platform is under maintenance.'),
            503,
            [
                'maintenance' => true,
                'title' => $ops['maintenance_title'] ?? "We'll be right back",
                'eta' => $ops['maintenance_eta'] ?? null,
            ]
        );
    }
}
