<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Shared\Http\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * @param  string  ...$roles  Role values: customer, agent, admin, super_admin
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $allowed = collect($roles)
            ->flatMap(function (string $role) {
                if ($role === 'admin') {
                    return [UserRole::Admin, UserRole::SuperAdmin];
                }

                return [UserRole::from($role)];
            })
            ->all();

        if (! $user->hasRole(...$allowed)) {
            return ApiResponse::error('Forbidden for this role.', 403);
        }

        if (! $user->isActive()) {
            return ApiResponse::error('Account is not active.', 403);
        }

        return $next($request);
    }
}
