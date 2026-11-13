<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PaymentIntent extends Model
{
    protected $fillable = [
        'tenant_id',
        'user_id',
        'wallet_id',
        'provider',
        'direction',
        'status',
        'amount_minor',
        'currency',
        'idempotency_key',
        'provider_reference',
        'authorization_url',
        'provider_payload',
        'completed_at',
        'commissionable',
        'commission_decided_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'provider_payload' => 'array',
            'completed_at' => 'datetime',
            'commissionable' => 'boolean',
            'commission_decided_at' => 'datetime',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function commissionEntry(): HasOne
    {
        return $this->hasOne(CommissionEntry::class);
    }
}
