<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use App\Models\Competition;
use App\Models\Market;
use App\Models\Selection;
use App\Models\Sport;
use App\Models\SportEvent;
use App\Models\Team;
use App\Models\Tenant;
use App\Services\SportsData\EmbeddedWorldLeaguesProvider;
use App\Services\SportsData\FootballDataOrgProvider;
use App\Services\SportsData\MockSportsDataProvider;
use App\Services\SportsData\OpenLigaDbProvider;
use App\Services\SportsData\SportsFixtureDto;
use App\Services\SportsData\TheSportsDbProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class SportsIngestionService
{
    public function __construct(private readonly TenantSettingsService $settings)
    {
    }

    /**
     * @param  array<string, mixed>  $optionOverrides  Merged over tenant sports_data settings for this run only.
     */
    public function sync(Tenant $tenant, array $optionOverrides = []): array
    {
        $cfg = array_replace(
            $this->settings->getGroup($tenant, 'sports_data')['payload'],
            $optionOverrides
        );
        $providerName = (string) ($cfg['provider'] ?? 'mock');
        $apiKey = $this->settings->getSecretPlain($tenant, 'sports_api_key');

        $provider = match ($providerName) {
            'football_data_org' => new FootballDataOrgProvider,
            'thesportsdb' => new TheSportsDbProvider,
            'openligadb' => new OpenLigaDbProvider,
            'embedded_world' => new EmbeddedWorldLeaguesProvider,
            'mock' => new MockSportsDataProvider,
            default => throw new RuntimeException("Unknown sports provider: {$providerName}"),
        };

        $dtos = [];
        $providerError = null;
        try {
            $dtos = $provider->fetchFixtures($apiKey, $cfg);
        } catch (RuntimeException $e) {
            // Keep sync useful when TheSportsDB is rate-limited: still import obscure leagues.
            $providerError = $e->getMessage();
            if ($providerName === 'embedded_world' || ! ($cfg['sync_obscure_leagues'] ?? true)) {
                throw $e;
            }
        }

        $obscure = [];

        // Lesser-known leagues: merge embedded catalogue (+ optional live) unless provider is already embedded_world.
        if ($providerName !== 'embedded_world' && ($cfg['sync_obscure_leagues'] ?? true)) {
            $obscure = (new EmbeddedWorldLeaguesProvider)->fetchFixtures($apiKey, $cfg);
        }

        if ($dtos === [] && $obscure === [] && $providerError !== null) {
            throw new RuntimeException($providerError);
        }

        $imported = 0;
        $updated = 0;

        $football = Sport::query()->firstOrCreate(
            ['slug' => 'football'],
            ['name' => 'Football', 'status' => 'active']
        );

        foreach ($dtos as $dto) {
            $result = $this->upsertFixture($football, $dto, $cfg, $providerName);
            $imported += $result['created'] ? 1 : 0;
            $updated += $result['created'] ? 0 : 1;
        }

        foreach ($obscure as $dto) {
            $result = $this->upsertFixture($football, $dto, $cfg, 'embedded_world');
            $imported += $result['created'] ? 1 : 0;
            $updated += $result['created'] ? 0 : 1;
        }

        return [
            'provider' => $providerName,
            'fetched' => count($dtos) + count($obscure),
            'obscure_fetched' => count($obscure),
            'created' => $imported,
            'updated' => $updated,
            'provider_warning' => $providerError,
        ];
    }

    private function upsertFixture(Sport $football, SportsFixtureDto $dto, array $cfg, string $providerName): array
    {
        return DB::transaction(function () use ($football, $dto, $cfg, $providerName) {
            $compSlug = Str::slug($dto->competitionCode);
            $competition = Competition::query()->updateOrCreate(
                ['slug' => $compSlug],
                [
                    'sport_id' => $football->id,
                    'name' => $dto->competitionName,
                    'country' => $dto->country,
                    'status' => 'active',
                    'provider_competition_id' => $dto->competitionCode,
                ]
            );

            $home = $this->team($football, $dto->homeName, $dto->homeShort);
            $away = $this->team($football, $dto->awayName, $dto->awayShort);

            $publicId = 'fx-'.Str::slug(Str::limit($dto->providerEventId, 40, ''));
            $existing = SportEvent::query()->where('provider_event_id', $dto->providerEventId)->first();

            // Respect admin lock — do not overwrite manually controlled matches.
            if ($existing?->admin_locked) {
                return ['created' => false, 'skipped' => true];
            }

            $autoPublish = (bool) ($cfg['auto_publish'] ?? false);
            $existingPub = $existing?->publication_state;
            // Never un-suspend via sync. Auto-publish only lifts drafts to published.
            if ($existingPub === PublicationState::Suspended) {
                $publication = PublicationState::Suspended;
                $publishedAt = $existing?->published_at;
            } elseif ($autoPublish) {
                $publication = PublicationState::Published;
                $publishedAt = $existing?->published_at ?? now();
            } else {
                $publication = $existingPub ?? PublicationState::Draft;
                $publishedAt = $existing?->published_at;
            }

            $event = SportEvent::query()->updateOrCreate(
                ['provider_event_id' => $dto->providerEventId],
                [
                    'public_id' => $existing?->public_id ?? $publicId,
                    'competition_id' => $competition->id,
                    'home_team_id' => $home->id,
                    'away_team_id' => $away->id,
                    'kickoff_at' => $dto->kickoffIso,
                    'timezone' => 'UTC',
                    'status' => EventStatus::from($dto->status),
                    // Unlocked fixtures accept provider score/status updates when provided.
                    'score_home' => $dto->scoreHome !== null ? $dto->scoreHome : $existing?->score_home,
                    'score_away' => $dto->scoreAway !== null ? $dto->scoreAway : $existing?->score_away,
                    'provider_source' => $providerName,
                    'provider_ingested_at' => now(),
                    'publication_state' => $publication,
                    'published_at' => $publishedAt,
                ]
            );

            $created = $event->wasRecentlyCreated;

            $main = Market::query()->firstOrCreate(
                ['event_id' => $event->id, 'public_id' => 'm-'.$event->public_id.'-1x2'],
                [
                    'name' => '1X2',
                    'status' => 'open',
                    'is_main' => true,
                    'sort_order' => 0,
                ]
            );

            $this->ensureSelection($main, $event->public_id.'-1', '1', 'home', (float) $cfg['default_home_odds']);
            $this->ensureSelection($main, $event->public_id.'-x', 'X', 'draw', (float) $cfg['default_draw_odds']);
            $this->ensureSelection($main, $event->public_id.'-2', '2', 'away', (float) $cfg['default_away_odds']);

            return ['created' => $created];
        });
    }

    private function team(Sport $sport, string $name, string $short): Team
    {
        $slug = Str::slug($name);

        return Team::query()->updateOrCreate(
            ['slug' => $slug],
            [
                'sport_id' => $sport->id,
                'name' => $name,
                'short_name' => Str::upper(Str::limit($short, 3, '')),
                'provider_team_id' => 'sync:'.$slug,
            ]
        );
    }

    private function ensureSelection(Market $market, string $publicId, string $label, string $side, float $odds): void
    {
        $sel = Selection::query()->firstOrNew([
            'market_id' => $market->id,
            'public_id' => $publicId,
        ]);
        if (! $sel->exists) {
            $sel->fill([
                'label' => $label,
                'side' => $side,
                'decimal_odds' => $odds,
                'state' => 'open',
                'odds_version' => 1,
            ]);
            $sel->save();
        }
    }
}
