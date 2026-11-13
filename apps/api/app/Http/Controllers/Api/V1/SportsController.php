<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use App\Models\Competition;
use App\Models\Sport;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;

final class SportsController
{
    public function index(): JsonResponse
    {
        $sports = Sport::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['slug', 'name', 'status']);

        return ApiResponse::success([
            'sports' => $sports->map(fn (Sport $s) => [
                'id' => $s->slug,
                'name' => $s->name,
                'status' => $s->status,
            ])->values(),
        ]);
    }

    public function competitions(): JsonResponse
    {
        $sportSlug = request()->query('sport', 'football');
        $activeOnly = filter_var(request()->query('active_fixtures', true), FILTER_VALIDATE_BOOLEAN);
        $statusParam = request()->query('status');

        $query = Competition::query()
            ->where('status', 'active')
            ->whereHas('sport', fn ($q) => $q->where('slug', $sportSlug)->where('status', 'active'));

        $statusFilter = null;
        if (is_string($statusParam) && $statusParam !== '') {
            $statusFilter = match ($statusParam) {
                'upcoming' => [EventStatus::Upcoming],
                'live' => [EventStatus::Live],
                'finished', 'played' => [EventStatus::Finished],
                'active' => [EventStatus::Upcoming, EventStatus::Live],
                default => null,
            };
        } elseif ($activeOnly) {
            $statusFilter = [EventStatus::Upcoming, EventStatus::Live];
        }

        if ($statusFilter !== null) {
            $playedToday = is_string($statusParam)
                && in_array($statusParam, ['finished', 'played'], true);
            $startUtc = $playedToday
                ? \Carbon\Carbon::now('Africa/Accra')->startOfDay()->utc()
                : null;
            $endUtc = $playedToday
                ? \Carbon\Carbon::now('Africa/Accra')->endOfDay()->utc()
                : null;

            $query->whereHas('events', function ($q) use ($statusFilter, $playedToday, $startUtc, $endUtc) {
                $q->where('publication_state', PublicationState::Published)
                    ->whereIn('status', $statusFilter);
                if ($playedToday && $startUtc && $endUtc) {
                    $q->whereBetween('kickoff_at', [$startUtc, $endUtc]);
                }
            });
        }

        $competitions = $query->orderBy('name')->get();

        return ApiResponse::success([
            'competitions' => $competitions->map(fn (Competition $c) => [
                'id' => $c->slug,
                'name' => $c->name,
                'country' => $c->country,
                'sport' => $sportSlug,
            ])->values(),
        ]);
    }
}
