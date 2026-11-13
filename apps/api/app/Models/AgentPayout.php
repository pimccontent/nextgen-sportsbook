<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentPayout extends Model
{
    protected $fillable = [
        'tenant_id',
        'agent_id',
        'public_id',
        'status',
        'amount_minor',
        'currency',
        'idempotency_key',
        'payout_method',
        'payout_network',
        'payout_account',
        'payout_account_name',
        'admin_note',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'processed_at' => 'datetime',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
