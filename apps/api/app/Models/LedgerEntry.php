<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LedgerEntry extends Model
{
    protected $fillable = [
        'journal_id',
        'ledger_account_id',
        'wallet_id',
        'debit_minor',
        'credit_minor',
    ];

    protected function casts(): array
    {
        return [
            'debit_minor' => 'integer',
            'credit_minor' => 'integer',
        ];
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(LedgerJournal::class, 'journal_id');
    }
}
