<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

final class AuditLogger
{
    public function log(?User $actor, string $action, Request $request, array $meta = [], ?string $subjectType = null, ?int $subjectId = null): void
    {
        AuditLog::query()->create([
            'actor_user_id' => $actor?->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
            'meta' => $meta,
        ]);
    }
}
