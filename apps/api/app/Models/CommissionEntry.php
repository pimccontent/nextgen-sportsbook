<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissionEntry extends Model
{
    protected $fillable = [
        'tenant_id',
        'agent_id',
        'source',
        'bet_id',
        'payment_intent_id',
        'status',
        'basis_minor',
        'rate_bps',
        'amount_minor',
        'hold_until',
    ];

    protected function casts(): array
    {
        return [
            'basis_minor' => 'integer',
            'rate_bps' => 'integer',
            'amount_minor' => 'integer',
            'hold_until' => 'datetime',
        ];
    }

    public function paymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class);
    }

    public function bet(): BelongsTo
    {
        return $this->belongsTo(Bet::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
