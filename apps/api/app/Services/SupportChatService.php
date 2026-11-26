<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

final class SupportChatService
{
    public function __construct(private readonly TenantSettingsService $settings)
    {
    }

    /** @return array<string, mixed> */
    public function config(Tenant $tenant): array
    {
        $payload = $this->settings->getGroup($tenant, 'support_chat')['payload'] ?? [];
        $branding = $this->settings->getGroup($tenant, 'branding')['payload'] ?? [];

        $enabled = (bool) ($payload['enabled'] ?? false);
        // Legacy branding flag also turns chat on.
        if (! $enabled && (bool) ($branding['support_chat_enabled'] ?? false)) {
            $enabled = true;
        }

        $canned = $payload['canned_replies'] ?? [];
        if (! is_array($canned)) {
            $canned = [];
        }
        $canned = array_values(array_filter(array_map(function ($row) {
            if (! is_array($row)) {
                return null;
            }
            $title = trim((string) ($row['title'] ?? ''));
            $body = trim((string) ($row['body'] ?? ''));
            if ($title === '' || $body === '') {
                return null;
            }

            return [
                'id' => (string) ($row['id'] ?? md5($title.$body)),
                'title' => mb_substr($title, 0, 80),
                'body' => mb_substr($body, 0, 2000),
            ];
        }, $canned)));

        $withinHours = $this->withinBusinessHours($payload);

        return [
            'enabled' => $enabled,
            'widgetEnabled' => (bool) ($payload['widget_enabled'] ?? true),
            'title' => (string) ($payload['title'] ?? ($branding['support_chat_label'] ?? 'Live support')),
            'subtitle' => (string) ($payload['subtitle'] ?? 'We typically reply within a few minutes'),
            'greeting' => (string) ($payload['greeting'] ?? 'Hi! How can we help you today?'),
            'offlineMessage' => (string) ($payload['offline_message'] ?? 'Our team is currently offline. Leave a message and we will reply when we are back.'),
            'allowCustomerReopen' => (bool) ($payload['allow_customer_reopen'] ?? false),
            'businessHoursEnabled' => (bool) ($payload['business_hours_enabled'] ?? false),
            'businessHoursStart' => (string) ($payload['business_hours_start'] ?? '09:00'),
            'businessHoursEnd' => (string) ($payload['business_hours_end'] ?? '21:00'),
            'timezone' => (string) ($payload['timezone'] ?? 'Africa/Accra'),
            'withinBusinessHours' => $withinHours,
            'soundEnabled' => (bool) ($payload['sound_enabled'] ?? true),
            'enterToSend' => (bool) ($payload['enter_to_send'] ?? true),
            'pollIntervalMs' => max(1500, min(15000, (int) ($payload['poll_interval_ms'] ?? 2000))),
            'cannedReplies' => $canned,
            'email' => (string) ($branding['support_email'] ?? ''),
            'phone' => (string) ($branding['support_phone'] ?? ''),
        ];
    }

    public function assertEnabled(Tenant $tenant): void
    {
        $cfg = $this->config($tenant);
        if (! $cfg['enabled']) {
            throw new RuntimeException('Live support chat is disabled by the operator.');
        }
    }

    public function forCustomer(User $customer, bool $create = true): ?SupportConversation
    {
        if ($customer->role !== UserRole::Customer) {
            throw new InvalidArgumentException('Only customers can open support chat.');
        }

        $open = $this->openConversationForCustomer($customer);
        if ($open) {
            return $open;
        }

        if (! $create) {
            return $this->latestConversationForCustomer($customer);
        }

        return $this->startNewConversation($customer);
    }

    public function openConversationForCustomer(User $customer): ?SupportConversation
    {
        $tenant = Tenant::default();

        return SupportConversation::query()
            ->where('tenant_id', $tenant->id)
            ->where('customer_user_id', $customer->id)
            ->where('status', 'open')
            ->orderByDesc('id')
            ->first();
    }

