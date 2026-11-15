<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\TenantSecret;
use App\Models\TenantSetting;
use App\Support\TenantSettingsDefaults;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class TenantSettingsService
{
    public function defaultTenant(): Tenant
    {
        return Tenant::default();
    }

    public function getGroup(Tenant $tenant, string $group): array
    {
        $this->assertGroup($group);
        $row = TenantSetting::query()
            ->where('tenant_id', $tenant->id)
            ->where('group', $group)
            ->first();

        $defaults = TenantSettingsDefaults::all()[$group];

        return [
            'group' => $group,
            'version' => $row?->version ?? 1,
            'payload' => array_replace_recursive($defaults, $row?->payload ?? []),
        ];
    }

    /**
     * @return array<string, array{group: string, version: int, payload: array}>
     */
    public function getAll(Tenant $tenant): array
    {
        $out = [];
        foreach (TenantSettingsDefaults::groups() as $group) {
            $out[$group] = $this->getGroup($tenant, $group);
        }

        return $out;
    }

    public function updateGroup(Tenant $tenant, string $group, array $payload): array
    {
        $this->assertGroup($group);
        $defaults = TenantSettingsDefaults::all()[$group];
        $merged = array_replace_recursive($defaults, $payload);

        if ($group === 'operations') {
            $env = ($merged['environment'] ?? 'sandbox') === 'live' ? 'live' : 'sandbox';
            $merged['environment'] = $env;
            $merged['maintenance_enabled'] = (bool) ($merged['maintenance_enabled'] ?? false);
            $merged['show_environment_banner'] = (bool) ($merged['show_environment_banner'] ?? true);
        }

        $row = TenantSetting::query()->firstOrNew([
            'tenant_id' => $tenant->id,
            'group' => $group,
        ]);

        $isNew = ! $row->exists;
        $row->payload = $merged;
        $row->version = $isNew ? 1 : ((int) $row->version + 1);
        $row->save();

        if ($group === 'operations') {
            $this->syncPaymentsModeFromEnvironment($tenant, (string) $merged['environment']);
        }

        return $this->getGroup($tenant, $group);
    }

    private function syncPaymentsModeFromEnvironment(Tenant $tenant, string $environment): void
    {
        $desiredMode = $environment === 'live' ? 'live' : 'test';
        $payments = $this->getGroup($tenant, 'payments');
        if (($payments['payload']['mode'] ?? 'test') === $desiredMode) {
            return;
        }
        $defaults = TenantSettingsDefaults::all()['payments'];
        $merged = array_replace_recursive($defaults, array_merge($payments['payload'], [
            'mode' => $desiredMode,
        ]));
        $row = TenantSetting::query()->firstOrNew([
            'tenant_id' => $tenant->id,
            'group' => 'payments',
        ]);
        $isNew = ! $row->exists;
        $row->payload = $merged;
        $row->version = $isNew ? 1 : ((int) $row->version + 1);
        $row->save();
    }

    public function putSecret(Tenant $tenant, string $key, string $plain): array
    {
        $allowed = ['paystack_secret_key', 'paystack_webhook_secret', 'sports_api_key'];
        if (! in_array($key, $allowed, true)) {
            throw new InvalidArgumentException('Unknown secret key.');
        }

        $secret = TenantSecret::query()->firstOrNew([
            'tenant_id' => $tenant->id,
            'key' => $key,
        ]);
        $secret->setPlainValue($plain);
        $secret->save();

        return $this->secretStatus($tenant);
    }

    /**
     * @return array<string, array{configured: bool, hint: string|null}>
     */
    public function secretStatus(Tenant $tenant): array
    {
        $keys = ['paystack_secret_key', 'paystack_webhook_secret', 'sports_api_key'];
        $rows = TenantSecret::query()
            ->where('tenant_id', $tenant->id)
            ->whereIn('key', $keys)
            ->get()
            ->keyBy('key');

        $status = [];
        foreach ($keys as $key) {
            $row = $rows->get($key);
            $status[$key] = [
                'configured' => $row !== null,
                'hint' => $row?->hint,
            ];
        }

        return $status;
    }

    public function getSecretPlain(Tenant $tenant, string $key): ?string
    {
        $row = TenantSecret::query()
            ->where('tenant_id', $tenant->id)
            ->where('key', $key)
            ->first();

        return $row?->plainValue();
    }

    public function publicConfig(Tenant $tenant): array
    {
        $all = $this->getAll($tenant);
        $branding = $all['branding']['payload'];
        $locale = $all['locale']['payload'];
        $betting = $all['betting']['payload'];
        $wallet = $all['wallet']['payload'];
        $payments = $all['payments']['payload'];
        $compliance = $all['compliance']['payload'];
        $legal = $all['legal']['payload'] ?? [];
        $operations = $all['operations']['payload'] ?? [];
        $environment = ($operations['environment'] ?? 'sandbox') === 'live' ? 'live' : 'sandbox';
        $maintenanceOn = (bool) ($operations['maintenance_enabled'] ?? false);

        // Migrate legacy apple-green accent to golden orange for customer CTAs.
        $accent = strtolower((string) ($branding['color_accent'] ?? ''));
        if (in_array($accent, ['#b8f000', '#a3e635', '#84cc16', '#bef264', '#d9f99d'], true)) {
            $branding['color_accent'] = '#F5A524';
        }
        if (empty($branding['color_accent'])) {
            $branding['color_accent'] = '#F5A524';
        }

        return [
            'tenant' => [
                'slug' => $tenant->slug,
                'name' => $tenant->name,
            ],
            'branding' => $branding,
            'locale' => $locale,
            'betting' => [
                'min_stake_minor' => $betting['min_stake_minor'],
                'max_stake_minor' => $betting['max_stake_minor'],
                'max_payout_minor' => $betting['max_payout_minor'],
                'bet_types' => $betting['bet_types'],
                'odds_change_policy' => $betting['odds_change_policy'],
                'cashout_enabled' => $betting['cashout_enabled'],
                'prematch_only' => $betting['prematch_only'],
            ],
            'wallet' => [
                'min_deposit_minor' => $wallet['min_deposit_minor'],
                'max_deposit_minor' => $wallet['max_deposit_minor'],
                'min_withdrawal_minor' => $wallet['min_withdrawal_minor'],
                'max_withdrawal_minor' => $wallet['max_withdrawal_minor'],
                'withdrawal_require_kyc' => (bool) ($wallet['withdrawal_require_kyc'] ?? false),
                'withdrawal_require_payout_details' => (bool) ($wallet['withdrawal_require_payout_details'] ?? false),
                'withdrawal_daily_limit_minor' => (int) ($wallet['withdrawal_daily_limit_minor'] ?? 0),
                'withdrawal_rules_title' => $wallet['withdrawal_rules_title'] ?? 'Withdrawal rules',
                'withdrawal_rules_text' => $wallet['withdrawal_rules_text'] ?? '',
                'withdrawal_fee_minor' => (int) ($wallet['withdrawal_fee_minor'] ?? 0),
                'withdrawal_approval' => $wallet['withdrawal_approval'] ?? 'manual',
            ],
            'payments' => [
                'provider' => $payments['provider'],
                'public_key' => $payments['public_key'],
                'mode' => $payments['mode'],
            ],
            'promotions' => app(\App\Services\BonusService::class)->publicPayload($tenant),
            'compliance' => $compliance,
            'legal' => [
                'terms' => [
                    'title' => $legal['terms_title'] ?? 'Terms of Service',
                    'body' => $legal['terms_body'] ?? '',
                ],
                'privacy' => [
                    'title' => $legal['privacy_title'] ?? 'Privacy Policy',
                    'body' => $legal['privacy_body'] ?? '',
                ],
                'responsible_gambling' => [
                    'title' => $legal['responsible_gambling_title'] ?? 'Responsible Gambling',
                    'body' => $legal['responsible_gambling_body'] ?? '',
                ],
                'about' => [
                    'title' => $legal['about_title'] ?? 'About',
                    'body' => $legal['about_body'] ?? '',
                ],
            ],
            'operations' => [
                'environment' => $environment,
                'maintenance_enabled' => $maintenanceOn,
                'maintenance_title' => (string) ($operations['maintenance_title'] ?? "We'll be right back"),
                'maintenance_message' => (string) ($operations['maintenance_message'] ?? ''),
                'maintenance_eta' => $operations['maintenance_eta'] ?? null,
                'show_environment_banner' => (bool) ($operations['show_environment_banner'] ?? true),
            ],
            'meta' => [
                'mock' => $environment !== 'live',
                'environment' => $environment,
                'sports_data_mode' => config('services.sports_data_mode', 'mock'),
                'payments_mode' => $payments['mode'] ?? ($environment === 'live' ? 'live' : 'test'),
                'maintenance' => $maintenanceOn,
            ],
        ];
    }

    public function seedDefaults(Tenant $tenant): void
    {
        DB::transaction(function () use ($tenant) {
            foreach (TenantSettingsDefaults::all() as $group => $payload) {
                TenantSetting::query()->updateOrCreate(
                    ['tenant_id' => $tenant->id, 'group' => $group],
                    ['payload' => $payload, 'version' => 1]
                );
            }
        });
    }

    private function assertGroup(string $group): void
    {
        if (! in_array($group, TenantSettingsDefaults::groups(), true)) {
            throw new InvalidArgumentException("Unknown settings group: {$group}");
        }
    }
}
