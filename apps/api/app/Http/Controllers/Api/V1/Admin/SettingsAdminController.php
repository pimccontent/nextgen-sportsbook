<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Services\AuditLogger;
use App\Services\TenantSettingsService;
use App\Shared\Http\ApiResponse;
use App\Support\TenantSettingsDefaults;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

final class SettingsAdminController
{
    public function __construct(
        private readonly TenantSettingsService $settings,
        private readonly AuditLogger $audit,
    ) {
    }

    public function index(): JsonResponse
    {
        $tenant = $this->settings->defaultTenant();

        return ApiResponse::success([
            'tenant' => ['id' => $tenant->id, 'slug' => $tenant->slug, 'name' => $tenant->name],
            'groups' => $this->settings->getAll($tenant),
            'secrets' => $this->settings->secretStatus($tenant),
        ]);
    }

    public function show(string $group): JsonResponse
    {
        try {
            $tenant = $this->settings->defaultTenant();
            $data = $this->settings->getGroup($tenant, $group);

            return ApiResponse::success([
                'settings' => $data,
                'secrets' => $group === 'payments' ? $this->settings->secretStatus($tenant) : null,
            ]);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 404);
        }
    }

    public function update(Request $request, string $group): JsonResponse
    {
        if (! in_array($group, TenantSettingsDefaults::groups(), true)) {
            return ApiResponse::error('Unknown settings group.', 404);
        }

        $payload = $request->validate([
            'payload' => ['required', 'array'],
        ])['payload'];

        $tenant = $this->settings->defaultTenant();
        $updated = $this->settings->updateGroup($tenant, $group, $payload);

        $this->audit->log(
            $request->user(),
            'settings.update',
            $request,
            ['group' => $group, 'version' => $updated['version']],
            'tenant_settings',
            $tenant->id
        );

        return ApiResponse::success(['settings' => $updated], 'Settings updated');
    }

    public function updateSecrets(Request $request): JsonResponse
    {
        $data = $request->validate([
            'paystack_secret_key' => ['nullable', 'string', 'max:255'],
            'paystack_webhook_secret' => ['nullable', 'string', 'max:255'],
            'sports_api_key' => ['nullable', 'string', 'max:255'],
        ]);

        $tenant = $this->settings->defaultTenant();

        if (! empty($data['paystack_secret_key'])) {
            $this->settings->putSecret($tenant, 'paystack_secret_key', $data['paystack_secret_key']);
        }
        if (! empty($data['paystack_webhook_secret'])) {
            $this->settings->putSecret($tenant, 'paystack_webhook_secret', $data['paystack_webhook_secret']);
        }
        if (! empty($data['sports_api_key'])) {
            $this->settings->putSecret($tenant, 'sports_api_key', $data['sports_api_key']);
        }

        $this->audit->log(
            $request->user(),
            'settings.secrets.update',
            $request,
            [
                'updated' => array_keys(array_filter($data)),
            ],
            'tenant_secrets',
            $tenant->id
        );

        return ApiResponse::success([
            'secrets' => $this->settings->secretStatus($tenant),
        ], 'Secrets updated');
    }
}
