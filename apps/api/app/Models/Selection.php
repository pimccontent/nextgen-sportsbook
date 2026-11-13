<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Selection extends Model
{
    protected $fillable = [
        'market_id',
        'public_id',
        'label',
        'side',
        'outcome_key',
        'decimal_odds',
        'state',
        'movement',
        'odds_version',
    ];

    protected function casts(): array
    {
        return [
            'decimal_odds' => 'float',
            'odds_version' => 'integer',
        ];
    }

    public function market(): BelongsTo
    {
        return $this->belongsTo(Market::class);
    }
}
