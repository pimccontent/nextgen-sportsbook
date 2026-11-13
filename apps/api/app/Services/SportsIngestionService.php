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
use App\Services\SportsData\FootballDataOrgProvider;
use App\Services\SportsData\MockSportsDataProvider;
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

    public function sync(Tenant $tenant): array
    {
        $cfg = $this->settings->getGroup($tenant, 'sports_data')['payload'];
        $providerName = (string) ($cfg['provider'] ?? 'mock');
        $apiKey = $this->settings->getSecretPlain($tenant, 'sports_api_key');

        $provider = match ($providerName) {
            'football_data_org' => new FootballDataOrgProvider,
            'thesportsdb' => new TheSportsDbProvider,
            'mock' => new MockSportsDataProvider,
            default => throw new RuntimeException("Unknown sports provider: {$providerName}"),
        };

        $dtos = $provider->fetchFixtures($apiKey, $cfg);
        $imported = 0;
        $updated = 0;

        $football = Sport::query()->firstOrCreate(
            ['slug' => 'football'],
            ['name' => 'Football', 'status' => 'active']
        );

        foreach ($dtos as $dto) {
            $result = $this->upsertFixture($football, $dto, $cfg);
            $imported += $result['created'] ? 1 : 0;
            $updated += $result['created'] ? 0 : 1;
        }

        return [
            'provider' => $providerName,
            'fetched' => count($dtos),
            'created' => $imported,
            'updated' => $updated,
        ];
    }

    private function upsertFixture(Sport $football, SportsFixtureDto $dto, array $cfg): array
    {
        return DB::transaction(function () use ($football, $dto, $cfg) {
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
                    'score_home' => $existing?->score_home ?? $dto->scoreHome,
                    'score_away' => $existing?->score_away ?? $dto->scoreAway,
                    'provider_source' => 'thesportsdb',
                    'provider_ingested_at' => now(),
                    'publication_state' => ($cfg['auto_publish'] ?? false)
                        ? PublicationState::Published
                        : ($existing?->publication_state ?? PublicationState::Draft),
                    'published_at' => ($cfg['auto_publish'] ?? false) ? now() : $existing?->published_at,
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
