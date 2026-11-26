<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\Profile;
use App\Models\User;
use App\Services\AuditLogger;
use App\Shared\Http\ApiResponse;
use App\Support\AdminPermission;
use App\Support\PhoneNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

final class AccountAdminController
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('profile');

        return ApiResponse::success([
            'account' => $this->payload($user),
            'modules' => AdminPermission::labels(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'email' => ['sometimes', 'email', 'max:190'],
        ]);

        if (array_key_exists('email', $data)) {
            $email = Str::lower($data['email']);
            $exists = User::query()
                ->where('email', $email)
                ->where('id', '!=', $user->id)
                ->exists();
            if ($exists) {
                throw ValidationException::withMessages(['email' => ['Email already in use.']]);
            }
            $user->email = $email;
        }

        if (array_key_exists('name', $data)) {
            $user->name = $data['name'];
        }

        if (array_key_exists('phone', $data)) {
            if ($data['phone'] === null || trim((string) $data['phone']) === '') {
                $user->phone = null;
            } else {
                $phone = PhoneNormalizer::normalizeGh($data['phone']);
                if (! $phone) {
                    throw ValidationException::withMessages(['phone' => ['Invalid Ghana mobile number.']]);
                }
                $taken = User::query()
                    ->where('phone', $phone)
                    ->where('id', '!=', $user->id)
                    ->exists();
                if ($taken) {
                    throw ValidationException::withMessages(['phone' => ['Phone already in use.']]);
                }
                $user->phone = $phone;
            }
        }

        $user->save();

        if (array_key_exists('display_name', $data) || array_key_exists('name', $data)) {
            $display = array_key_exists('display_name', $data)
                ? ($data['display_name'] ?: $user->name)
                : ($user->profile?->display_name ?: $user->name);
            Profile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'display_name' => $display,
                    'country_code' => $user->profile?->country_code ?? 'GH',
                    'preferred_currency' => $user->profile?->preferred_currency ?? 'GHS',
                ]
            );
        }

        $this->audit->log($user, 'admin.account.update', $request, [
            'fields' => array_keys($data),
        ], User::class, $user->id);

        return ApiResponse::success([
            'account' => $this->payload($user->fresh(['profile'])),
        ], 'Account updated');
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        /** @var User $user */
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $data['password']]);
        $this->audit->log($user, 'admin.account.password', $request, [], User::class, $user->id);

        return ApiResponse::success(null, 'Password updated');
    }

    /** @return array<string, mixed> */
    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'display_name' => $user->profile?->display_name,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'status' => $user->status->value,
            'is_super_admin' => AdminPermission::isSuperAdmin($user),
            'permissions' => AdminPermission::effective($user),
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
        ];
    }
}
