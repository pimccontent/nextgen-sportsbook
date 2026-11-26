<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class SupportChatAttachmentService
{
    private const MAX_KB = 5120;

    /** @var list<string> */
    private const ALLOWED = [
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'pdf', 'txt', 'doc', 'docx',
    ];

    /**
     * @return array{url: string, name: string, mime: string, size: int}
     */
    public function store(UploadedFile $file): array
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: '');
        if (! in_array($ext, self::ALLOWED, true)) {
            throw new InvalidArgumentException('Unsupported file type. Use images, PDF, TXT, or DOC.');
        }
        if ($file->getSize() > self::MAX_KB * 1024) {
            throw new InvalidArgumentException('Attachment must be 5MB or smaller.');
        }

        $safeName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'file';
        $name = $safeName.'-'.Str::lower(Str::random(10)).'.'.$ext;
        $path = $file->storeAs('support/chat', $name, 'public');
        $relative = '/storage/'.$path;
        $absolute = rtrim((string) config('app.url'), '/').$relative;

        return [
            'url' => $absolute,
            'name' => $file->getClientOriginalName() ?: $name,
            'mime' => (string) ($file->getMimeType() ?: 'application/octet-stream'),
            'size' => (int) $file->getSize(),
        ];
    }
}
