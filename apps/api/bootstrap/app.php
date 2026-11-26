<?php

use App\Http\Middleware\ApiResponseEnvelope;
use App\Http\Middleware\EnsureAdminPermission;
use App\Http\Middleware\EnsureUserRole;
use App\Http\Middleware\RejectDuringMaintenance;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Docker / reverse-proxy: use real client IP for rate limiting when forwarded.
        $middleware->trustProxies(at: '*');

        $middleware->appendToGroup('api', [
            SecurityHeaders::class,
            ApiResponseEnvelope::class,
            RejectDuringMaintenance::class,
        ]);

        $middleware->alias([
            'role' => EnsureUserRole::class,
            'admin.perm' => EnsureAdminPermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function (Request $request) {
            return $request->is('api/*') || $request->expectsJson();
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], $e->status);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        });
    })->create();
