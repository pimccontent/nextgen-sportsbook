<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LedgerJournal extends Model
{
    protected $fillable = [
        'tenant_id',
        'idempotency_key',
        'type',
        'reference_type',
        'reference_id',
        'currency',
        'memo',
        'posted_at',
    ];

    protected function casts(): array
    {
        return ['posted_at' => 'datetime'];
    }

    public function entries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class, 'journal_id');
    }
}
