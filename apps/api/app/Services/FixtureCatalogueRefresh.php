<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Keeps the customer catalogue fresh without blocking lobby reads.
 * Triggered on public fixture reads (throttled).
 */
final class FixtureCatalogueRefresh
{
    public function __construct(
        private readonly SportsIngestionService $ingestion,
        private readonly TenantSettingsService $settings,
    ) {
    }

    /**
     * Schedule a background catalogue sync at most once per TTL window.
     */
    public function scheduleIfStale(int $ttlSeconds = 180): void
    {
        if (! Cache::add('fixtures.catalogue.refresh', 1, $ttlSeconds)) {
            return;
        }

        dispatch(function () {
            try {
                set_time_limit(120);
                $tenant = Tenant::default();
                $sports = $this->settings->getGroup($tenant, 'sports_data')['payload'];
                $autoPublish = (bool) ($sports['auto_publish'] ?? false);

                // Customer refresh prioritises obscure catalogue reliability over live HTTP.
                // Respect tenant auto_publish — never force-publish drafts in the background.
                $this->ingestion->sync($tenant, [
                    'sync_top_leagues' => false,
                    'sync_other_leagues' => false,
                    'sync_obscure_leagues' => true,
                    'obscure_live_sync' => false,
                    'auto_publish' => $autoPublish,
                    'provider' => 'embedded_world',
                ]);
            } catch (\Throwable $e) {
                Log::warning('customer fixture catalogue refresh failed', [
                    'error' => $e->getMessage(),
                ]);
                Cache::forget('fixtures.catalogue.refresh');
            }
        })->afterResponse();
    }
}
