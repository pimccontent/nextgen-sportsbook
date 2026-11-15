<?php

namespace App\Services;

use App\Models\BookingCode;
use App\Models\Market;
use App\Models\Selection;
use App\Models\SportEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class BookingCodeService
{
    /**
     * @param  list<array{selection_public_id: string}>  $selectionIds
     */
    public function create(
        User $user,
        string $creatorRole,
        array $selectionIds,
        bool $listed = true,
        ?\DateTimeInterface $expiresAt = null,
    ): BookingCode {
        if ($selectionIds === []) {
            throw new InvalidArgumentException('Add at least one selection.');
        }
        if (count($selectionIds) > 20) {
            throw new InvalidArgumentException('Maximum 20 legs per booking code.');
        }

        $legs = [];
        $seenFixtures = [];
        foreach ($selectionIds as $row) {
            $publicId = $row['selection_public_id'] ?? null;
            if (! is_string($publicId) || $publicId === '') {
                throw new InvalidArgumentException('Invalid selection.');
            }
            $selection = Selection::query()
                ->where('public_id', $publicId)
                ->with(['market.event.homeTeam', 'market.event.awayTeam', 'market.event.competition'])
                ->first();
            if (! $selection || ! $selection->market) {
                throw new InvalidArgumentException("Selection not found: {$publicId}");
            }
            /** @var Market $market */
            $market = $selection->market;
            /** @var SportEvent|null $event */
            $event = $market->event;
            if (! $event) {
                throw new InvalidArgumentException('Selection event missing.');
            }
            if (isset($seenFixtures[$event->id])) {
                throw new InvalidArgumentException('Only one selection per fixture is allowed.');
            }
            $seenFixtures[$event->id] = true;

            $legs[] = [
                'selectionPublicId' => $selection->public_id,
                'fixtureId' => $event->public_id,
                'fixtureLabel' => trim(($event->homeTeam?->name ?? 'Home').' vs '.($event->awayTeam?->name ?? 'Away')),
                'marketName' => $market->name,
                'label' => $selection->label,
                'side' => $selection->side,
                'decimalOdds' => (float) $selection->decimal_odds,
                'competitionName' => $event->competition?->name,
            ];
        }

        $tenant = Tenant::default();
        for ($i = 0; $i < 8; $i++) {
            $code = strtoupper(Str::random(8));
            if (! BookingCode::query()->where('code', $code)->exists()) {
                return BookingCode::query()->create([
                    'tenant_id' => $tenant->id,
                    'code' => $code,
                    'created_by_user_id' => $user->id,
                    'creator_role' => $creatorRole,
                    'legs' => $legs,
                    'listed' => $listed,
                    'status' => 'active',
                    'expires_at' => $expiresAt,
                ]);
            }
        }

        throw new InvalidArgumentException('Could not allocate booking code.');
    }

    public function resolve(string $code): BookingCode
    {
        $row = BookingCode::query()->where('code', strtoupper(trim($code)))->first();
        if (! $row || ! $row->isLoadable()) {
            throw new InvalidArgumentException('Booking code not found or expired.');
        }

        return $row;
    }

    /**
     * @return list<BookingCode>
     */
    public function listedPublic(int $limit = 50): array
    {
        return BookingCode::query()
            ->where('tenant_id', Tenant::default()->id)
            ->where('listed', true)
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->all();
    }
}
