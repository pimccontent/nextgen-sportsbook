<?php

namespace App\Http\Controllers\Api\V1\Webhooks;

use App\Models\Tenant;
use App\Services\PaymentService;
use App\Services\Payments\PaystackAdapter;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        if (! $this->paystack->verifyWebhookSignature($tenant, $raw, $signature)) {
            return ApiResponse::error('Invalid signature', 401);
        }

        $event = $request->input('event');
        $reference = $request->input('data.reference');

        if ($event === 'charge.success' && is_string($reference)) {
            $this->payments->completeMockDeposit($reference);
        }

        return ApiResponse::success(['received' => true]);
    }
}
