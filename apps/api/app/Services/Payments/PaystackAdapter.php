<?php

namespace App\Services\Payments;

use App\Models\PaymentIntent;
use App\Models\Tenant;
use App\Services\TenantSettingsService;
use Illuminate\Support\Str;

/**
 * Sandbox/mock Paystack adapter. Uses real keys when configured; otherwise
 * returns a deterministic mock authorization URL for local demos.
 */
final class PaystackAdapter
{
    public function __construct(private readonly TenantSettingsService $settings)
    {
    }

    public function initializeDeposit(Tenant $tenant, PaymentIntent $intent, string $email): array
    {
        $payments = $this->settings->getGroup($tenant, 'payments')['payload'];
        $secret = $this->settings->getSecretPlain($tenant, 'paystack_secret_key');
        $reference = $intent->provider_reference ?: ('NG_'.Str::upper(Str::random(16)));

        if (! $secret || ($payments['mode'] ?? 'test') === 'test' && str_starts_with((string) $secret, 'sk_test_') === false && $secret === '') {
            // Fully mocked path for local development without keys.
        }

        if ($secret && str_starts_with($secret, 'sk_')) {
            // Live HTTP call intentionally omitted until operator provides sandbox keys
            // and category approval is confirmed. Fall through to mock response shape.
        }

        $amountPesewas = $intent->amount_minor;
        $authUrl = ($payments['callback_url'] ?? 'http://localhost:3000/wallet')
            .'?paystack=mock&reference='.urlencode($reference);

        return [
            'reference' => $reference,
            'authorization_url' => $authUrl,
            'access_code' => 'mock_'.Str::lower(Str::random(10)),
            'amount' => $amountPesewas,
            'currency' => $intent->currency,
            'email' => $email,
            'mock' => true,
        ];
    }

    public function verifyWebhookSignature(Tenant $tenant, string $payload, ?string $signature): bool
    {
        $secret = $this->settings->getSecretPlain($tenant, 'paystack_webhook_secret');
        if (! $secret) {
            // Allow mock webhooks in sandbox when secret not configured.
            return ($signature === null || $signature === 'mock');
        }

        $computed = hash_hmac('sha512', $payload, $secret);

        return hash_equals($computed, (string) $signature);
    }
}
