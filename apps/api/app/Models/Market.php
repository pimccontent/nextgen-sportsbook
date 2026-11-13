<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Market extends Model
{
    protected $fillable = [
        'event_id',
        'public_id',
        'name',
        'type',
        'params',
        'status',
        'visible_to_customer',
        'is_main',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_main' => 'boolean',
            'visible_to_customer' => 'boolean',
            'params' => 'array',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(SportEvent::class, 'event_id');
    }

    public function selections(): HasMany
    {
        return $this->hasMany(Selection::class)->orderBy('id');
    }
}
