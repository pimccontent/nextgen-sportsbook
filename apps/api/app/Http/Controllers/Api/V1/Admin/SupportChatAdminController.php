<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\SupportConversation;
use App\Models\Tenant;
use App\Services\AuditLogger;
use App\Services\SupportChatAttachmentService;
use App\Services\SupportChatService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

final class SupportChatAdminController
{
    public function __construct(
        private readonly SupportChatService $chat,
        private readonly SupportChatAttachmentService $attachments,
        private readonly AuditLogger $audit,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:open,closed,all'],
            'q' => ['nullable', 'string', 'max:80'],
        ]);

        $tenant = Tenant::default();
        $query = SupportConversation::query()
            ->where('tenant_id', $tenant->id)
            ->with(['customer', 'assignedAdmin'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit(100);

        $status = $data['status'] ?? 'open';
        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if (! empty($data['q'])) {
            $q = trim($data['q']);
            $query->where(function ($inner) use ($q) {
                $inner->where('last_message_preview', 'ilike', '%'.$q.'%')
                    ->orWhereHas('customer', function ($u) use ($q) {
                        $u->where('phone', 'ilike', '%'.$q.'%')
                            ->orWhere('name', 'ilike', '%'.$q.'%')
                            ->orWhere('email', 'ilike', '%'.$q.'%');
                    });
            });
        }

        $rows = $query->get()->map(fn (SupportConversation $c) => $this->chat->serializeConversation($c));

        return ApiResponse::success([
            'config' => $this->chat->config($tenant),
            'unreadTotal' => $this->chat->adminUnreadTotal($tenant),
            'conversations' => $rows->values(),
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $conversation = $this->find($id);
        if (! $conversation) {
            return ApiResponse::error('Conversation not found', 404);
        }

        $this->chat->markRead($conversation, 'admin');
        $afterId = $request->query('after_id');

        return ApiResponse::success([
            'config' => $this->chat->config(Tenant::default()),
            'conversation' => $this->chat->serializeConversation($conversation->fresh(['customer', 'assignedAdmin'])),
            'messages' => $this->chat->serializeMessages(
                $conversation,
                is_numeric($afterId) ? (int) $afterId : null
            ),
            'peerTyping' => $this->chat->peerTyping($conversation->id, 'admin'),
            'unreadTotal' => $this->chat->adminUnreadTotal(Tenant::default()),
        ]);
    }

    public function storeMessage(Request $request, int $id): JsonResponse
    {
        $conversation = $this->find($id);
        if (! $conversation) {
            return ApiResponse::error('Conversation not found', 404);
        }

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'file' => ['nullable', 'file', 'max:5120'],
            'attachment_url' => ['nullable', 'string', 'max:500'],
            'attachment_name' => ['nullable', 'string', 'max:255'],
            'attachment_mime' => ['nullable', 'string', 'max:120'],
            'attachment_size' => ['nullable', 'integer', 'min:1', 'max:5242880'],
        ]);

        $attachment = null;
        try {
            if ($request->hasFile('file')) {
                $attachment = $this->attachments->store($request->file('file'));
            } elseif (! empty($data['attachment_url'])) {
                $attachment = [
                    'url' => $data['attachment_url'],
                    'name' => $data['attachment_name'] ?? 'file',
                    'mime' => $data['attachment_mime'] ?? '',
                    'size' => (int) ($data['attachment_size'] ?? 0),
                ];
            }

            $message = $this->chat->postMessage(
                $conversation,
                $request->user(),
                (string) ($data['body'] ?? ''),
                'admin',
                $attachment
            );
        } catch (InvalidArgumentException|RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log($request->user(), 'support.message', $request, [
            'conversation_id' => $conversation->id,
            'message_id' => $message->id,
            'has_attachment' => (bool) $attachment,
        ]);

        return ApiResponse::success([
            'conversation' => $this->chat->serializeConversation($conversation->fresh(['customer', 'assignedAdmin'])),
            'message' => $this->chat->serializeMessage($message),
            'peerTyping' => false,
            'unreadTotal' => $this->chat->adminUnreadTotal(Tenant::default()),
        ], 'Message sent', 201);
    }

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        try {
            $stored = $this->attachments->store($request->file('file'));
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $this->audit->log($request->user(), 'support.attachment', $request, [
            'name' => $stored['name'],
            'mime' => $stored['mime'],
            'size' => $stored['size'],
        ]);

        return ApiResponse::success($stored, 'Uploaded', 201);
    }

    public function typing(Request $request, int $id): JsonResponse
    {
        $conversation = $this->find($id);
        if (! $conversation) {
            return ApiResponse::error('Conversation not found', 404);
        }
        $this->chat->setTyping($conversation->id, 'admin');

        return ApiResponse::success(['ok' => true]);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $conversation = $this->find($id);
        if (! $conversation) {
            return ApiResponse::error('Conversation not found', 404);
        }

        $conversation = $this->chat->close($conversation, $request->user());
        $this->audit->log($request->user(), 'support.close', $request, [
            'conversation_id' => $conversation->id,
        ]);

        return ApiResponse::success([
            'conversation' => $this->chat->serializeConversation($conversation),
        ], 'Conversation closed');
    }

    public function reopen(Request $request, int $id): JsonResponse
    {
        $conversation = $this->find($id);
        if (! $conversation) {
            return ApiResponse::error('Conversation not found', 404);
        }

        $conversation = $this->chat->reopen($conversation, $request->user());
        $this->audit->log($request->user(), 'support.reopen', $request, [
            'conversation_id' => $conversation->id,
        ]);

        return ApiResponse::success([
            'conversation' => $this->chat->serializeConversation($conversation),
        ], 'Conversation reopened');
    }

    public function assign(Request $request, int $id): JsonResponse
    {
        $conversation = $this->find($id);
        if (! $conversation) {
            return ApiResponse::error('Conversation not found', 404);
        }

        $conversation = $this->chat->assign($conversation, $request->user());
        $this->audit->log($request->user(), 'support.assign', $request, [
            'conversation_id' => $conversation->id,
            'admin_id' => $request->user()->id,
        ]);

        return ApiResponse::success([
            'conversation' => $this->chat->serializeConversation($conversation),
        ], 'Assigned to you');
    }

    private function find(int $id): ?SupportConversation
    {
        return SupportConversation::query()
            ->where('tenant_id', Tenant::default()->id)
            ->where('id', $id)
            ->first();
    }
}
