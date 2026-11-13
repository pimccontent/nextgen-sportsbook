<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventScriptEvent extends Model
{
    protected $fillable = [
        'script_id',
        'seq',
        'type',
        'at_period',
        'at_elapsed_seconds',
        'side',
        'player_id',
        'player_name_snapshot',
        'to_period',
        'applied_at',
    ];

    protected function casts(): array
    {
        return [
            'seq' => 'integer',
            'at_elapsed_seconds' => 'integer',
            'applied_at' => 'datetime',
        ];
    }

    public function script(): BelongsTo
    {
        return $this->belongsTo(EventScript::class, 'script_id');
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}
