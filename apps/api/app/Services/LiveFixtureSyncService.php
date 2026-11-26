<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Models\EventScript;
use App\Models\SportEvent;
use App\Models\Tenant;
use App\Services\SportsData\LiveProviderLookup;
use App\Services\SportsData\SportsFixtureDto;
use App\Services\SportsData\TheSportsDbClient;
use Illuminate\Support\Facades\Log;

/**
 * Polls provider live adapters for unlocked fixtures with real event IDs.
 * Admin-locked / scripted matches are never overwritten.
 */
final class LiveFixtureSyncService
{
    private const LOOKUP_LIMIT = 40;

    private readonly LiveProviderLookup $lookup;

    public function __construct(
        private readonly SportsIngestionService $ingestion,
        private readonly TenantSettingsService $settings,
        ?LiveProviderLookup $lookup = null,
    ) {
        $this->lookup = $lookup ?? new LiveProviderLookup;
    }

    /**
     * @return array{checked: int, updated: int, skipped: int, failed: int}
     */
    public function syncDue(int $limit = self::LOOKUP_LIMIT): array
    {
        $tenant = Tenant::default();
        $cfg = $this->settings->getGroup($tenant, 'sports_data')['payload'];
        $apiKey = $this->settings->getSecretPlain($tenant, 'sports_api_key');

        $activeScriptIds = EventScript::query()
            ->whereIn('status', ['armed', 'running'])
            ->pluck('event_id')
            ->all();

        $windowStart = now()->subMinutes(15);
        $windowEnd = now()->addHours(3);

        $events = SportEvent::query()
            ->with(['competition', 'homeTeam', 'awayTeam'])
            ->where('admin_locked', false)
            ->whereIn('status', [EventStatus::Upcoming, EventStatus::Live])
            ->where(function ($q) use ($windowStart, $windowEnd) {
                $q->where(function ($inner) use ($windowStart, $windowEnd) {
                    $inner->whereNotNull('kickoff_at')
                        ->where('kickoff_at', '>=', $windowStart)
                        ->where('kickoff_at', '<=', $windowEnd);
                })->orWhere('status', EventStatus::Live);
            })
            ->where(function ($q) {
                $q->where('provider_event_id', 'like', 'tsdb:%')
                    ->orWhere('provider_event_id', 'like', 'oldb:%')
                    ->orWhere('provider_event_id', 'like', 'fd:%');
            })
            ->when($activeScriptIds !== [], fn ($q) => $q->whereNotIn('id', $activeScriptIds))
            ->orderByRaw("CASE WHEN status = 'live' THEN 0 ELSE 1 END")
            ->orderBy('kickoff_at')
            ->limit($limit)
            ->get();

        $stats = ['checked' => $events->count(), 'updated' => 0, 'skipped' => 0, 'failed' => 0];

        $tsdbLiveIndex = [];
        $needsTsdbLive = $events->contains(fn (SportEvent $e) => str_starts_with((string) $e->provider_event_id, 'tsdb:'));
        if ($needsTsdbLive && $apiKey && $apiKey !== '123') {
            $tsdbLiveIndex = $this->lookup->theSportsDbLivescoreIndex($apiKey);
        }

        $tsdbLookups = 0;
        foreach ($events as $event) {
            $providerId = (string) $event->provider_event_id;
            if (! LiveProviderLookup::isPollable($providerId)) {
                $stats['skipped']++;
                continue;
            }

            $context = [
                'competitionCode' => $event->competition?->slug ?? $event->competition?->provider_competition_id,
                'competitionName' => $event->competition?->name,
                'country' => $event->competition?->country,
                'homeName' => $event->homeTeam?->name,
                'awayName' => $event->awayTeam?->name,
                'kickoffIso' => $event->kickoff_at?->utc()->toIso8601String(),
                'openligadb_league' => $event->competition?->provider_competition_id
                    ?? $event->competition?->slug,
            ];

            try {
                if (str_starts_with($providerId, 'tsdb:')) {
                    $tsdbLookups++;
                    if ($tsdbLookups > 1) {
                        TheSportsDbClient::pauseBetweenLeagues();
                    }
                }

                $dto = $this->lookup->lookup($providerId, $apiKey, $context);
                if ($dto === null) {
                    $stats['failed']++;
                    continue;
                }

                if (str_starts_with($providerId, 'tsdb:')) {
                    $dto = $this->mergeTsdbLivescore($dto, $tsdbLiveIndex);
                }

                $source = match (true) {
                    str_starts_with($providerId, 'tsdb:') => 'thesportsdb',
                    str_starts_with($providerId, 'oldb:') => 'openligadb',
                    str_starts_with($providerId, 'fd:') => 'football_data_org',
                    default => (string) ($event->provider_source ?? 'live'),
                };

                $result = $this->ingestion->applyUnlockedDto($dto, $source, $cfg);
                if (! empty($result['skipped'])) {
                    $stats['skipped']++;
                } else {
                    $stats['updated']++;
                }
            } catch (\Throwable $e) {
                $stats['failed']++;
                Log::warning('live fixture sync failed', [
                    'provider_event_id' => $providerId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $stats;
    }

    /**
     * @param  array<string, array{scoreHome: ?int, scoreAway: ?int, minute: ?int, period: ?string, status: string}>  $index
     */
    private function mergeTsdbLivescore(SportsFixtureDto $dto, array $index): SportsFixtureDto
    {
        $id = substr($dto->providerEventId, 5);
        $live = $index[$id] ?? null;
        if ($live === null) {
            return $dto;
        }

        return new SportsFixtureDto(
            providerEventId: $dto->providerEventId,
            competitionCode: $dto->competitionCode,
            competitionName: $dto->competitionName,
            country: $dto->country,
            homeName: $dto->homeName,
            homeShort: $dto->homeShort,
            awayName: $dto->awayName,
            awayShort: $dto->awayShort,
            kickoffIso: $dto->kickoffIso,
            status: $live['status'] !== 'upcoming' ? $live['status'] : $dto->status,
            scoreHome: $live['scoreHome'] ?? $dto->scoreHome,
            scoreAway: $live['scoreAway'] ?? $dto->scoreAway,
            isTopLeague: $dto->isTopLeague,
            minute: $live['minute'] ?? $dto->minute,
            period: $live['period'] ?? $dto->period,
        );
    }
}
