<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class TenantSecret extends Model
{
    protected $fillable = ['tenant_id', 'key', 'value_encrypted', 'hint'];

    protected $hidden = ['value_encrypted'];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function setPlainValue(string $plain): void
    {
        $this->value_encrypted = Crypt::encryptString($plain);
        $this->hint = strlen($plain) > 4 ? substr($plain, -4) : '****';
    }

    public function plainValue(): ?string
    {
        if ($this->value_encrypted === null || $this->value_encrypted === '') {
            return null;
        }

        return Crypt::decryptString($this->value_encrypted);
    }
}
