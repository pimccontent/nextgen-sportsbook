<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingCode extends Model
{
    protected $fillable = [
        'tenant_id',
        'code',
        'created_by_user_id',
        'creator_role',
        'legs',
        'listed',
        'status',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'legs' => 'array',
            'listed' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function isLoadable(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }
        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }

    public function toPublicArray(): array
    {
        return [
            'code' => $this->code,
            'legsCount' => count($this->legs ?? []),
            'createdAt' => $this->created_at?->utc()->toIso8601String(),
            'expiresAt' => $this->expires_at?->utc()->toIso8601String(),
        ];
    }

    public function toDetailArray(): array
    {
        return [
            'code' => $this->code,
            'listed' => $this->listed,
            'status' => $this->status,
            'legs' => $this->legs,
            'creatorRole' => $this->creator_role,
            'createdAt' => $this->created_at?->utc()->toIso8601String(),
            'expiresAt' => $this->expires_at?->utc()->toIso8601String(),
        ];
    }
}
