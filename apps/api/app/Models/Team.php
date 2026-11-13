<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Team extends Model
{
    protected $fillable = [
        'sport_id',
        'slug',
        'name',
        'short_name',
        'provider_team_id',
    ];

    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }
}
