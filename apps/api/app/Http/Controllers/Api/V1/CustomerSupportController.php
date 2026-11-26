<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Tenant;
use App\Services\SupportChatAttachmentService;
use App\Services\SupportChatService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

final class CustomerSupportController
{
    public function __construct(
        private readonly SupportChatService $chat,
        private readonly SupportChatAttachmentService $attachments,
    ) {
    }

    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::default();
        $cfg = $this->chat->config($tenant);
        $create = filter_var($request->query('create', false), FILTER_VALIDATE_BOOLEAN);
        $markRead = filter_var($request->query('mark_read', true), FILTER_VALIDATE_BOOLEAN);
        $conversationId = $request->query('conversation_id');

        try {
            if (is_numeric($conversationId)) {
                $conversation = $this->chat->findOwnedConversation($request->user(), (int) $conversationId);
                if (! $conversation) {
                    return ApiResponse::error('Conversation not found', 404);
                }
            } elseif ($cfg['enabled'] && $create) {
                $conversation = $this->chat->forCustomer($request->user(), true);
            } else {
                $conversation = $this->chat->forCustomer($request->user(), false);
            }
        } catch (RuntimeException|InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $history = $this->chat->listForCustomer($request->user());

        if (! $conversation) {
            return ApiResponse::success([
                'config' => $cfg,
                'conversation' => null,
                'conversations' => $history,
                'messages' => [],
                'peerTyping' => false,
            ]);
        }

        if ($markRead && $conversation->status === 'open') {
            $this->chat->markRead($conversation, 'customer');
        }
        $afterId = $request->query('after_id');

        return ApiResponse::success([
            'config' => $cfg,
            'conversation' => $this->chat->serializeConversation($conversation->fresh(['customer', 'assignedAdmin'])),
            'conversations' => $history,
            'messages' => $this->chat->serializeMessages(
                $conversation,
                is_numeric($afterId) ? (int) $afterId : null
            ),
            'peerTyping' => $this->chat->peerTyping($conversation->id, 'customer'),
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        try {
            $conversation = $this->chat->startNewConversation($request->user());
        } catch (RuntimeException|InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success([
            'config' => $this->chat->config(Tenant::default()),
            'conversation' => $this->chat->serializeConversation($conversation),
            'conversations' => $this->chat->listForCustomer($request->user()),
            'messages' => $this->chat->serializeMessages($conversation),
            'peerTyping' => false,
        ], 'Chat started', 201);
    }

    public function reopen(Request $request, int $id): JsonResponse
    {
        $conversation = $this->chat->findOwnedConversation($request->user(), $id);
        if (! $conversation) {
            return ApiResponse::error('Conversation not found', 404);
        }

        try {
            $conversation = $this->chat->customerReopen($conversation, $request->user());
        } catch (RuntimeException|InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success([
            'config' => $this->chat->config(Tenant::default()),
            'conversation' => $this->chat->serializeConversation($conversation),
            'conversations' => $this->chat->listForCustomer($request->user()),
            'messages' => $this->chat->serializeMessages($conversation),
            'peerTyping' => false,
        ], 'Chat reopened');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'conversation_id' => ['nullable', 'integer', 'min:1'],
            'file' => ['nullable', 'file', 'max:5120'],
            'attachment_url' => ['nullable', 'string', 'max:500'],
            'attachment_name' => ['nullable', 'string', 'max:255'],
            'attachment_mime' => ['nullable', 'string', 'max:120'],
            'attachment_size' => ['nullable', 'integer', 'min:1', 'max:5242880'],
        ]);

        $attachment = null;
        try {
            if ($request->hasFile('file')) {
                $this->chat->assertEnabled(Tenant::default());
                $attachment = $this->attachments->store($request->file('file'));
            } elseif (! empty($data['attachment_url'])) {
                $attachment = [
                    'url' => $data['attachment_url'],
                    'name' => $data['attachment_name'] ?? 'file',
                    'mime' => $data['attachment_mime'] ?? '',
                    'size' => (int) ($data['attachment_size'] ?? 0),
                ];
            }

            if (! empty($data['conversation_id'])) {
                $conversation = $this->chat->findOwnedConversation($request->user(), (int) $data['conversation_id']);
            } else {
                $conversation = $this->chat->openConversationForCustomer($request->user())
                    ?? $this->chat->startNewConversation($request->user());
            }

            if (! $conversation) {
                return ApiResponse::error('Unable to open conversation.', 422);
            }

            $message = $this->chat->postMessage(
                $conversation,
                $request->user(),
                (string) ($data['body'] ?? ''),
                'customer',
                $attachment
            );
        } catch (RuntimeException|InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success([
            'config' => $this->chat->config(Tenant::default()),
            'conversation' => $this->chat->serializeConversation($conversation->fresh(['customer', 'assignedAdmin'])),
            'conversations' => $this->chat->listForCustomer($request->user()),
            'message' => $this->chat->serializeMessage($message),
            'peerTyping' => false,
        ], 'Message sent', 201);
    }

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        try {
            $this->chat->assertEnabled(Tenant::default());
            $stored = $this->attachments->store($request->file('file'));
        } catch (RuntimeException|InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($stored, 'Uploaded', 201);
    }

    public function typing(Request $request): JsonResponse
    {
        $data = $request->validate([
            'conversation_id' => ['nullable', 'integer', 'min:1'],
        ]);

        if (! empty($data['conversation_id'])) {
            $conversation = $this->chat->findOwnedConversation($request->user(), (int) $data['conversation_id']);
        } else {
            $conversation = $this->chat->openConversationForCustomer($request->user());
        }

        if (! $conversation || $conversation->status !== 'open') {
            return ApiResponse::success(['ok' => true]);
        }
        $this->chat->setTyping($conversation->id, 'customer');

        return ApiResponse::success(['ok' => true]);
    }
}
