<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $fillable = ['slug', 'name', 'status'];

    public function settings(): HasMany
    {
        return $this->hasMany(TenantSetting::class);
    }

    public function secrets(): HasMany
    {
        return $this->hasMany(TenantSecret::class);
    }

    public static function default(): self
    {
        return static::query()->where('slug', 'default')->firstOrFail();
    }
}
