<?php

namespace App\Http\Middleware;

use App\Shared\Http\ApiResponse;
use App\Support\AdminPermission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();
        if (! $user) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        if (! AdminPermission::allows($user, $module)) {
            return ApiResponse::error('You do not have permission for this module.', 403);
        }

        return $next($request);
    }
}
