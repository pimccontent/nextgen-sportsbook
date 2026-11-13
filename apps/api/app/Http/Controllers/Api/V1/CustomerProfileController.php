<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Profile;
use App\Services\AuditLogger;
use App\Shared\Http\ApiResponse;
use App\Support\PhoneNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class CustomerProfileController
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('profile');

        return ApiResponse::success(['profile' => $this->payload($user)]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user()->load('profile');

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:190'],
            'phone' => ['sometimes', 'string', 'max:32'],
            'display_name' => ['nullable', 'string', 'max:120'],
            'payout' => ['sometimes', 'array'],
            'payout.method' => ['nullable', 'in:momo,bank'],
            'payout.network' => ['nullable', 'string', 'max:40'],
            'payout.momo_number' => ['nullable', 'string', 'max:32'],
            'payout.bank_name' => ['nullable', 'string', 'max:120'],
            'payout.account_name' => ['nullable', 'string', 'max:120'],
            'payout.account_number' => ['nullable', 'string', 'max:64'],
            'kyc' => ['sometimes', 'array'],
            'kyc.id_type' => ['nullable', 'in:ghana_card,passport,voters_id,drivers_license'],
            'kyc.id_number' => ['nullable', 'string', 'max:64'],
            'kyc.full_name' => ['nullable', 'string', 'max:120'],
            'kyc.date_of_birth' => ['nullable', 'date'],
            'kyc.submit' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['phone'])) {
            $phone = PhoneNormalizer::normalizeGh($data['phone']);
            if (! $phone) {
                throw ValidationException::withMessages(['phone' => ['Invalid Ghana mobile number.']]);
            }
            if ($user->newQuery()->where('phone', $phone)->where('id', '!=', $user->id)->exists()) {
                throw ValidationException::withMessages(['phone' => ['Phone already in use.']]);
            }
            $data['phone'] = $phone;
        }

        if (array_key_exists('email', $data) && $data['email']) {
            $email = Str::lower($data['email']);
            if ($user->newQuery()->where('email', $email)->where('id', '!=', $user->id)->exists()) {
                throw ValidationException::withMessages(['email' => ['Email already in use.']]);
            }
            $data['email'] = $email;
        }

        DB::transaction(function () use ($user, $data) {
            $userPatch = [];
            if (isset($data['name'])) {
                $userPatch['name'] = $data['name'];
            }
            if (isset($data['phone'])) {
                $userPatch['phone'] = $data['phone'];
            }
            if (array_key_exists('email', $data)) {
                $userPatch['email'] = $data['email'];
            }
            if ($userPatch !== []) {
                $user->update($userPatch);
            }

            $profile = $user->profile ?? Profile::query()->create([
                'user_id' => $user->id,
                'display_name' => $user->name,
                'country_code' => 'GH',
                'preferred_currency' => 'GHS',
                'preferences' => [],
            ]);

            $prefs = $profile->preferences ?? [];

            if (isset($data['display_name']) || isset($data['name'])) {
                $profile->display_name = $data['display_name'] ?? $data['name'] ?? $profile->display_name;
            }

            if (isset($data['payout'])) {
                $prefs['payout'] = array_merge($prefs['payout'] ?? [], array_filter(
                    $data['payout'],
                    static fn ($v) => $v !== null && $v !== ''
                ));
            }

            if (isset($data['kyc'])) {
                $kyc = array_merge($prefs['kyc'] ?? [], array_filter(
                    $data['kyc'],
                    static fn ($v, $k) => $k !== 'submit' && $v !== null && $v !== '',
                    ARRAY_FILTER_USE_BOTH
                ));
                if (! empty($data['kyc']['submit'])) {
                    $kyc['status'] = 'pending';
                    $kyc['submitted_at'] = now()->utc()->toIso8601String();
                } elseif (! isset($kyc['status'])) {
                    $kyc['status'] = $prefs['kyc']['status'] ?? 'none';
                }
                $prefs['kyc'] = $kyc;
            }

            $profile->preferences = $prefs;
            $profile->save();
        });

        $this->audit->log($request->user(), 'customer.profile.update', $request, [
            'user_id' => $user->id,
        ], Profile::class, $user->profile?->id);

        return ApiResponse::success([
            'profile' => $this->payload($user->fresh()->load('profile')),
        ], 'Profile updated');
    }

    private function payload($user): array
    {
        $prefs = $user->profile?->preferences ?? [];

        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => str_ends_with((string) $user->email, '@phone.nextgen.local') ? null : $user->email,
            'status' => $user->status->value,
            'display_name' => $user->profile?->display_name,
            'country_code' => $user->profile?->country_code ?? 'GH',
            'preferred_currency' => $user->profile?->preferred_currency ?? 'GHS',
            'payout' => $prefs['payout'] ?? [
                'method' => null,
                'network' => null,
                'momo_number' => null,
                'bank_name' => null,
                'account_name' => null,
                'account_number' => null,
            ],
            'kyc' => $prefs['kyc'] ?? [
                'status' => 'none',
                'id_type' => null,
                'id_number' => null,
                'full_name' => null,
                'date_of_birth' => null,
                'submitted_at' => null,
            ],
        ];
    }
}
