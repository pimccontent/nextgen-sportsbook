<?php

namespace App\Models;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SportEvent extends Model
{
    protected $table = 'events';

    protected $fillable = [
        'public_id',
        'competition_id',
        'home_team_id',
        'away_team_id',
        'home_name_override',
        'away_name_override',
        'home_short_override',
        'away_short_override',
        'kickoff_at',
        'ends_at',
        'timezone',
        'status',
        'minute',
        'clock_started_at',
        'period',
        'extra_time_minute',
        'score_home',
        'score_away',
        'result_side',
        'admin_locked',
        'publication_state',
        'provider_event_id',
        'provider_source',
        'provider_ingested_at',
        'published_at',
        'suspended_at',
    ];

    protected function casts(): array
    {
        return [
            'kickoff_at' => 'datetime',
            'ends_at' => 'datetime',
            'clock_started_at' => 'datetime',
            'provider_ingested_at' => 'datetime',
            'published_at' => 'datetime',
            'suspended_at' => 'datetime',
            'status' => EventStatus::class,
            'publication_state' => PublicationState::class,
            'admin_locked' => 'boolean',
        ];
    }

    public function competition(): BelongsTo
    {
        return $this->belongsTo(Competition::class);
    }

    public function homeTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'home_team_id');
    }

    public function awayTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'away_team_id');
    }

    public function markets(): HasMany
    {
        return $this->hasMany(Market::class, 'event_id')->orderBy('sort_order');
    }

    public function scopeCustomerVisible(Builder $query): Builder
    {
        return $query->where('publication_state', PublicationState::Published);
    }

    public function displayHomeName(): string
    {
        return $this->home_name_override ?: (string) $this->homeTeam?->name;
    }

    public function displayAwayName(): string
    {
        return $this->away_name_override ?: (string) $this->awayTeam?->name;
    }

    public function displayHomeShort(): string
    {
        return $this->home_short_override ?: (string) $this->homeTeam?->short_name;
    }

    public function displayAwayShort(): string
    {
        return $this->away_short_override ?: (string) $this->awayTeam?->short_name;
    }

    /**
     * Effective match clock for live display.
     *
     * @return array{minute: int|null, period: string|null, extraTime: int|null}
     */
    public function liveClock(): array
    {
        $minute = $this->minute;
        $period = $this->period;
        $extra = $this->extra_time_minute;

        if ($this->status === EventStatus::Live && $this->clock_started_at) {
            $elapsed = max(0, (int) $this->clock_started_at->diffInMinutes(now()));
            $base = match ($this->period) {
                '2H' => 45,
                'ET1' => 90,
                'ET2' => 105,
                default => 0,
            };
            $computed = $base + $elapsed;
            $cap = match ($this->period) {
                '1H' => 45,
                '2H' => 90,
                'ET1' => 105,
                'ET2' => 120,
                default => 120,
            };
            if ($computed > $cap) {
                $extra = $computed - $cap;
                $minute = $cap;
            } else {
                $minute = $computed;
                $extra = 0;
            }
        }

        return [
            'minute' => $minute,
            'period' => $period,
            'extraTime' => $extra,
        ];
    }
}
