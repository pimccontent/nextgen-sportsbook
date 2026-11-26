<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportConversation extends Model
{
    protected $fillable = [
        'tenant_id',
        'customer_user_id',
        'assigned_admin_id',
        'status',
        'subject',
        'unread_customer',
        'unread_admin',
        'last_message_at',
        'last_message_preview',
        'last_message_role',
    ];

    protected function casts(): array
    {
        return [
            'unread_customer' => 'integer',
            'unread_admin' => 'integer',
            'last_message_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_admin_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'conversation_id');
    }
}
