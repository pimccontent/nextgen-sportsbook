<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Agent extends Model
{
    protected $fillable = [
        'user_id',
        'referral_code',
        'parent_agent_id',
        'status',
        'can_create_booking_codes',
        'payout_method',
        'payout_network',
        'payout_account',
        'payout_account_name',
    ];

    protected function casts(): array
    {
        return [
            'can_create_booking_codes' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_agent_id');
    }
}
