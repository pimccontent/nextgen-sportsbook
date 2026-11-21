<?php

namespace App\Services\Payments;

use App\Models\PaymentIntent;
use App\Models\Tenant;
use App\Services\TenantSettingsService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Paystack deposit adapter.
 * - Sandbox ops without a secret key: deterministic mock authorization (local demos only).
 * - Configured secret: real HTTPS initialize against Paystack.
 */
final class PaystackAdapter
{
    public function __construct(private readonly TenantSettingsService $settings)
    {
    }

    /**
     * @return array{reference:string,authorization_url:string,access_code:string,amount:int,currency:string,email:string,mock:bool}
     */
    public function initializeDeposit(
        Tenant $tenant,
        PaymentIntent $intent,
        string $email,
        bool $allowMock
    ): array {
        $payments = $this->settings->getGroup($tenant, 'payments')['payload'];
        $secret = $this->settings->getSecretPlain($tenant, 'paystack_secret_key');
        $reference = $intent->provider_reference ?: ('NG_'.Str::upper(Str::random(16)));
        $callback = (string) ($payments['callback_url'] ?? (rtrim((string) config('app.url'), '/').'/wallet'));

        if ($secret && str_starts_with($secret, 'sk_')) {
            $response = Http::withToken($secret)
                ->acceptJson()
                ->timeout(25)
                ->post('https://api.paystack.co/transaction/initialize', [
                    'email' => $email,
                    'amount' => $intent->amount_minor,
                    'currency' => $intent->currency ?: 'GHS',
                    'reference' => $reference,
                    'callback_url' => $callback,
                    'metadata' => [
                        'intent_id' => $intent->id,
                        'user_id' => $intent->user_id,
                        'platform' => 'nextgen-sportsbook',
                    ],
                ]);

            if (! $response->successful()) {
                $message = (string) ($response->json('message') ?? 'Payment provider rejected the deposit request.');
                throw new RuntimeException($message);
            }

            $data = $response->json('data') ?? [];
            $authUrl = (string) ($data['authorization_url'] ?? '');
            if ($authUrl === '') {
                throw new RuntimeException('Payment provider did not return a checkout URL.');
            }

            return [
                'reference' => (string) ($data['reference'] ?? $reference),
                'authorization_url' => $authUrl,
                'access_code' => (string) ($data['access_code'] ?? ''),
                'amount' => $intent->amount_minor,
                'currency' => $intent->currency,
                'email' => $email,
                'mock' => false,
            ];
        }

        if (! $allowMock) {
            throw new RuntimeException(
                'Card deposits are not available yet. Please contact support or try again later.'
            );
        }

        $authUrl = $callback.(str_contains($callback, '?') ? '&' : '?')
            .'paystack=mock&reference='.urlencode($reference);

        return [
            'reference' => $reference,
            'authorization_url' => $authUrl,
            'access_code' => 'mock_'.Str::lower(Str::random(10)),
            'amount' => $intent->amount_minor,
            'currency' => $intent->currency,
            'email' => $email,
            'mock' => true,
        ];
    }

    public function verifyWebhookSignature(Tenant $tenant, string $payload, ?string $signature, bool $allowMock): bool
    {
        $secret = $this->settings->getSecretPlain($tenant, 'paystack_webhook_secret');

        if (! $secret) {
            return $allowMock && ($signature === null || $signature === 'mock');
        }

        if ($signature === null || $signature === '') {
            return false;
        }

        $computed = hash_hmac('sha512', $payload, $secret);

        return hash_equals($computed, $signature);
    }
}
