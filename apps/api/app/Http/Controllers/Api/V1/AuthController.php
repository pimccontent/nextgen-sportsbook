<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Agent;
use App\Models\Profile;
use App\Models\User;
use App\Services\AuditLogger;
use App\Shared\Http\ApiResponse;
use App\Support\PhoneNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

final class AuthController
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'name' => ['nullable', 'string', 'max:120'],
            'referral_code' => ['nullable', 'string', 'max:32'],
        ]);

        $phone = PhoneNormalizer::normalizeGh($data['phone']);
        if ($phone === null) {
            throw ValidationException::withMessages([
                'phone' => ['Enter a valid Ghana mobile number.'],
            ]);
        }

        if (User::query()->where('phone', $phone)->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['An account with this mobile number already exists.'],
            ]);
        }

        $user = DB::transaction(function () use ($data, $phone) {
            $user = User::query()->create([
                'tenant_id' => \App\Models\Tenant::query()->where('slug', 'default')->value('id'),
                'name' => $data['name'] ?? 'Customer '.$phone,
                'phone' => $phone,
                'email' => PhoneNormalizer::syntheticEmail($phone),
                'password' => $data['password'],
                'role' => UserRole::Customer,
                'status' => UserStatus::Active,
            ]);

            Profile::query()->create([
                'user_id' => $user->id,
                'display_name' => $data['name'] ?? null,
                'country_code' => 'GH',
                'preferred_currency' => 'GHS',
            ]);

            // Referral attribution is recorded only; commission rules remain open.
            if (! empty($data['referral_code'])) {
                $agent = Agent::query()->where('referral_code', strtoupper($data['referral_code']))->first();
                if ($agent) {
                    Profile::query()->where('user_id', $user->id)->update([
                        'preferences' => [
                            'referred_by_agent_id' => $agent->id,
                            'referral_code' => $agent->referral_code,
                        ],
                    ]);
                }
            }

            return $user;
        });

        $token = $user->createToken('customer', ['role:customer'])->plainTextToken;

        $this->audit->log($user, 'auth.register', $request, [
            'role' => $user->role->value,
        ], User::class, $user->id);

        return ApiResponse::success([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->userPayload($user->fresh(['profile', 'agent'])),
        ], 'Registered', 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email'],
            'password' => ['required', 'string'],
            'portal' => ['required', 'in:customer,agent,admin'],
        ]);

        if (empty($data['phone']) && empty($data['email'])) {
            throw ValidationException::withMessages([
                'phone' => ['Mobile number or email is required.'],
            ]);
        }

        $key = 'login:'.Str::lower($data['phone'] ?? $data['email']).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);

            return ApiResponse::error("Too many login attempts. Try again in {$seconds} seconds.", 429);
        }

        $user = $this->findUser($data);

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($key, 60);
            $this->audit->log(null, 'auth.login_failed', $request, [
                'portal' => $data['portal'],
                'identifier' => $data['phone'] ?? $data['email'],
            ]);

            throw ValidationException::withMessages([
                'password' => ['Invalid credentials.'],
            ]);
        }

        if (! $user->isActive()) {
            return ApiResponse::error('Account is not active.', 403);
        }

        if (! $this->portalAllows($user, $data['portal'])) {
            $this->audit->log($user, 'auth.portal_denied', $request, [
                'portal' => $data['portal'],
                'role' => $user->role->value,
            ]);

            return ApiResponse::error('This account cannot access the selected portal.', 403);
        }

        RateLimiter::clear($key);

        $user->forceFill(['last_login_at' => now()])->save();
        $user->tokens()->where('name', $data['portal'])->delete();
        $token = $user->createToken($data['portal'], ['role:'.$user->role->value])->plainTextToken;

        $this->audit->log($user, 'auth.login', $request, [
            'portal' => $data['portal'],
            'role' => $user->role->value,
        ], User::class, $user->id);

        return ApiResponse::success([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->userPayload($user->load(['profile', 'agent'])),
        ], 'Authenticated');
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return ApiResponse::success([
            'user' => $this->userPayload($user->load(['profile', 'agent'])),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $request->user()->currentAccessToken()?->delete();

        $this->audit->log($user, 'auth.logout', $request, [], User::class, $user->id);

        return ApiResponse::success(null, 'Logged out');
    }

    public function changePassword(Request $request): JsonResponse
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
        $this->audit->log($user, 'auth.password_change', $request, [], User::class, $user->id);

        return ApiResponse::success(null, 'Password updated');
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
        ]);

        $phone = PhoneNormalizer::normalizeGh($data['phone']);
        if (! $phone) {
            throw ValidationException::withMessages(['phone' => ['Invalid Ghana mobile number.']]);
        }

        $key = 'pwd-reset:'.$phone;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return ApiResponse::error('Too many reset attempts. Try later.', 429);
        }
        RateLimiter::hit($key, 600);

        $user = User::query()->where('phone', $phone)->where('role', UserRole::Customer)->first();
        // Always return success shape to avoid phone enumeration; sandbox returns code when user exists.
        $code = null;
        if ($user) {
            $code = (string) random_int(100000, 999999);
            cache()->put('pwd_reset_code:'.$phone, Hash::make($code), now()->addMinutes(15));
            $this->audit->log($user, 'auth.password_forgot', $request, [], User::class, $user->id);
        }

        return ApiResponse::success([
            'sent' => true,
            // Sandbox only — remove when SMS provider is wired.
            'sandbox_code' => $code,
        ], $code ? 'Reset code issued (sandbox)' : 'If the account exists, a reset code was issued');
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
            'code' => ['required', 'string', 'max:12'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $phone = PhoneNormalizer::normalizeGh($data['phone']);
        if (! $phone) {
            throw ValidationException::withMessages(['phone' => ['Invalid Ghana mobile number.']]);
        }

        $hashed = cache()->get('pwd_reset_code:'.$phone);
        if (! $hashed || ! Hash::check($data['code'], $hashed)) {
            throw ValidationException::withMessages(['code' => ['Invalid or expired reset code.']]);
        }

        $user = User::query()->where('phone', $phone)->where('role', UserRole::Customer)->first();
        if (! $user) {
            throw ValidationException::withMessages(['phone' => ['Account not found.']]);
        }

        $user->update(['password' => $data['password']]);
        cache()->forget('pwd_reset_code:'.$phone);
        $this->audit->log($user, 'auth.password_reset', $request, [], User::class, $user->id);

        return ApiResponse::success(null, 'Password reset successful');
    }

    private function findUser(array $data): ?User
    {
        if (! empty($data['phone'])) {
            $phone = PhoneNormalizer::normalizeGh($data['phone']);
            if ($phone) {
                return User::query()->where('phone', $phone)->first();
            }
        }

        if (! empty($data['email'])) {
            return User::query()->where('email', Str::lower($data['email']))->first();
        }

        return null;
    }

    private function portalAllows(User $user, string $portal): bool
    {
        return match ($portal) {
            'customer' => $user->role === UserRole::Customer,
            'agent' => $user->role === UserRole::Agent,
            'admin' => $user->role->isStaff(),
            default => false,
        };
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => str_ends_with((string) $user->email, '@phone.nextgen.local') ? null : $user->email,
            'role' => $user->role->value,
            'status' => $user->status->value,
            'two_factor_enabled' => $user->two_factor_enabled,
            'profile' => $user->profile ? [
                'display_name' => $user->profile->display_name,
                'country_code' => $user->profile->country_code,
                'preferred_currency' => $user->profile->preferred_currency,
                'kyc_status' => $user->profile->preferences['kyc']['status'] ?? 'none',
            ] : null,
            'agent' => $user->agent ? [
                'referral_code' => $user->agent->referral_code,
                'status' => $user->agent->status,
            ] : null,
        ];
    }
}
