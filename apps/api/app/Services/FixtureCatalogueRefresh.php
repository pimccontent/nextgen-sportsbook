<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use App\Models\SportEvent;
use App\Models\Tenant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Keeps the customer catalogue fresh without blocking lobby reads.
 * Triggered on public fixture reads (throttled).
 */
final class FixtureCatalogueRefresh
{
    public function __construct(private readonly SportsIngestionService $ingestion)
    {
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

                // Customer refresh prioritises obscure catalogue reliability over live HTTP.
                $this->ingestion->sync($tenant, [
                    'sync_top_leagues' => false,
                    'sync_other_leagues' => false,
                    'sync_obscure_leagues' => true,
                    'obscure_live_sync' => false,
                    'auto_publish' => true,
                    'provider' => 'embedded_world',
                ]);

                $this->publishUpcomingDrafts();
            } catch (\Throwable $e) {
                Log::warning('customer fixture catalogue refresh failed', [
                    'error' => $e->getMessage(),
                ]);
                Cache::forget('fixtures.catalogue.refresh');
            }
        })->afterResponse();
    }

    public function publishUpcomingDrafts(): int
    {
        return SportEvent::query()
            ->where('publication_state', PublicationState::Draft)
            ->where('status', EventStatus::Upcoming)
            ->where('kickoff_at', '>', now()->subDay())
            ->update([
                'publication_state' => PublicationState::Published,
                'published_at' => now(),
            ]);
    }
}
