<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Competition extends Model
{
    protected $fillable = [
        'sport_id',
        'slug',
        'name',
        'country',
        'season_label',
        'status',
        'provider_competition_id',
    ];

    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(SportEvent::class, 'competition_id');
    }
}
