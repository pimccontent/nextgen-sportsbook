<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BetSelection extends Model
{
    protected $fillable = [
        'bet_id',
        'event_id',
        'market_id',
        'selection_id',
        'event_public_id',
        'selection_public_id',
        'label',
        'market_name',
        'accepted_odds',
        'odds_version',
        'result',
    ];

    protected function casts(): array
    {
        return [
            'accepted_odds' => 'float',
            'odds_version' => 'integer',
        ];
    }
}
