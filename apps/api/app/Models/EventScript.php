<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventScript extends Model
{
    protected $fillable = [
        'event_id',
        'status',
        'clock_mode',
        'half_length_seconds',
        'ht_break_seconds',
        'planned_result_side',
        'planned_score_home',
        'planned_score_away',
        'auto_settle',
        'armed_at',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'auto_settle' => 'boolean',
            'half_length_seconds' => 'integer',
            'ht_break_seconds' => 'integer',
            'planned_score_home' => 'integer',
            'planned_score_away' => 'integer',
            'armed_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(SportEvent::class, 'event_id');
    }

    public function timeline(): HasMany
    {
        return $this->hasMany(EventScriptEvent::class, 'script_id')->orderBy('seq');
    }

    public function toAdminArray(): array
    {
        return [
            'status' => $this->status,
            'clockMode' => $this->clock_mode,
            'halfLengthSeconds' => $this->half_length_seconds,
            'htBreakSeconds' => $this->ht_break_seconds,
            'plannedResultSide' => $this->planned_result_side,
            'plannedScoreHome' => $this->planned_score_home,
            'plannedScoreAway' => $this->planned_score_away,
            'autoSettle' => $this->auto_settle,
            'armedAt' => $this->armed_at?->utc()->toIso8601String(),
            'startedAt' => $this->started_at?->utc()->toIso8601String(),
            'completedAt' => $this->completed_at?->utc()->toIso8601String(),
            'events' => $this->timeline->map(fn (EventScriptEvent $e) => [
                'seq' => $e->seq,
                'type' => $e->type,
                'atPeriod' => $e->at_period,
                'atElapsedSeconds' => $e->at_elapsed_seconds,
                'side' => $e->side,
                'playerId' => $e->player_id,
                'playerName' => $e->player_name_snapshot,
                'toPeriod' => $e->to_period,
                'appliedAt' => $e->applied_at?->utc()->toIso8601String(),
            ])->values()->all(),
        ];
    }
}
