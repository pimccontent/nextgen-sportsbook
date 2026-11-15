<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\Competition;
use App\Models\Sport;
use App\Services\AuditLogger;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class CompetitionsAdminController
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function index(): JsonResponse
    {
        $rows = Competition::query()
            ->with('sport')
            ->withCount('events')
            ->orderBy('name')
            ->get()
            ->map(fn (Competition $c) => $this->payload($c));

        return ApiResponse::success(['competitions' => $rows->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'country' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', 'in:active,inactive'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $sport = Sport::query()->firstOrCreate(
            ['slug' => 'football'],
            ['name' => 'Football', 'status' => 'active']
        );

        $slugBase = Str::slug($data['name']) ?: 'competition';
        $slug = $slugBase;
        $i = 1;
        while (Competition::query()->where('slug', $slug)->exists()) {
            $slug = $slugBase.'-'.$i++;
        }

        $comp = Competition::query()->create([
            'sport_id' => $sport->id,
            'slug' => $slug,
            'name' => $data['name'],
            'country' => $data['country'] ?? 'International',
            'status' => $data['status'] ?? 'active',
            'provider_competition_id' => 'admin:'.$slug,
        ]);

        $this->audit->log($request->user(), 'competition.create', $request, [
            'id' => $comp->id,
        ], Competition::class, $comp->id);

        return ApiResponse::success(['competition' => $this->payload($comp->loadCount('events'))], 'Created', 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $comp = Competition::query()->find($id);
        if (! $comp) {
            return ApiResponse::error('Not found', 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'country' => ['nullable', 'string', 'max:80'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        $comp->fill($data);
        $comp->save();

        $this->audit->log($request->user(), 'competition.update', $request, [
            'id' => $comp->id,
        ], Competition::class, $comp->id);

        return ApiResponse::success(['competition' => $this->payload($comp->loadCount('events'))], 'Updated');
    }

    private function payload(Competition $c): array
    {
        return [
            'id' => $c->id,
            'slug' => $c->slug,
            'name' => $c->name,
            'country' => $c->country,
            'status' => $c->status,
            'eventsCount' => $c->events_count ?? $c->events()->count(),
            'sport' => $c->sport?->slug ?? 'football',
        ];
    }
}
