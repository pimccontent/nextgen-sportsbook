<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Banner extends Model
{
    protected $fillable = [
        'tenant_id',
        'public_id',
        'title',
        'subtitle',
        'image_url',
        'cta_label',
        'cta_url',
        'sort_order',
        'is_active',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scopeCustomerVisible(Builder $query): Builder
    {
        $now = now();

        return $query
            ->where('is_active', true)
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>', $now);
            })
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->public_id,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'imageUrl' => $this->image_url,
            'ctaLabel' => $this->cta_label,
            'ctaUrl' => $this->cta_url,
            'sortOrder' => $this->sort_order,
        ];
    }

    public function toAdminArray(): array
    {
        return [
            'id' => $this->public_id,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'imageUrl' => $this->image_url,
            'ctaLabel' => $this->cta_label,
            'ctaUrl' => $this->cta_url,
            'sortOrder' => $this->sort_order,
            'isActive' => $this->is_active,
            'startsAt' => $this->starts_at?->utc()->toIso8601String(),
            'endsAt' => $this->ends_at?->utc()->toIso8601String(),
        ];
    }
}
