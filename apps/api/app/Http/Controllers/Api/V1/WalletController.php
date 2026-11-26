<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\PaymentIntent;
use App\Models\Tenant;
use App\Services\PaymentService;
use App\Services\WalletService;
use App\Services\WithdrawalService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

final class WalletController
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly PaymentService $payments,
        private readonly WithdrawalService $withdrawals,
    ) {
    }

    public function show(Request $request): JsonResponse
    {
        $wallet = $this->wallets->forUser($request->user());

        return ApiResponse::success(['wallet' => $this->wallets->payload($wallet)]);
    }

    public function deposit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount_minor' => ['required', 'integer', 'min:1'],
            'idempotency_key' => ['required', 'string', 'max:128'],
        ]);

        try {
            $intent = $this->payments->initiateDeposit(
                $request->user(),
                (int) $data['amount_minor'],
                $data['idempotency_key']
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $isMock = (bool) ($intent->provider_payload['mock'] ?? false);

        return ApiResponse::success([
            'payment' => [
                'id' => $intent->id,
                'status' => $intent->status,
                'amountMinor' => $intent->amount_minor,
                'currency' => $intent->currency,
                'provider' => $intent->provider,
                'reference' => $intent->provider_reference,
                'authorizationUrl' => $intent->authorization_url,
                'mock' => $isMock,
            ],
        ], 'Deposit initiated', 201);
    }

    public function completeMockDeposit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:128'],
        ]);

        try {
            $intent = $this->payments->completeMockDeposit($data['reference'], $request->user());
        } catch (\RuntimeException $e) {
            $status = str_contains(strtolower($e->getMessage()), 'not found') ? 404 : 422;
            return ApiResponse::error($e->getMessage(), $status);
        }
        $wallet = $this->wallets->forUser($request->user());

        return ApiResponse::success([
            'payment' => [
                'id' => $intent->id,
                'status' => $intent->status,
                'reference' => $intent->provider_reference,
            ],
            'wallet' => $this->wallets->payload($wallet->fresh()),
        ], 'Deposit completed');
    }

    public function withdraw(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount_minor' => ['required', 'integer', 'min:1'],
            'idempotency_key' => ['required', 'string', 'max:128'],
        ]);

        try {
            $intent = $this->withdrawals->request(
                $request->user(),
                (int) $data['amount_minor'],
                $data['idempotency_key']
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $wallet = $this->wallets->forUser($request->user());

        return ApiResponse::success([
            'withdrawal' => [
                'id' => $intent->id,
                'status' => $intent->status,
                'amountMinor' => $intent->amount_minor,
                'reference' => $intent->provider_reference,
            ],
            'wallet' => $this->wallets->payload($wallet->fresh()),
        ], 'Withdrawal submitted', 201);
    }

    public function withdrawals(Request $request): JsonResponse
    {
        $tenant = Tenant::default();
        $rows = PaymentIntent::query()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $request->user()->id)
            ->where('direction', 'withdrawal')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (PaymentIntent $p) => [
                'id' => $p->id,
                'status' => $p->status,
                'amountMinor' => $p->amount_minor,
                'currency' => $p->currency,
                'reference' => $p->provider_reference,
                'createdAt' => $p->created_at?->toIso8601String(),
                'completedAt' => $p->completed_at?->toIso8601String(),
            ]);

        return ApiResponse::success(['withdrawals' => $rows->values()]);
    }

    public function deposits(Request $request): JsonResponse
    {
        $tenant = Tenant::default();
        $rows = PaymentIntent::query()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $request->user()->id)
            ->where('direction', 'deposit')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (PaymentIntent $p) => [
                'id' => $p->id,
                'status' => $p->status,
                'amountMinor' => $p->amount_minor,
                'currency' => $p->currency,
                'provider' => $p->provider,
                'reference' => $p->provider_reference,
                'createdAt' => $p->created_at?->toIso8601String(),
                'completedAt' => $p->completed_at?->toIso8601String(),
            ]);

        return ApiResponse::success(['deposits' => $rows->values()]);
    }
}
