<?php

use App\Http\Controllers\Api\V1\Admin\AgentsAdminController;
use App\Http\Controllers\Api\V1\Admin\BannersAdminController;
use App\Http\Controllers\Api\V1\Admin\DepositsAdminController;
use App\Http\Controllers\Api\V1\Admin\FixturesAdminController;
use App\Http\Controllers\Api\V1\Admin\SettingsAdminController;
use App\Http\Controllers\Api\V1\Admin\SettlementAdminController;
use App\Http\Controllers\Api\V1\Admin\WithdrawalsAdminController;
use App\Http\Controllers\Api\V1\Agent\AgentPortalController;
use App\Http\Controllers\Api\V1\Agent\CommissionController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BetController;
use App\Http\Controllers\Api\V1\CustomerProfileController;
use App\Http\Controllers\Api\V1\FixturesController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PublicBannersController;
use App\Http\Controllers\Api\V1\PublicConfigController;
use App\Http\Controllers\Api\V1\SportsController;
use App\Http\Controllers\Api\V1\WalletController;
use App\Http\Controllers\Api\V1\Webhooks\PaystackWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class);
    Route::get('/public/config', PublicConfigController::class)->middleware('throttle:120,1');
    Route::get('/public/banners', PublicBannersController::class)->middleware('throttle:120,1');
    Route::post('/webhooks/paystack', PaystackWebhookController::class)->middleware('throttle:120,1');

    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
        Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:10,1');
        Route::post('/password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::put('/password', [AuthController::class, 'changePassword'])->middleware('throttle:20,1');
        });
    });

    Route::middleware('throttle:120,1')->group(function () {
        Route::get('/sports', [SportsController::class, 'index']);
        Route::get('/competitions', [SportsController::class, 'competitions']);
        Route::get('/fixtures', [FixturesController::class, 'index']);
        Route::get('/fixtures/{id}', [FixturesController::class, 'show']);
        Route::get('/fixtures/{id}/markets', [FixturesController::class, 'markets']);
    });

    Route::middleware(['auth:sanctum', 'role:customer'])->prefix('customer')->group(function () {
        Route::get('/wallet', [WalletController::class, 'show']);
        Route::post('/wallet/deposits', [WalletController::class, 'deposit'])->middleware('throttle:30,1');
        Route::post('/wallet/deposits/mock-complete', [WalletController::class, 'completeMockDeposit'])->middleware('throttle:30,1');
        Route::post('/wallet/withdrawals', [WalletController::class, 'withdraw'])->middleware('throttle:20,1');
        Route::get('/bets', [BetController::class, 'index']);
        Route::get('/bets/{id}', [BetController::class, 'show']);
        Route::post('/bets', [BetController::class, 'store'])->middleware('throttle:30,1');
        Route::get('/profile', [CustomerProfileController::class, 'show']);
        Route::put('/profile', [CustomerProfileController::class, 'update'])->middleware('throttle:30,1');
    });

    Route::middleware(['auth:sanctum', 'role:agent'])->prefix('agent')->group(function () {
        Route::get('/overview', [AgentPortalController::class, 'overview']);
        Route::get('/customers', [AgentPortalController::class, 'customers']);
        Route::get('/profile', [AgentPortalController::class, 'profile']);
        Route::put('/profile', [AgentPortalController::class, 'updateProfile'])->middleware('throttle:30,1');
        Route::put('/password', [AgentPortalController::class, 'updatePassword'])->middleware('throttle:20,1');
        Route::put('/payout-account', [AgentPortalController::class, 'updatePayoutAccount'])->middleware('throttle:30,1');
        Route::get('/payouts', [AgentPortalController::class, 'payouts']);
        Route::post('/payouts', [AgentPortalController::class, 'requestPayout'])->middleware('throttle:20,1');
        Route::get('/commissions', [CommissionController::class, 'index']);
    });

    Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
        Route::get('/fixtures', [FixturesAdminController::class, 'index']);
        Route::post('/fixtures/sync', [FixturesAdminController::class, 'sync'])->middleware('throttle:10,1');
        Route::post('/fixtures', [FixturesAdminController::class, 'store'])->middleware('throttle:30,1');
        Route::get('/fixtures/{id}', [FixturesAdminController::class, 'show']);
        Route::put('/fixtures/{id}', [FixturesAdminController::class, 'update']);
        Route::put('/fixtures/{id}/odds', [FixturesAdminController::class, 'updateOdds']);
        Route::post('/fixtures/{id}/result', [FixturesAdminController::class, 'setResult']);
        Route::post('/fixtures/{id}/publish', [FixturesAdminController::class, 'publish'])->middleware('throttle:30,1');
        Route::post('/fixtures/{id}/suspend', [FixturesAdminController::class, 'suspend'])->middleware('throttle:30,1');
        Route::post('/fixtures/{id}/markets', [FixturesAdminController::class, 'addMarket'])->middleware('throttle:60,1');
        Route::put('/fixtures/{id}/markets/{marketId}', [FixturesAdminController::class, 'updateMarket'])->middleware('throttle:60,1');
        Route::delete('/fixtures/{id}/markets/{marketId}', [FixturesAdminController::class, 'removeMarket'])->middleware('throttle:30,1');
        Route::put('/fixtures/{id}/script', [FixturesAdminController::class, 'saveScript'])->middleware('throttle:30,1');
        Route::post('/fixtures/{id}/script/arm', [FixturesAdminController::class, 'armScript'])->middleware('throttle:30,1');
        Route::get('/fixtures/{id}/players', [FixturesAdminController::class, 'players']);
        Route::get('/market-templates', [FixturesAdminController::class, 'marketTemplates']);
        Route::delete('/fixtures/{id}', [FixturesAdminController::class, 'destroy'])->middleware('throttle:30,1');

        Route::get('/banners', [BannersAdminController::class, 'index']);
        Route::post('/banners', [BannersAdminController::class, 'store'])->middleware('throttle:30,1');
        Route::put('/banners/{id}', [BannersAdminController::class, 'update'])->middleware('throttle:30,1');
        Route::delete('/banners/{id}', [BannersAdminController::class, 'destroy'])->middleware('throttle:30,1');

        Route::get('/settings', [SettingsAdminController::class, 'index']);
        Route::put('/settings/payments/secrets', [SettingsAdminController::class, 'updateSecrets'])->middleware('throttle:20,1');
        Route::get('/settings/{group}', [SettingsAdminController::class, 'show']);
        Route::put('/settings/{group}', [SettingsAdminController::class, 'update'])->middleware('throttle:60,1');

        Route::get('/settlement/bets', [SettlementAdminController::class, 'openBets']);
        Route::post('/settlement/bets/{publicId}', [SettlementAdminController::class, 'settle'])->middleware('throttle:60,1');

        Route::get('/withdrawals', [WithdrawalsAdminController::class, 'index']);
        Route::post('/withdrawals/{id}/approve', [WithdrawalsAdminController::class, 'approve'])->middleware('throttle:30,1');
        Route::post('/withdrawals/{id}/reject', [WithdrawalsAdminController::class, 'reject'])->middleware('throttle:30,1');

        Route::get('/deposits', [DepositsAdminController::class, 'index']);
        Route::patch('/deposits/{id}/commissionable', [DepositsAdminController::class, 'setCommissionable'])->middleware('throttle:60,1');

        Route::get('/agents', [AgentsAdminController::class, 'index']);
        Route::post('/agents', [AgentsAdminController::class, 'store'])->middleware('throttle:30,1');
        Route::get('/agents/{id}', [AgentsAdminController::class, 'show']);
        Route::put('/agents/{id}', [AgentsAdminController::class, 'update'])->middleware('throttle:30,1');
        Route::delete('/agents/{id}', [AgentsAdminController::class, 'destroy'])->middleware('throttle:30,1');
    });
});
