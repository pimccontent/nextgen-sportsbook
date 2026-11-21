<?php

namespace App\Http\Controllers\Api\V1\Webhooks;

use App\Models\Tenant;
use App\Services\PaymentService;
use App\Services\Payments\PaystackAdapter;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class PaystackWebhookController
{
    public function __construct(
        private readonly PaystackAdapter $paystack,
        private readonly PaymentService $payments,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $tenant = Tenant::default();
        $raw = $request->getContent();
        $signature = $request->header('x-paystack-signature');
        $allowMock = $this->payments->sandboxMockAllowed($tenant);

        if (! $this->paystack->verifyWebhookSignature($tenant, $raw, $signature, $allowMock)) {
            return ApiResponse::error('Invalid signature', 401);
        }

        $event = $request->input('event');
        $reference = $request->input('data.reference');
        $amount = $request->input('data.amount');

        if ($event === 'charge.success' && is_string($reference) && $reference !== '') {
            try {
                $this->payments->completeProviderDeposit(
                    $reference,
                    is_numeric($amount) ? (int) $amount : null
                );
            } catch (RuntimeException $e) {
                return ApiResponse::error($e->getMessage(), 422);
            }
        }

        return ApiResponse::success(['received' => true]);
    }
}
