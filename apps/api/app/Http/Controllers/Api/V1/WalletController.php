<?php

namespace App\Http\Controllers\Api\V1;

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

        return ApiResponse::success([
            'payment' => [
                'id' => $intent->id,
                'status' => $intent->status,
                'amountMinor' => $intent->amount_minor,
                'currency' => $intent->currency,
                'provider' => $intent->provider,
                'reference' => $intent->provider_reference,
                'authorizationUrl' => $intent->authorization_url,
                'mock' => (bool) ($intent->provider_payload['mock'] ?? true),
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
            return ApiResponse::error($e->getMessage(), 404);
        }
        $wallet = $this->wallets->forUser($request->user());

        return ApiResponse::success([
            'payment' => [
                'id' => $intent->id,
                'status' => $intent->status,
                'reference' => $intent->provider_reference,
            ],
            'wallet' => $this->wallets->payload($wallet->fresh()),
        ], 'Deposit completed (sandbox)');
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
}
