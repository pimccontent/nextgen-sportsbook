<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EventStatus;
use App\Http\Resources\FixtureResource;
use App\Models\SportEvent;
use App\Services\LiveFixtureLifecycle;
use App\Shared\Http\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class FixturesController
{
    public function __construct(
        private readonly LiveFixtureLifecycle $liveLifecycle,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->liveLifecycle->syncDueEvents();

        $status = $request->query('status');
        $competition = $request->query('competition_id');

        $query = SportEvent::query()
            ->customerVisible()
            ->with([
                'competition',
                'homeTeam',
                'awayTeam',
                'markets' => fn ($q) => $q->orderBy('sort_order'),
                'markets.selections',
            ]);

        if ($status === 'live') {
            $query->where('status', EventStatus::Live)->orderBy('kickoff_at');
        } elseif ($status === 'upcoming') {
            $query->where('status', EventStatus::Upcoming)->orderBy('kickoff_at');
        } elseif ($status === 'finished' || $status === 'played') {
            [$startUtc, $endUtc] = $this->accraDayBoundsUtc();
            $query->where('status', EventStatus::Finished)
                ->whereBetween('kickoff_at', [$startUtc, $endUtc])
                ->orderByDesc('kickoff_at');
        } else {
            // Lobby: upcoming → live → played-today, each group by kickoff.
            [$startUtc, $endUtc] = $this->accraDayBoundsUtc();
            $query->where(function ($q) use ($startUtc, $endUtc) {
                $q->whereIn('status', [EventStatus::Upcoming, EventStatus::Live])
                    ->orWhere(function ($q2) use ($startUtc, $endUtc) {
                        $q2->where('status', EventStatus::Finished)
                            ->whereBetween('kickoff_at', [$startUtc, $endUtc]);
                    });
            })
                ->orderByRaw("case status when 'live' then 0 when 'upcoming' then 1 when 'finished' then 2 else 3 end")
                ->orderBy('kickoff_at');
        }

        if (is_string($competition) && $competition !== '' && $competition !== 'all') {
            $query->whereHas('competition', fn ($q) => $q->where('slug', $competition));
        }

        $fixtures = $query->get()->map(fn (SportEvent $e) => (new FixtureResource($e))->resolve());

        return ApiResponse::success(['fixtures' => $fixtures->values()]);
    }

    public function show(string $id): JsonResponse
    {
        $this->liveLifecycle->syncDueEvents();

        $event = SportEvent::query()
            ->customerVisible()
            ->where('public_id', $id)
            ->with([
                'competition',
                'homeTeam',
                'awayTeam',
                'markets' => fn ($q) => $q->orderBy('sort_order'),
                'markets.selections',
            ])
            ->first();

        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        return ApiResponse::success([
            'fixture' => (new FixtureResource($event))->resolve(),
        ]);
    }

    public function markets(string $id): JsonResponse
    {
        $event = SportEvent::query()
            ->customerVisible()
            ->where('public_id', $id)
            ->with(['markets.selections', 'markets.event'])
            ->first();

        if (! $event) {
            return ApiResponse::error('Fixture not found', 404);
        }

        $markets = $event->markets
            ->filter(fn ($m) => $m->visible_to_customer && $m->status === 'open')
            ->map(fn ($m) => FixtureResource::marketPayload($m))
            ->values();

        return ApiResponse::success(['markets' => $markets]);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function accraDayBoundsUtc(): array
    {
        $start = Carbon::now('Africa/Accra')->startOfDay()->utc();
        $end = Carbon::now('Africa/Accra')->endOfDay()->utc();

        return [$start, $end];
    }
}
