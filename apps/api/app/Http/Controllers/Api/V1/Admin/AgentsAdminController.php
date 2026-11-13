<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Agent;
use App\Models\Profile;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditLogger;
use App\Shared\Http\ApiResponse;
use App\Support\PhoneNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

final class AgentsAdminController
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function index(): JsonResponse
    {
        $agents = Agent::query()
            ->with(['user.profile', 'parent.user'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (Agent $a) => $this->payload($a));

        return ApiResponse::success(['agents' => $agents->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:32'],
            'password' => ['required', Password::min(8)->letters()->numbers()],
            'referral_code' => ['nullable', 'string', 'max:32'],
        ]);
        // Flat agents only — ignore any parent hierarchy from clients.
        $data['parent_agent_id'] = null;

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
        }

        $code = strtoupper($data['referral_code'] ?? ('AGT-'.Str::upper(Str::random(4))));
        if (Agent::query()->where('referral_code', $code)->exists()) {
            throw ValidationException::withMessages(['referral_code' => ['Referral code already used.']]);
        }

        $tenantId = Tenant::default()->id;

        $agent = DB::transaction(function () use ($data, $email, $phone, $code, $tenantId) {
            $user = User::query()->create([
                'tenant_id' => $tenantId,
                'name' => $data['name'],
                'email' => $email,
                'phone' => $phone,
                'password' => $data['password'],
                'role' => UserRole::Agent,
                'status' => UserStatus::Active,
            ]);
            Profile::query()->create([
                'user_id' => $user->id,
                'display_name' => $data['name'],
                'country_code' => 'GH',
                'preferred_currency' => 'GHS',
            ]);

            return Agent::query()->create([
                'user_id' => $user->id,
                'referral_code' => $code,
                'parent_agent_id' => $data['parent_agent_id'] ?? null,
                'status' => 'active',
            ]);
        });

        $this->audit->log($request->user(), 'agent.create', $request, [
            'agent_id' => $agent->id,
            'parent_agent_id' => $agent->parent_agent_id,
        ], Agent::class, $agent->id);

        return ApiResponse::success([
            'agent' => $this->payload($agent->load(['user.profile', 'parent.user'])),
        ], 'Agent created', 201);
    }

    public function show(int $id): JsonResponse
    {
        $agent = Agent::query()->with(['user.profile', 'parent.user'])->find($id);
        if (! $agent) {
            return ApiResponse::error('Agent not found', 404);
        }

        return ApiResponse::success(['agent' => $this->payload($agent)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $agent = Agent::query()->with(['user.profile', 'parent.user'])->find($id);
        if (! $agent) {
            return ApiResponse::error('Agent not found', 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:32'],
            'password' => ['nullable', Password::min(8)->letters()->numbers()],
            'referral_code' => ['sometimes', 'string', 'max:32'],
            'status' => ['sometimes', 'string', 'in:active,inactive,suspended'],
        ]);
        $data['parent_agent_id'] = null;

        if (isset($data['email'])) {
            $email = Str::lower($data['email']);
            if (User::query()->where('email', $email)->where('id', '!=', $agent->user_id)->exists()) {
                throw ValidationException::withMessages(['email' => ['Email already in use.']]);
            }
            $data['email'] = $email;
        }

        if (array_key_exists('phone', $data) && $data['phone']) {
            $phone = PhoneNormalizer::normalizeGh($data['phone']);
            if (! $phone) {
                throw ValidationException::withMessages(['phone' => ['Invalid Ghana mobile number.']]);
            }
            $data['phone'] = $phone;
        }

        if (isset($data['referral_code'])) {
            $code = strtoupper($data['referral_code']);
            if (Agent::query()->where('referral_code', $code)->where('id', '!=', $agent->id)->exists()) {
                throw ValidationException::withMessages(['referral_code' => ['Referral code already used.']]);
            }
            $data['referral_code'] = $code;
        }

        DB::transaction(function () use ($agent, $data) {
            $userPatch = [];
            if (isset($data['name'])) {
                $userPatch['name'] = $data['name'];
            }
            if (isset($data['email'])) {
                $userPatch['email'] = $data['email'];
            }
            if (array_key_exists('phone', $data)) {
                $userPatch['phone'] = $data['phone'];
            }
            if (! empty($data['password'])) {
                $userPatch['password'] = $data['password'];
            }
            if ($userPatch !== []) {
                $agent->user?->update($userPatch);
                if (isset($data['name'])) {
                    $agent->user?->profile?->update(['display_name' => $data['name']]);
                }
            }

            $agentPatch = [];
            if (isset($data['referral_code'])) {
                $agentPatch['referral_code'] = $data['referral_code'];
            }
            if (array_key_exists('parent_agent_id', $data)) {
                $agentPatch['parent_agent_id'] = $data['parent_agent_id'];
            }
            if (isset($data['status'])) {
                $agentPatch['status'] = $data['status'];
            }
            if ($agentPatch !== []) {
                $agent->update($agentPatch);
            }
        });

        $this->audit->log($request->user(), 'agent.update', $request, [
            'agent_id' => $agent->id,
        ], Agent::class, $agent->id);

        return ApiResponse::success([
            'agent' => $this->payload($agent->fresh()->load(['user.profile', 'parent.user'])),
        ], 'Agent updated');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $agent = Agent::query()->with('user')->find($id);
        if (! $agent) {
            return ApiResponse::error('Agent not found', 404);
        }

        $agent->update(['status' => 'inactive', 'parent_agent_id' => null]);
        if ($agent->user) {
            $agent->user->update(['status' => UserStatus::Suspended]);
        }

        $this->audit->log($request->user(), 'agent.deactivate', $request, [
            'agent_id' => $agent->id,
        ], Agent::class, $agent->id);

        return ApiResponse::success(['agent' => $this->payload($agent->fresh()->load(['user.profile', 'parent.user']))], 'Agent deactivated');
    }

    private function payload(Agent $a): array
    {
        return [
            'id' => $a->id,
            'referralCode' => $a->referral_code,
            'status' => $a->status,
            'parentAgentId' => $a->parent_agent_id,
            'parentName' => $a->parent?->user?->name,
            'user' => [
                'id' => $a->user?->id,
                'name' => $a->user?->name,
                'email' => $a->user?->email,
                'phone' => $a->user?->phone,
            ],
        ];
    }
}
