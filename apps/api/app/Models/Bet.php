<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bet extends Model
{
    protected $fillable = [
        'tenant_id',
        'user_id',
        'wallet_id',
        'public_id',
        'type',
        'status',
        'stake_minor',
        'potential_return_minor',
        'combined_odds',
        'idempotency_key',
        'placed_at',
        'settled_at',
    ];

    protected function casts(): array
    {
        return [
            'stake_minor' => 'integer',
            'potential_return_minor' => 'integer',
            'combined_odds' => 'float',
            'placed_at' => 'datetime',
            'settled_at' => 'datetime',
        ];
    }

    public function selections(): HasMany
    {
        return $this->hasMany(BetSelection::class);
    }
}
