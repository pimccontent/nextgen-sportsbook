<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSetting extends Model
{
    protected $fillable = ['tenant_id', 'group', 'payload', 'version'];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'version' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