    public function latestConversationForCustomer(User $customer): ?SupportConversation
    {
        $tenant = Tenant::default();

        return SupportConversation::query()
            ->where('tenant_id', $tenant->id)
            ->where('customer_user_id', $customer->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->first();
    }

    public function findOwnedConversation(User $customer, int $id): ?SupportConversation
    {
        return SupportConversation::query()
            ->where('tenant_id', Tenant::default()->id)
            ->where('customer_user_id', $customer->id)
            ->where('id', $id)
            ->first();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForCustomer(User $customer, int $limit = 40): array
    {
        $tenant = Tenant::default();

        return SupportConversation::query()
            ->where('tenant_id', $tenant->id)
            ->where('customer_user_id', $customer->id)
            ->with(['customer', 'assignedAdmin'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (SupportConversation $c) => $this->serializeConversation($c))
            ->values()
            ->all();
    }

    public function startNewConversation(User $customer): SupportConversation
    {
        if ($customer->role !== UserRole::Customer) {
            throw new InvalidArgumentException('Only customers can open support chat.');
        }

        $tenant = Tenant::default();
        $this->assertEnabled($tenant);

        $open = $this->openConversationForCustomer($customer);
        if ($open) {
            return $open->fresh(['customer', 'assignedAdmin']) ?? $open;
        }

        $conversation = SupportConversation::query()->create([
            'tenant_id' => $tenant->id,
            'customer_user_id' => $customer->id,
            'status' => 'open',
            'unread_customer' => 0,
            'unread_admin' => 0,
        ]);

        $cfg = $this->config($tenant);
        $greeting = trim((string) $cfg['greeting']);
        if ($greeting !== '') {
            $this->postSystemMessage($conversation, $greeting);
        }
        if (! $cfg['withinBusinessHours']) {
            $offline = trim((string) $cfg['offlineMessage']);
            if ($offline !== '') {
                $this->postSystemMessage($conversation, $offline);
            }
        }

        return $conversation->fresh(['customer', 'assignedAdmin']) ?? $conversation;
    }

    public function customerReopen(SupportConversation $conversation, User $customer): SupportConversation
    {
        if ($conversation->customer_user_id !== $customer->id) {
            throw new InvalidArgumentException('Conversation not found.');
        }

        $tenant = Tenant::default();
        $this->assertEnabled($tenant);
        $cfg = $this->config($tenant);
        if (! $cfg['allowCustomerReopen']) {
            throw new InvalidArgumentException('Reopening closed chats is disabled. Start a new chat instead.');
        }

        if ($conversation->status === 'open') {
            return $conversation->fresh(['customer', 'assignedAdmin']) ?? $conversation;
        }

        // Only one open thread per customer.
        $open = $this->openConversationForCustomer($customer);
        if ($open && $open->id !== $conversation->id) {
            throw new InvalidArgumentException('You already have an open chat. Close it or continue there first.');
        }

        $conversation->status = 'open';
        $conversation->save();
        $this->postSystemMessage($conversation, 'Customer reopened this conversation.');

        return $conversation->fresh(['customer', 'assignedAdmin']) ?? $conversation;
    }

    public function postSystemMessage(SupportConversation $conversation, string $body): SupportMessage
    {
        $admin = User::query()
            ->where('tenant_id', $conversation->tenant_id)
            ->whereIn('role', [UserRole::Admin, UserRole::SuperAdmin])
            ->orderBy('id')
            ->first();

        $senderId = $admin?->id ?? $conversation->customer_user_id;

        return DB::transaction(function () use ($conversation, $body, $senderId) {
            $message = SupportMessage::query()->create([
                'conversation_id' => $conversation->id,
                'sender_user_id' => $senderId,
                'sender_role' => 'admin',
                'is_system' => true,
                'body' => trim($body),
            ]);
            $this->touchConversation($conversation, $message, incrementAdmin: false, incrementCustomer: true);

            return $message;
        });
    }

    /**
     * @param  array{url?: string, name?: string, mime?: string, size?: int}|null  $attachment
     */
    public function postMessage(
        SupportConversation $conversation,
        User $sender,
        string $body,
        string $role,
        ?array $attachment = null
    ): SupportMessage {
        $body = trim($body);
        $hasAttachment = is_array($attachment) && ! empty($attachment['url']);
        if ($body === '' && ! $hasAttachment) {
            throw new InvalidArgumentException('Message or attachment is required.');
        }
        if (mb_strlen($body) > 2000) {
            throw new InvalidArgumentException('Message must be at most 2000 characters.');
        }

        if (! in_array($role, ['customer', 'admin'], true)) {
            throw new InvalidArgumentException('Invalid sender role.');
        }

        $tenant = Tenant::default();
        $cfg = $this->config($tenant);

        if ($role === 'customer') {
            $this->assertEnabled($tenant);
            if ($conversation->status === 'closed') {
                if (! $cfg['allowCustomerReopen']) {
                    throw new InvalidArgumentException('This conversation is closed. Start a new chat to message support again.');
                }
                $conversation->status = 'open';
            }
        } else {
            // Admin replies only on open threads; closing is explicit.
            if ($conversation->status === 'closed') {
                throw new InvalidArgumentException('This conversation is closed. Reopen it before replying.');
            }
            if (! $conversation->assigned_admin_id) {
                $conversation->assigned_admin_id = $sender->id;
            }
        }

        if ($body === '' && $hasAttachment) {
            $body = 'Sent an attachment';
        }

        return DB::transaction(function () use ($conversation, $sender, $body, $role, $attachment, $hasAttachment) {
            $message = SupportMessage::query()->create([
                'conversation_id' => $conversation->id,
                'sender_user_id' => $sender->id,
                'sender_role' => $role,
                'is_system' => false,
                'body' => $body,
                'attachment_url' => $hasAttachment ? (string) $attachment['url'] : null,
                'attachment_name' => $hasAttachment ? (string) ($attachment['name'] ?? 'file') : null,
                'attachment_mime' => $hasAttachment ? (string) ($attachment['mime'] ?? '') : null,
                'attachment_size' => $hasAttachment ? (int) ($attachment['size'] ?? 0) : null,
            ]);

            $this->touchConversation(
                $conversation,
                $message,
                incrementAdmin: $role === 'customer',
                incrementCustomer: $role === 'admin'
            );

            $this->clearTyping($conversation->id, $role);

            return $message;
        });
    }

    public function reopen(SupportConversation $conversation, User $admin): SupportConversation
    {
        $conversation->status = 'open';
        if (! $conversation->assigned_admin_id) {
            $conversation->assigned_admin_id = $admin->id;
        }
        $conversation->save();
        $this->postSystemMessage($conversation, 'Support reopened this conversation.');

        return $conversation->fresh(['customer']);
    }

    public function close(SupportConversation $conversation, ?User $actor = null): SupportConversation
    {
        $conversation->status = 'closed';
        $conversation->save();
        $this->postSystemMessage($conversation, 'Support closed this conversation.');

        return $conversation->fresh(['customer']);
    }

    public function assign(SupportConversation $conversation, User $admin): SupportConversation
    {
        $conversation->assigned_admin_id = $admin->id;
        $conversation->save();

        return $conversation->fresh(['customer', 'assignedAdmin']);
    }

    public function markRead(SupportConversation $conversation, string $readerRole): void
    {
        if ($readerRole === 'customer') {
            $conversation->unread_customer = 0;
            SupportMessage::query()
                ->where('conversation_id', $conversation->id)
                ->where('sender_role', 'admin')
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        } else {
            $conversation->unread_admin = 0;
            SupportMessage::query()
                ->where('conversation_id', $conversation->id)
                ->where('sender_role', 'customer')
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }
        $conversation->save();
    }

    public function setTyping(int $conversationId, string $role): void
    {
        Cache::put($this->typingKey($conversationId, $role), now()->timestamp, now()->addSeconds(8));
    }

    public function clearTyping(int $conversationId, string $role): void
    {
        Cache::forget($this->typingKey($conversationId, $role));
    }

    public function peerTyping(int $conversationId, string $readerRole): bool
    {
        $peer = $readerRole === 'customer' ? 'admin' : 'customer';
        $ts = Cache::get($this->typingKey($conversationId, $peer));

        return is_numeric($ts) && (now()->timestamp - (int) $ts) < 6;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function serializeMessages(SupportConversation $conversation, ?int $afterId = null, int $limit = 200): array
    {
        $query = $conversation->messages()->orderBy('id');
        if ($afterId !== null && $afterId > 0) {
            $query->where('id', '>', $afterId);
        } else {
            // Latest window for initial load.
            $ids = (clone $query)->orderByDesc('id')->limit($limit)->pluck('id');
            $query = $conversation->messages()->whereIn('id', $ids)->orderBy('id');
        }

        return $query->get()->map(fn (SupportMessage $m) => $this->serializeMessage($m))->all();
    }

    public function serializeMessage(SupportMessage $m): array
    {
        return [
            'id' => $m->id,
            'body' => $m->body,
            'senderRole' => $m->sender_role,
            'senderUserId' => $m->sender_user_id,
            'isSystem' => (bool) $m->is_system,
            'attachment' => $m->attachment_url ? [
                'url' => $m->attachment_url,
                'name' => $m->attachment_name,
                'mime' => $m->attachment_mime,
                'size' => $m->attachment_size,
            ] : null,
            'readAt' => $m->read_at?->toIso8601String(),
            'createdAt' => $m->created_at?->toIso8601String(),
        ];
    }

    public function serializeConversation(SupportConversation $conversation): array
    {
        $conversation->loadMissing(['customer', 'assignedAdmin']);

        return [
            'id' => $conversation->id,
            'status' => $conversation->status,
            'subject' => $conversation->subject,
            'unreadCustomer' => (int) $conversation->unread_customer,
            'unreadAdmin' => (int) $conversation->unread_admin,
            'lastMessageAt' => $conversation->last_message_at?->toIso8601String(),
            'lastMessagePreview' => $conversation->last_message_preview,
            'lastMessageRole' => $conversation->last_message_role,
            'assignedAdminId' => $conversation->assigned_admin_id,
            'assignedAdminName' => $conversation->assignedAdmin?->name,
            'customer' => [
                'id' => $conversation->customer_user_id,
                'name' => $conversation->customer?->name,
                'phone' => $conversation->customer?->phone,
                'email' => $conversation->customer?->email,
            ],
        ];
    }

    public function adminUnreadTotal(Tenant $tenant): int
    {
        return (int) SupportConversation::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', 'open')
            ->sum('unread_admin');
    }

    private function touchConversation(
        SupportConversation $conversation,
        SupportMessage $message,
        bool $incrementAdmin,
        bool $incrementCustomer
    ): void {
        $conversation->last_message_at = now();
        $conversation->last_message_preview = mb_substr($message->body, 0, 180);
        $conversation->last_message_role = $message->is_system ? 'system' : $message->sender_role;
        if ($incrementAdmin) {
            $conversation->unread_admin = (int) $conversation->unread_admin + 1;
            $conversation->unread_customer = 0;
        }
        if ($incrementCustomer) {
            $conversation->unread_customer = (int) $conversation->unread_customer + 1;
            if (! $message->is_system) {
                $conversation->unread_admin = 0;
            }
        }
        $conversation->save();
    }

    private function typingKey(int $conversationId, string $role): string
    {
        return "support.typing.{$conversationId}.{$role}";
    }

    /** @param  array<string, mixed>  $payload */
    private function withinBusinessHours(array $payload): bool
    {
        if (! (bool) ($payload['business_hours_enabled'] ?? false)) {
            return true;
        }

        try {
            $tz = new \DateTimeZone((string) ($payload['timezone'] ?? 'Africa/Accra'));
        } catch (\Exception) {
            $tz = new \DateTimeZone('Africa/Accra');
        }

        $now = new \DateTimeImmutable('now', $tz);
        $start = (string) ($payload['business_hours_start'] ?? '09:00');
        $end = (string) ($payload['business_hours_end'] ?? '21:00');
        $today = $now->format('Y-m-d');
        $startAt = new \DateTimeImmutable("{$today} {$start}", $tz);
        $endAt = new \DateTimeImmutable("{$today} {$end}", $tz);
        if ($endAt <= $startAt) {
            // Overnight window.
            return $now >= $startAt || $now <= $endAt;
        }

        return $now >= $startAt && $now <= $endAt;
    }
}
