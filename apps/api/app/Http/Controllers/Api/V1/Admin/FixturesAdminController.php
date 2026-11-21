<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use App\Models\Competition;
use App\Models\Market;
use App\Models\Selection;
use App\Models\Sport;
use App\Models\SportEvent;
use App\Models\Team;
use App\Models\Tenant;
use App\Models\EventScript;
use App\Models\Player;
use App\Services\AuditLogger;
use App\Services\FixtureSettlementService;
use App\Services\LiveFixtureLifecycle;
use App\Services\MarketCatalogService;
use App\Services\MatchScriptService;
use App\Services\SettlementService;
use App\Services\SportsIngestionService;
use App\Services\TenantSettingsService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class FixturesAdminController
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly SportsIngestionService $ingestion,
        private readonly TenantSettingsService $settings,
        private readonly LiveFixtureLifecycle $liveLifecycle,
        private readonly MarketCatalogService $markets,
        private readonly MatchScriptService $scripts,
        private readonly FixtureSettlementService $fixtureSettlement,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->liveLifecycle->syncDueEvents();

        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'max:40'],
            'publication_state' => ['nullable', 'string', 'max:40'],
            'competition_id' => ['nullable', 'integer'],
            'country' => ['nullable', 'string', 'max:120'],
            'provider_source' => ['nullable', 'string', 'max:60'],
            'include_cancelled' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'in:kickoff_at,competition,status,publication_state,home,created_at'],
            'dir' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $sort = $data['sort'] ?? 'kickoff_at';
        $dir = $data['dir'] ?? 'desc';
        $perPage = (int) ($data['per_page'] ?? 25);

        $query = SportEvent::query()
            ->with(['competition', 'homeTeam', 'awayTeam', 'markets.selections']);

        if (! ($data['include_cancelled'] ?? false)) {
            $query->where('status', '!=', EventStatus::Cancelled);
        }

        if (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }
        if (! empty($data['publication_state'])) {
            $query->where('publication_state', $data['publication_state']);
        }
        if (! empty($data['competition_id'])) {
            $query->where('competition_id', (int) $data['competition_id']);
        }
        if (! empty($data['provider_source'])) {
            $query->where('provider_source', $data['provider_source']);
        }
        if (! empty($data['country'])) {
            $query->whereHas('competition', fn ($q) => $q->where('country', $data['country']));
        }
        if (! empty($data['q'])) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $data['q']).'%';
            $query->where(function ($q) use ($term) {
                $q->where('home_name_override', 'ilike', $term)
                    ->orWhere('away_name_override', 'ilike', $term)
                    ->orWhere('public_id', 'ilike', $term)
                    ->orWhereHas('homeTeam', fn ($t) => $t->where('name', 'ilike', $term))
                    ->orWhereHas('awayTeam', fn ($t) => $t->where('name', 'ilike', $term))
                    ->orWhereHas('competition', fn ($c) => $c->where('name', 'ilike', $term));
            });
        }

        $dirSql = $dir === 'asc' ? 'asc' : 'desc';
        // Model table is `events` (not sport_events).
        if ($sort === 'home') {
            $query
                ->leftJoin('teams as home_teams_sort', 'events.home_team_id', '=', 'home_teams_sort.id')
                ->orderByRaw('LOWER(COALESCE(events.home_name_override, home_teams_sort.name)) '.$dirSql)
                ->select('events.*');
        } elseif ($sort === 'competition') {
            $query
                ->leftJoin('competitions as competitions_sort', 'events.competition_id', '=', 'competitions_sort.id')
                ->orderByRaw('LOWER(competitions_sort.name) '.$dirSql)
                ->select('events.*');
        } else {
            $query->orderBy(match ($sort) {
                'status' => 'status',
                'publication_state' => 'publication_state',
                'created_at' => 'created_at',
                default => 'kickoff_at',
            }, $dirSql);
        }

        $paginator = $query->paginate($perPage);

        $competitions = Competition::query()
            ->orderBy('name')
            ->get(['id', 'name', 'country'])
            ->map(fn (Competition $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'country' => $c->country,
            ])
            ->values();

        $countries = $competitions->pluck('country')->filter()->unique()->sort()->values();

        return ApiResponse::success([
            'fixtures' => $paginator->getCollection()->map(fn (SportEvent $e) => $this->summary($e))->values(),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'filters' => [
                'competitions' => $competitions,
                'countries' => $countries,
                'statuses' => ['upcoming', 'live', 'finished', 'postponed', 'cancelled', 'abandoned'],
                'publication_states' => ['draft', 'published', 'suspended'],
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        return ApiResponse::success(['fixture' => $this->detail($event)]);
    }

    public function sync(Request $request): JsonResponse
    {
        set_time_limit(180);

        try {
            $result = $this->ingestion->sync(Tenant::default());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log($request->user(), 'fixtures.sync', $request, $result);

        return ApiResponse::success($result, 'Fixtures synced from live provider');
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['required', 'string', 'max:80'],
        ]);

        $deleted = 0;
        $skipped = [];

        foreach ($data['ids'] as $publicId) {
            $event = $this->find($publicId);
            if (! $event) {
                $skipped[] = ['id' => $publicId, 'reason' => 'not_found'];
                continue;
            }

            $openBets = \App\Models\Bet::query()
                ->where('status', 'open')
                ->whereHas('selections', fn ($q) => $q->where('event_id', $event->id))
                ->count();

            if ($openBets > 0) {
                $skipped[] = ['id' => $publicId, 'reason' => "open_bets:{$openBets}"];
                continue;
            }

            $event->status = EventStatus::Cancelled;
            $event->publication_state = PublicationState::Suspended;
            $event->admin_locked = true;
            $event->clock_started_at = null;
            $event->save();

            foreach ($event->markets as $market) {
                $market->status = 'suspended';
                $market->save();
                foreach ($market->selections as $selection) {
                    $selection->state = 'suspended';
                    $selection->save();
                }
            }

            $deleted++;
        }

        $this->audit->log($request->user(), 'fixtures.bulk_delete', $request, [
            'deleted' => $deleted,
            'skipped' => count($skipped),
        ]);

        return ApiResponse::success([
            'deleted' => $deleted,
            'skipped' => $skipped,
        ], "Removed {$deleted} fixture(s)");
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'competition_name' => ['required', 'string', 'max:160'],
            'competition_country' => ['nullable', 'string', 'max:120'],
            'home_name' => ['required', 'string', 'max:160'],
            'away_name' => ['required', 'string', 'max:160'],
            'home_short' => ['nullable', 'string', 'max:8'],
            'away_short' => ['nullable', 'string', 'max:8'],
            'kickoff_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:kickoff_at'],
            'home_odds' => ['nullable', 'numeric', 'min:1.01'],
            'draw_odds' => ['nullable', 'numeric', 'min:1.01'],
            'away_odds' => ['nullable', 'numeric', 'min:1.01'],
            'publish' => ['nullable', 'boolean'],
        ]);

        $cfg = $this->settings->getGroup(Tenant::default(), 'sports_data')['payload'];

        $event = DB::transaction(function () use ($data, $cfg) {
            $football = Sport::query()->firstOrCreate(
                ['slug' => 'football'],
                ['name' => 'Football', 'status' => 'active']
            );
            $compSlug = Str::slug($data['competition_name']).'-custom';
            $competition = Competition::query()->firstOrCreate(
                ['slug' => $compSlug],
                [
                    'sport_id' => $football->id,
                    'name' => $data['competition_name'],
                    'country' => $data['competition_country'] ?? 'Custom',
                    'status' => 'active',
                ]
            );
            $home = $this->upsertTeam($football, $data['home_name'], $data['home_short'] ?? null);
            $away = $this->upsertTeam($football, $data['away_name'], $data['away_short'] ?? null);
            $publicId = 'fx-custom-'.Str::lower(Str::random(10));

            $event = SportEvent::query()->create([
                'public_id' => $publicId,
                'competition_id' => $competition->id,
                'home_team_id' => $home->id,
                'away_team_id' => $away->id,
                'home_name_override' => $data['home_name'],
                'away_name_override' => $data['away_name'],
                'home_short_override' => $data['home_short'] ?? $home->short_name,
                'away_short_override' => $data['away_short'] ?? $away->short_name,
                'kickoff_at' => $data['kickoff_at'],
                'ends_at' => $data['ends_at'] ?? null,
                'timezone' => 'UTC',
                'status' => EventStatus::Upcoming,
                'publication_state' => ($data['publish'] ?? false)
                    ? PublicationState::Published
                    : PublicationState::Draft,
                'published_at' => ($data['publish'] ?? false) ? now() : null,
                'provider_event_id' => 'custom:'.$publicId,
                'provider_source' => 'admin_custom',
                'provider_ingested_at' => now(),
                'admin_locked' => true,
            ]);

            $this->markets->addMarket($event, '1x2');
            $main = $event->markets()->where('type', '1x2')->first();
            if ($main) {
                foreach ($main->selections as $sel) {
                    $odds = match ($sel->outcome_key) {
                        'home' => $data['home_odds'] ?? $cfg['default_home_odds'],
                        'draw' => $data['draw_odds'] ?? $cfg['default_draw_odds'],
                        'away' => $data['away_odds'] ?? $cfg['default_away_odds'],
                        default => $sel->decimal_odds,
                    };
                    $sel->decimal_odds = $odds;
                    $sel->save();
                }
            }
            foreach (['double_chance', 'btts', 'over_under'] as $type) {
                $this->markets->addMarket($event, $type, $type === 'over_under' ? ['line' => 2.5] : null);
            }

            return $event;
        });

        $this->audit->log($request->user(), 'fixture.create', $request, [
            'public_id' => $event->public_id,
        ], SportEvent::class, $event->id);

        return ApiResponse::success([
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
        ], 'Custom fixture created', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        $data = $request->validate([
            'home_name' => ['nullable', 'string', 'max:160'],
            'away_name' => ['nullable', 'string', 'max:160'],
            'home_short' => ['nullable', 'string', 'max:8'],
            'away_short' => ['nullable', 'string', 'max:8'],
            'kickoff_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'status' => ['nullable', 'in:upcoming,live,finished,postponed,cancelled,abandoned'],
            'period' => ['nullable', 'in:1H,HT,2H,ET1,ET2,PEN,FT'],
            'minute' => ['nullable', 'integer', 'min:0', 'max:130'],
            'extra_time_minute' => ['nullable', 'integer', 'min:0', 'max:30'],
            'score_home' => ['nullable', 'integer', 'min:0', 'max:50'],
            'score_away' => ['nullable', 'integer', 'min:0', 'max:50'],
            'publication_state' => ['nullable', 'in:draft,published,suspended'],
            'admin_locked' => ['nullable', 'boolean'],
            'competition_id' => ['nullable', 'integer', 'exists:competitions,id'],
            'start_clock' => ['nullable', 'boolean'],
            'stop_clock' => ['nullable', 'boolean'],
        ]);

        if (isset($data['competition_id'])) {
            $event->competition_id = (int) $data['competition_id'];
            $event->admin_locked = true;
        }

        if (isset($data['home_name'])) {
            $event->home_name_override = $data['home_name'];
            $event->homeTeam?->update(['name' => $data['home_name']]);
        }
        if (isset($data['away_name'])) {
            $event->away_name_override = $data['away_name'];
            $event->awayTeam?->update(['name' => $data['away_name']]);
        }
        if (isset($data['home_short'])) {
            $event->home_short_override = $data['home_short'];
        }
        if (isset($data['away_short'])) {
            $event->away_short_override = $data['away_short'];
        }
        $scheduleChanged = false;
        if (isset($data['kickoff_at'])) {
            $prevKickoff = $event->kickoff_at?->utc()->toIso8601String();
            $event->kickoff_at = $data['kickoff_at'];
            $scheduleChanged = $prevKickoff !== $event->kickoff_at?->utc()->toIso8601String();
        }
        if (array_key_exists('ends_at', $data)) {
            $prevEnds = $event->ends_at?->utc()->toIso8601String();
            $event->ends_at = $data['ends_at'];
            if ($prevEnds !== $event->ends_at?->utc()->toIso8601String()) {
                $scheduleChanged = true;
            }
        }
        if ($scheduleChanged) {
            $this->scripts->pause($event);
            $event->admin_locked = true;
            // Upcoming with future kickoff: clear accidental live clock so lifecycle waits.
            if (
                ($event->status === EventStatus::Upcoming || ($data['status'] ?? null) === 'upcoming')
                && $event->kickoff_at
                && $event->kickoff_at->isFuture()
            ) {
                $event->status = EventStatus::Upcoming;
                $event->period = null;
                $event->minute = null;
                $event->extra_time_minute = null;
                $event->clock_started_at = null;
            }
        }
        if (isset($data['status'])) {
            $event->status = EventStatus::from($data['status']);
        }
        if (array_key_exists('period', $data)) {
            $event->period = $data['period'];
        }
        if (array_key_exists('minute', $data)) {
            $event->minute = $data['minute'];
        }
        if (array_key_exists('extra_time_minute', $data)) {
            $event->extra_time_minute = $data['extra_time_minute'];
        }
        if (array_key_exists('score_home', $data)) {
            $event->score_home = $data['score_home'];
        }
        if (array_key_exists('score_away', $data)) {
            $event->score_away = $data['score_away'];
        }
        if (isset($data['publication_state'])) {
            $event->publication_state = PublicationState::from($data['publication_state']);
            if ($event->publication_state === PublicationState::Published) {
                $event->published_at = now();
                $event->suspended_at = null;
            }
            if ($event->publication_state === PublicationState::Suspended) {
                $event->suspended_at = now();
            }
        }
        if (array_key_exists('admin_locked', $data)) {
            $event->admin_locked = (bool) $data['admin_locked'];
        }

        if (! empty($data['start_clock']) || ! empty($data['stop_clock'])) {
            $this->scripts->pause($event);
        }
        if (! empty($data['start_clock'])) {
            $event->status = EventStatus::Live;
            $event->period = $event->period ?: '1H';
            $event->clock_started_at = now();
            $event->admin_locked = true;
        }
        if (! empty($data['stop_clock'])) {
            $clock = $event->liveClock();
            $event->minute = $clock['minute'];
            $event->extra_time_minute = $clock['extraTime'];
            $event->clock_started_at = null;
        }

        $event->save();

        $this->audit->log($request->user(), 'fixture.update', $request, [
            'public_id' => $event->public_id,
        ], SportEvent::class, $event->id);

        return ApiResponse::success([
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
        ]);
    }

    public function updateOdds(Request $request, string $id): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        $data = $request->validate([
            'selections' => ['required', 'array', 'min:1'],
            'selections.*.selection_public_id' => ['required', 'string'],
            'selections.*.decimal_odds' => ['required', 'numeric', 'min:1.01'],
            'selections.*.state' => ['nullable', 'in:open,suspended,closed'],
        ]);

        foreach ($data['selections'] as $row) {
            $selection = Selection::query()
                ->where('public_id', $row['selection_public_id'])
                ->whereHas('market', fn ($q) => $q->where('event_id', $event->id))
                ->first();
            if (! $selection) {
                continue;
            }
            $selection->decimal_odds = $row['decimal_odds'];
            $selection->odds_version = (int) $selection->odds_version + 1;
            if (isset($row['state'])) {
                $selection->state = $row['state'];
            }
            $selection->save();
        }

        $event->admin_locked = true;
        $event->save();

        $this->audit->log($request->user(), 'fixture.odds_update', $request, [
            'public_id' => $id,
        ], SportEvent::class, $event->id);

        return ApiResponse::success([
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
        ], 'Odds updated');
    }

    public function setResult(Request $request, string $id): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        $data = $request->validate([
            'result' => ['required', 'in:home,draw,away,void'],
            'score_home' => ['nullable', 'integer', 'min:0'],
            'score_away' => ['nullable', 'integer', 'min:0'],
        ]);

        $this->scripts->pause($event);
        $out = $this->fixtureSettlement->finishAndSettle(
            $event,
            $data['result'],
            array_key_exists('score_home', $data) ? (int) $data['score_home'] : null,
            array_key_exists('score_away', $data) ? (int) $data['score_away'] : null,
        );

        $this->audit->log($request->user(), 'fixture.set_result', $request, [
            'public_id' => $id,
            'result' => $data['result'],
            'bets_settled' => $out['betsSettled'],
        ], SportEvent::class, $event->id);

        return ApiResponse::success([
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
            'betsSettled' => $out['betsSettled'],
        ], 'Result set');
    }

    public function saveScript(Request $request, string $id): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        $data = $request->validate([
            'clock_mode' => ['nullable', 'in:sandbox,live'],
            'half_length_seconds' => ['nullable', 'integer', 'min:10', 'max:5400'],
            'first_half_seconds' => ['nullable', 'integer', 'min:10', 'max:5400'],
            'second_half_seconds' => ['nullable', 'integer', 'min:10', 'max:5400'],
            'ht_break_seconds' => ['nullable', 'integer', 'min:5', 'max:1800'],
            'et_first_seconds' => ['nullable', 'integer', 'min:0', 'max:1800'],
            'et_second_seconds' => ['nullable', 'integer', 'min:0', 'max:1800'],
            'et_break_seconds' => ['nullable', 'integer', 'min:0', 'max:900'],
            'penalties_enabled' => ['nullable', 'boolean'],
            'planned_result_side' => ['nullable', 'in:home,draw,away'],
            'planned_ht_score_home' => ['nullable', 'integer', 'min:0', 'max:20'],
            'planned_ht_score_away' => ['nullable', 'integer', 'min:0', 'max:20'],
            'planned_score_home' => ['required', 'integer', 'min:0', 'max:20'],
            'planned_score_away' => ['required', 'integer', 'min:0', 'max:20'],
            'planned_et_score_home' => ['nullable', 'integer', 'min:0', 'max:20'],
            'planned_et_score_away' => ['nullable', 'integer', 'min:0', 'max:20'],
            'planned_pen_outcome' => ['nullable', 'in:home,away,none'],
            'auto_settle' => ['nullable', 'boolean'],
            'goals' => ['nullable', 'array'],
            'goals.*.period' => ['required_with:goals', 'in:1H,2H,ET1,ET2'],
            'goals.*.minute' => ['required_with:goals', 'integer', 'min:0', 'max:45'],
            'goals.*.side' => ['required_with:goals', 'in:home,away'],
            'goals.*.player_id' => ['nullable', 'integer'],
        ]);

        try {
            $script = $this->scripts->upsertDraft($event, $data);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success([
            'script' => $script->toAdminArray(),
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
        ], 'Match script saved');
    }

    public function armScript(Request $request, string $id): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        try {
            $script = $this->scripts->arm($event);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log($request->user(), 'fixture.script_arm', $request, [
            'public_id' => $id,
        ], SportEvent::class, $event->id);

        return ApiResponse::success([
            'script' => $script->toAdminArray(),
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
        ], 'Match script armed');
    }

    public function players(string $id): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        $teamIds = array_filter([$event->home_team_id, $event->away_team_id]);
        $players = Player::query()
            ->whereIn('team_id', $teamIds)
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->groupBy('team_id');

        return ApiResponse::success([
            'home' => ($players[$event->home_team_id] ?? collect())->map(fn (Player $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'shirtNumber' => $p->shirt_number,
            ])->values(),
            'away' => ($players[$event->away_team_id] ?? collect())->map(fn (Player $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'shirtNumber' => $p->shirt_number,
            ])->values(),
        ]);
    }

    public function marketTemplates(): JsonResponse
    {
        return ApiResponse::success(['templates' => array_keys($this->markets->templates())]);
    }

    public function addMarket(Request $request, string $id): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        $data = $request->validate([
            'type' => ['required', 'in:1x2,double_chance,btts,over_under'],
            'line' => ['nullable', 'numeric', 'min:0.5', 'max:20'],
            'visible_to_customer' => ['nullable', 'boolean'],
        ]);

        try {
            $params = $data['type'] === 'over_under'
                ? ['line' => (float) ($data['line'] ?? 2.5)]
                : null;
            $this->markets->addMarket(
                $event,
                $data['type'],
                $params,
                (bool) ($data['visible_to_customer'] ?? true)
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log($request->user(), 'fixture.market_add', $request, [
            'public_id' => $id,
            'type' => $data['type'],
        ], SportEvent::class, $event->id);

        return ApiResponse::success([
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
        ], 'Market added', 201);
    }

    public function updateMarket(Request $request, string $id, string $marketId): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }
        $market = $event->markets->firstWhere('public_id', $marketId);
        if (! $market) {
            return ApiResponse::error('Market not found', 404);
        }

        $data = $request->validate([
            'status' => ['nullable', 'in:open,suspended,closed'],
            'visible_to_customer' => ['nullable', 'boolean'],
            'selections' => ['nullable', 'array'],
            'selections.*.selection_public_id' => ['required_with:selections', 'string'],
            'selections.*.state' => ['nullable', 'in:open,suspended,closed'],
            'selections.*.decimal_odds' => ['nullable', 'numeric', 'min:1.01'],
        ]);

        if (array_key_exists('status', $data)) {
            $market->status = $data['status'];
        }
        if (array_key_exists('visible_to_customer', $data)) {
            $market->visible_to_customer = (bool) $data['visible_to_customer'];
        }
        $market->save();

        foreach ($data['selections'] ?? [] as $row) {
            $sel = $market->selections->firstWhere('public_id', $row['selection_public_id']);
            if (! $sel) {
                continue;
            }
            if (isset($row['decimal_odds'])) {
                $sel->decimal_odds = $row['decimal_odds'];
                $sel->odds_version = (int) $sel->odds_version + 1;
            }
            if (isset($row['state'])) {
                $sel->state = $row['state'];
            }
            $sel->save();
        }

        $event->admin_locked = true;
        $event->save();

        return ApiResponse::success([
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
        ], 'Market updated');
    }

    public function removeMarket(Request $request, string $id, string $marketId): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }
        $market = $event->markets->firstWhere('public_id', $marketId);
        if (! $market) {
            return ApiResponse::error('Market not found', 404);
        }
        if ($market->is_main || $market->type === '1x2') {
            return ApiResponse::error('Cannot remove main 1X2 market.', 422);
        }

        $market->status = 'closed';
        $market->visible_to_customer = false;
        $market->save();
        foreach ($market->selections as $sel) {
            $sel->state = 'closed';
            $sel->save();
        }

        $this->audit->log($request->user(), 'fixture.market_remove', $request, [
            'public_id' => $id,
            'market_id' => $marketId,
        ], SportEvent::class, $event->id);

        return ApiResponse::success([
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
        ], 'Market hidden from customers');
    }

    public function publish(Request $request, string $id): JsonResponse
    {
        $request->merge(['publication_state' => 'published', 'admin_locked' => true]);

        return $this->update($request, $id);
    }

    public function suspend(Request $request, string $id): JsonResponse
    {
        $request->merge(['publication_state' => 'suspended', 'admin_locked' => true]);

        return $this->update($request, $id);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $event = $this->find($id);
        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        $openBets = \App\Models\Bet::query()
            ->where('status', 'open')
            ->whereHas('selections', fn ($q) => $q->where('event_id', $event->id))
            ->count();

        if ($openBets > 0) {
            return ApiResponse::error("Cannot delete fixture with {$openBets} open bet(s). Settle or void first.", 422);
        }

        $event->status = EventStatus::Cancelled;
        $event->publication_state = PublicationState::Suspended;
        $event->admin_locked = true;
        $event->clock_started_at = null;
        $event->save();

        foreach ($event->markets as $market) {
            $market->status = 'suspended';
            $market->save();
            foreach ($market->selections as $selection) {
                $selection->state = 'suspended';
                $selection->save();
            }
        }

        $this->audit->log($request->user(), 'fixture.delete', $request, [
            'public_id' => $id,
        ], SportEvent::class, $event->id);

        return ApiResponse::success([
            'fixture' => $this->detail($event->fresh(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])),
        ], 'Fixture removed from catalogue');
    }

    private function find(string $id): ?SportEvent
    {
        return SportEvent::query()
            ->where('public_id', $id)
            ->with(['competition', 'homeTeam', 'awayTeam', 'markets.selections'])
            ->first();
    }

    private function upsertTeam(Sport $sport, string $name, ?string $short): Team
    {
        $slug = Str::slug($name).'-'.Str::lower(Str::random(4));

        return Team::query()->create([
            'sport_id' => $sport->id,
            'slug' => $slug,
            'name' => $name,
            'short_name' => strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $short ?: $name) ?: 'TM', 0, 3)),
            'provider_team_id' => 'custom:'.$slug,
        ]);
    }

    private function summary(SportEvent $e): array
    {
        $clock = $e->liveClock();

        return [
            'id' => $e->public_id,
            'competition' => $e->competition?->name,
            'competitionId' => $e->competition_id,
            'country' => $e->competition?->country,
            'home' => $e->displayHomeName(),
            'away' => $e->displayAwayName(),
            'kickoffIso' => $e->kickoff_at?->utc()->toIso8601String(),
            'endsAtIso' => $e->ends_at?->utc()->toIso8601String(),
            'status' => $e->status->value,
            'period' => $clock['period'],
            'minute' => $clock['minute'],
            'extraTime' => $clock['extraTime'],
            'publicationState' => $e->publication_state->value,
            'providerEventId' => $e->provider_event_id,
            'providerSource' => $e->provider_source,
            'adminLocked' => (bool) $e->admin_locked,
            'resultSide' => $e->result_side,
            'score' => [
                'home' => $e->score_home,
                'away' => $e->score_away,
            ],
        ];
    }

    private function detail(SportEvent $e): array
    {
        $script = EventScript::query()->where('event_id', $e->id)->with('timeline')->first();

        return array_merge($this->summary($e), [
            'homeShort' => $e->displayHomeShort(),
            'awayShort' => $e->displayAwayShort(),
            'clockStartedAt' => $e->clock_started_at?->utc()->toIso8601String(),
            'script' => $script?->toAdminArray(),
            'markets' => $e->markets->map(fn ($m) => [
                'id' => $m->public_id,
                'name' => $m->name,
                'type' => $m->type ?? '1x2',
                'params' => $m->params,
                'status' => $m->status,
                'visibleToCustomer' => (bool) $m->visible_to_customer,
                'isMain' => $m->is_main,
                'selections' => $m->selections->map(fn (Selection $s) => [
                    'selectionId' => $s->public_id,
                    'label' => $s->label,
                    'side' => $s->side,
                    'outcomeKey' => $s->outcome_key,
                    'decimalOdds' => (float) $s->decimal_odds,
                    'state' => $s->state,
                    'oddsVersion' => $s->odds_version,
                ])->values(),
            ])->values(),
        ]);
    }
}
