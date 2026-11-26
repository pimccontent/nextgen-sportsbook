<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Profile;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditLogger;
use App\Shared\Http\ApiResponse;
use App\Support\AdminPermission;
use App\Support\PhoneNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
final class StaffAdminController
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->guardSuper($request);

        $staff = User::query()
            ->where('tenant_id', Tenant::default()->id)
            ->whereIn('role', [UserRole::Admin, UserRole::SuperAdmin])
            ->with('profile')
            ->orderByDesc('id')
            ->get()
            ->map(fn (User $u) => $this->payload($u));

        return ApiResponse::success([
            'staff' => $staff->values(),
            'modules' => AdminPermission::labels(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $this->guardSuper($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:32'],
            'password' => ['required', Password::min(8)->letters()->numbers()],
            'display_name' => ['nullable', 'string', 'max:120'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        $email = Str::lower($data['email']);
        if (User::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => ['Email already in use.']]);
        }

        $phone = null;
        if (! empty($data['phone'])) {
            $phone = PhoneNormalizer::normalizeGh($data['phone']);
            if (! $phone) {
                throw ValidationException::withMessages(['phone' => ['Invalid Ghana mobile number.']]);
            }
            if (User::query()->where('phone', $phone)->exists()) {
                throw ValidationException::withMessages(['phone' => ['Phone already in use.']]);
            }
        }

        $permissions = AdminPermission::sanitize($data['permissions'] ?? []);

        $user = DB::transaction(function () use ($data, $email, $phone, $permissions) {
            $user = User::query()->create([
                'tenant_id' => Tenant::default()->id,
                'name' => $data['name'],
                'email' => $email,
                'phone' => $phone,
                'password' => $data['password'],
                'role' => UserRole::Admin,
                'admin_permissions' => $permissions,
                'status' => UserStatus::Active,
            ]);
            Profile::query()->create([
                'user_id' => $user->id,
                'display_name' => $data['display_name'] ?? $data['name'],
                'country_code' => 'GH',
                'preferred_currency' => 'GHS',
            ]);

            return $user->load('profile');
        });

        $this->audit->log($actor, 'admin.staff.create', $request, [
            'staff_id' => $user->id,
            'permissions' => $permissions,
        ], User::class, $user->id);

        return ApiResponse::success([
            'staff' => $this->payload($user),
            'modules' => AdminPermission::labels(),
        ], 'Staff created', 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->guardSuper($request);
        $user = $this->findStaff($id);
        if (! $user) {
            return ApiResponse::error('Staff not found', 404);
        }

        return ApiResponse::success([
            'staff' => $this->payload($user),
            'modules' => AdminPermission::labels(),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actor = $this->guardSuper($request);
        $user = $this->findStaff($id);
        if (! $user) {
            return ApiResponse::error('Staff not found', 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:190'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'password' => ['sometimes', 'nullable', Password::min(8)->letters()->numbers()],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'status' => ['sometimes', 'in:active,suspended,pending'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
        ]);

        if ($user->role === UserRole::SuperAdmin && $user->id !== $actor->id) {
            // Other super admins: only status/password/profile fields that don't strip role.
            if (array_key_exists('permissions', $data)) {
                throw ValidationException::withMessages([
                    'permissions' => ['Cannot change Super Admin permissions.'],
                ]);
            }
        }

        if (array_key_exists('email', $data)) {
            $email = Str::lower($data['email']);
            $exists = User::query()->where('email', $email)->where('id', '!=', $user->id)->exists();
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
                $taken = User::query()->where('phone', $phone)->where('id', '!=', $user->id)->exists();
                if ($taken) {
                    throw ValidationException::withMessages(['phone' => ['Phone already in use.']]);
                }
                $user->phone = $phone;
            }
        }

        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        if (array_key_exists('status', $data)) {
            if ($user->id === $actor->id && $data['status'] !== UserStatus::Active->value) {
                throw ValidationException::withMessages(['status' => ['You cannot suspend your own account.']]);
            }
            if ($user->role === UserRole::SuperAdmin && $user->id !== $actor->id) {
                throw ValidationException::withMessages(['status' => ['Cannot change another Super Admin status.']]);
            }
            $user->status = UserStatus::from($data['status']);
        }

        if (array_key_exists('permissions', $data) && $user->role === UserRole::Admin) {
            $user->admin_permissions = AdminPermission::sanitize($data['permissions']);
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

        $this->audit->log($actor, 'admin.staff.update', $request, [
            'staff_id' => $user->id,
            'fields' => array_keys($data),
        ], User::class, $user->id);

        return ApiResponse::success([
            'staff' => $this->payload($user->fresh(['profile'])),
            'modules' => AdminPermission::labels(),
        ], 'Staff updated');
    }

    public function suspend(Request $request, int $id): JsonResponse
    {
        return $this->setStatus($request, $id, UserStatus::Suspended, 'admin.staff.suspend', 'Staff suspended');
    }

    public function activate(Request $request, int $id): JsonResponse
    {
        return $this->setStatus($request, $id, UserStatus::Active, 'admin.staff.activate', 'Staff activated');
    }

    private function setStatus(
        Request $request,
        int $id,
        UserStatus $status,
        string $auditAction,
        string $message
    ): JsonResponse {
        $actor = $this->guardSuper($request);
        $user = $this->findStaff($id);
        if (! $user) {
            return ApiResponse::error('Staff not found', 404);
        }
        if ($user->id === $actor->id) {
            return ApiResponse::error('You cannot change your own status this way.', 422);
        }
        if ($user->role === UserRole::SuperAdmin) {
            return ApiResponse::error('Cannot change Super Admin status.', 422);
        }

        $user->status = $status;
        $user->save();

        $this->audit->log($actor, $auditAction, $request, [
            'staff_id' => $user->id,
            'status' => $status->value,
        ], User::class, $user->id);

        return ApiResponse::success([
            'staff' => $this->payload($user->fresh(['profile'])),
        ], $message);
    }

    private function guardSuper(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();
        if (! AdminPermission::isSuperAdmin($user)) {
            abort(403, 'Only Super Admin can manage staff.');
        }

        return $user;
    }

    private function findStaff(int $id): ?User
    {
        return User::query()
            ->where('tenant_id', Tenant::default()->id)
            ->whereIn('role', [UserRole::Admin, UserRole::SuperAdmin])
            ->where('id', $id)
            ->with('profile')
            ->first();
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
            'permissions' => AdminPermission::isSuperAdmin($user)
                ? AdminPermission::modules()
                : AdminPermission::sanitize($user->admin_permissions),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
