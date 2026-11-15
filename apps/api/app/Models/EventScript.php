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
        'first_half_seconds',
        'second_half_seconds',
        'ht_break_seconds',
        'et_first_seconds',
        'et_second_seconds',
        'et_break_seconds',
        'penalties_enabled',
        'planned_result_side',
        'planned_ht_score_home',
        'planned_ht_score_away',
        'planned_score_home',
        'planned_score_away',
        'planned_et_score_home',
        'planned_et_score_away',
        'planned_pen_outcome',
        'auto_settle',
        'armed_at',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'auto_settle' => 'boolean',
            'penalties_enabled' => 'boolean',
            'half_length_seconds' => 'integer',
            'first_half_seconds' => 'integer',
            'second_half_seconds' => 'integer',
            'ht_break_seconds' => 'integer',
            'et_first_seconds' => 'integer',
            'et_second_seconds' => 'integer',
            'et_break_seconds' => 'integer',
            'planned_ht_score_home' => 'integer',
            'planned_ht_score_away' => 'integer',
            'planned_score_home' => 'integer',
            'planned_score_away' => 'integer',
            'planned_et_score_home' => 'integer',
            'planned_et_score_away' => 'integer',
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
            'firstHalfSeconds' => $this->first_half_seconds ?? $this->half_length_seconds,
            'secondHalfSeconds' => $this->second_half_seconds ?? $this->half_length_seconds,
            'htBreakSeconds' => $this->ht_break_seconds,
            'etFirstSeconds' => $this->et_first_seconds ?? 0,
            'etSecondSeconds' => $this->et_second_seconds ?? 0,
            'etBreakSeconds' => $this->et_break_seconds ?? 0,
            'penaltiesEnabled' => (bool) $this->penalties_enabled,
            'plannedResultSide' => $this->planned_result_side,
            'plannedHtScoreHome' => $this->planned_ht_score_home ?? 0,
            'plannedHtScoreAway' => $this->planned_ht_score_away ?? 0,
            'plannedScoreHome' => $this->planned_score_home,
            'plannedScoreAway' => $this->planned_score_away,
            'plannedEtScoreHome' => $this->planned_et_score_home,
            'plannedEtScoreAway' => $this->planned_et_score_away,
            'plannedPenOutcome' => $this->planned_pen_outcome,
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
