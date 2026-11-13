<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wallet extends Model
{
    protected $fillable = [
        'tenant_id',
        'user_id',
        'currency',
        'available_minor',
        'pending_minor',
        'reserved_minor',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'available_minor' => 'integer',
            'pending_minor' => 'integer',
            'reserved_minor' => 'integer',
            'version' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
