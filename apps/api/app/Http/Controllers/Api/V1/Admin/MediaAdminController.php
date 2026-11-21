<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Services\AuditLogger;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class MediaAdminController
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'image', 'max:5120', 'mimes:jpg,jpeg,png,webp,gif,svg,ico'],
            'kind' => ['nullable', 'string', 'in:logo,favicon,banner,image'],
        ]);

        $kind = $data['kind'] ?? 'image';
        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'png');
        $name = $kind.'-'.Str::lower(Str::random(12)).'.'.$ext;
        $path = $file->storeAs('branding/'.$kind, $name, 'public');

        $relative = '/storage/'.$path;
        $absolute = rtrim((string) config('app.url'), '/').$relative;

        $this->audit->log($request->user(), 'media.upload', $request, [
            'kind' => $kind,
            'path' => $path,
        ]);

        return ApiResponse::success([
            'url' => $absolute,
            'path' => $relative,
            'kind' => $kind,
        ], 'Uploaded', 201);
    }
}
