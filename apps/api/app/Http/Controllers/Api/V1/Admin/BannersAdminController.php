<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\Banner;
use App\Models\Tenant;
use App\Services\AuditLogger;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class BannersAdminController
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function index(): JsonResponse
    {
        $tenant = Tenant::default();
        $banners = Banner::query()
            ->where('tenant_id', $tenant->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (Banner $b) => $b->toAdminArray())
            ->values();

        return ApiResponse::success(['banners' => $banners]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $tenant = Tenant::default();

        $banner = Banner::query()->create([
            'tenant_id' => $tenant->id,
            'public_id' => 'bn-'.Str::lower(Str::random(10)),
            'title' => $data['title'],
            'subtitle' => $data['subtitle'] ?? null,
            'image_url' => $data['image_url'],
            'cta_label' => $data['cta_label'] ?? null,
            'cta_url' => $data['cta_url'] ?? null,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'is_active' => (bool) ($data['is_active'] ?? true),
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
        ]);

        $this->audit->log($request->user(), 'banner.create', $request, [
            'public_id' => $banner->public_id,
        ], Banner::class, $banner->id);

        return ApiResponse::success(['banner' => $banner->toAdminArray()], 'Banner created', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $banner = $this->find($id);
        if (! $banner) {
            return ApiResponse::error('Banner not found', 404);
        }

        $data = $this->validated($request, false);
        foreach ([
            'title', 'subtitle', 'image_url', 'cta_label', 'cta_url', 'sort_order', 'is_active', 'starts_at', 'ends_at',
        ] as $field) {
            $payloadKey = $field;
            if (array_key_exists($payloadKey, $data)) {
                $banner->{$field} = $data[$payloadKey];
            }
        }
        $banner->save();

        $this->audit->log($request->user(), 'banner.update', $request, [
            'public_id' => $banner->public_id,
        ], Banner::class, $banner->id);

        return ApiResponse::success(['banner' => $banner->fresh()->toAdminArray()], 'Banner updated');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $banner = $this->find($id);
        if (! $banner) {
            return ApiResponse::error('Banner not found', 404);
        }

        $publicId = $banner->public_id;
        $bannerId = $banner->id;
        $banner->delete();

        $this->audit->log($request->user(), 'banner.delete', $request, [
            'public_id' => $publicId,
        ], Banner::class, $bannerId);

        return ApiResponse::success(null, 'Banner deleted');
    }

    private function find(string $id): ?Banner
    {
        return Banner::query()
            ->where('tenant_id', Tenant::default()->id)
            ->where('public_id', $id)
            ->first();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $creating = true): array
    {
        $rules = [
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:160'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image_url' => [$creating ? 'required' : 'sometimes', 'url', 'max:500'],
            'cta_label' => ['nullable', 'string', 'max:80'],
            'cta_url' => ['nullable', 'url', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ];

        return $request->validate($rules);
    }
}
