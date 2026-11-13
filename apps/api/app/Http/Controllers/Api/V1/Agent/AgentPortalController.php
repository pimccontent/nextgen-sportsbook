<?php

namespace App\Http\Controllers\Api\V1\Agent;

use App\Models\Agent;
use App\Models\AgentPayout;
use App\Models\CommissionEntry;
use App\Models\PaymentIntent;
use App\Models\Profile;
use App\Models\User;
use App\Services\AgentPayoutService;
use App\Services\CommissionService;
use App\Shared\Http\ApiResponse;
use App\Support\PhoneNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

final class AgentPortalController
{
    public function __construct(
        private readonly CommissionService $commissions,
        private readonly AgentPayoutService $payouts,
    ) {
    }

    public function overview(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        $summary = $this->commissions->summaryForAgent($agent->id);
        $customerProfiles = Profile::query()
            ->where('preferences->referred_by_agent_id', $agent->id)
            ->with('user')
            ->orderByDesc('id')
            ->get();
        $customerCount = $customerProfiles->count();
        $userIds = $customerProfiles->pluck('user_id')->all();
        $joinedThisWeek = $customerProfiles
            ->filter(fn (Profile $p) => $p->created_at && $p->created_at->gte(now()->subDays(7)))
            ->count();

        $depositAgg = empty($userIds)
            ? (object) ['c' => 0, 'total' => 0]
            : PaymentIntent::query()
                ->where('direction', 'deposit')
                ->where('status', 'completed')
                ->where('commissionable', true)
                ->whereIn('user_id', $userIds)
                ->selectRaw('count(*) as c, coalesce(sum(amount_minor), 0) as total')
                ->first();

        $pendingPayouts = AgentPayout::query()
            ->where('agent_id', $agent->id)
            ->where('status', 'pending')
            ->selectRaw('count(*) as c, coalesce(sum(amount_minor), 0) as total')
            ->first();

        $earnedMinor = (int) $summary['pendingMinor']
            + (int) $summary['availableMinor']
            + (int) $summary['paidMinor'];

        $recentCustomers = $customerProfiles->take(5)->map(fn (Profile $p) => [
            'userId' => $p->user_id,
            'name' => $p->display_name ?? $p->user?->name,
            'joinedAt' => $p->created_at?->toIso8601String(),
        ])->values();

        $recentCommissions = CommissionEntry::query()
            ->where('agent_id', $agent->id)
            ->whereIn('status', ['pending', 'available', 'paid'])
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (CommissionEntry $e) => [
                'id' => $e->id,
                'source' => $e->source ?: 'bet',
                'status' => $e->status,
                'amountMinor' => $e->amount_minor,
                'createdAt' => $e->created_at?->utc()->toIso8601String(),
            ])
            ->values();

        $origin = rtrim((string) (env('CUSTOMER_APP_ORIGIN') ?: 'http://localhost:3000'), '/');

        return ApiResponse::success([
            'referralCode' => $agent->referral_code,
            'referralLink' => $origin.'/register?ref='.urlencode($agent->referral_code),
            'status' => $agent->status,
            'payoutConfigured' => (bool) ($agent->payout_method && $agent->payout_account),
            'customers' => $customerCount,
            'customersJoinedThisWeek' => $joinedThisWeek,
            'commissionableDeposits' => (int) ($depositAgg->c ?? 0),
            'commissionableDepositMinor' => (int) ($depositAgg->total ?? 0),
            'pendingPayouts' => (int) ($pendingPayouts->c ?? 0),
            'pendingPayoutMinor' => (int) ($pendingPayouts->total ?? 0),
            'earnedMinor' => $earnedMinor,
            'commissions' => $summary,
            'recentCustomers' => $recentCustomers,
            'recentCommissions' => $recentCommissions,
        ]);
    }

    public function customers(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        $profiles = Profile::query()
            ->where('preferences->referred_by_agent_id', $agent->id)
            ->with('user')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        $userIds = $profiles->pluck('user_id')->all();
        $depositTotals = PaymentIntent::query()
            ->where('direction', 'deposit')
            ->where('status', 'completed')
            ->where('commissionable', true)
            ->whereIn('user_id', $userIds)
            ->selectRaw('user_id, count(*) as c, sum(amount_minor) as total')
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        $rows = $profiles->map(function (Profile $p) use ($depositTotals) {
            $dep = $depositTotals->get($p->user_id);

            return [
                'userId' => $p->user_id,
                'name' => $p->display_name ?? $p->user?->name,
                'phone' => $p->user?->phone,
                'joinedAt' => $p->created_at?->toIso8601String(),
                'commissionableDeposits' => (int) ($dep->c ?? 0),
                'commissionableDepositMinor' => (int) ($dep->total ?? 0),
            ];
        });

        return ApiResponse::success(['customers' => $rows->values()]);
    }

    public function profile(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        /** @var User $user */
        $user = $request->user();
        $summary = $this->commissions->summaryForAgent($agent->id);
        $origin = rtrim((string) (env('CUSTOMER_APP_ORIGIN') ?: 'http://localhost:3000'), '/');

        return ApiResponse::success([
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'referralCode' => $agent->referral_code,
            'referralLink' => $origin.'/register?ref='.urlencode($agent->referral_code),
            'status' => $agent->status,
            'payout' => [
                'method' => $agent->payout_method,
                'network' => $agent->payout_network,
                'account' => $agent->payout_account,
                'accountName' => $agent->payout_account_name,
            ],
            'commissions' => $summary,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:32'],
        ]);

        $email = strtolower(trim($data['email']));
        if (User::query()->where('email', $email)->where('id', '!=', $user->id)->exists()) {
            throw ValidationException::withMessages(['email' => ['Email already in use.']]);
        }
        $user->email = $email;

        if (array_key_exists('phone', $data)) {
            if (! empty($data['phone'])) {
                $phone = PhoneNormalizer::normalizeGh($data['phone']);
                if (! $phone) {
                    throw ValidationException::withMessages(['phone' => ['Invalid Ghana mobile number.']]);
                }
                if (User::query()->where('phone', $phone)->where('id', '!=', $user->id)->exists()) {
                    throw ValidationException::withMessages(['phone' => ['Phone already in use.']]);
                }
                $user->phone = $phone;
            } else {
                $user->phone = null;
            }
        }

        $user->name = $data['name'];
        $user->save();
        $user->profile?->update(['display_name' => $data['name']]);

        return $this->profile($request);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Current password is incorrect.']]);
        }
        $user->update(['password' => $data['password']]);

        return ApiResponse::success(null, 'Password updated');
    }

    public function updatePayoutAccount(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        $data = $request->validate([
            'method' => ['required', 'in:momo,bank'],
            'network' => ['nullable', 'string', 'max:64'],
            'account' => ['required', 'string', 'max:64'],
            'account_name' => ['required', 'string', 'max:120'],
        ]);
        $agent->payout_method = $data['method'];
        $agent->payout_network = $data['network'] ?? null;
        $agent->payout_account = $data['account'];
        $agent->payout_account_name = $data['account_name'];
        $agent->save();

        return $this->profile($request);
    }

    public function payouts(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        $rows = AgentPayout::query()
            ->where('agent_id', $agent->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (AgentPayout $p) => [
                'id' => $p->public_id,
                'status' => $p->status,
                'amountMinor' => $p->amount_minor,
                'method' => $p->payout_method,
                'account' => $p->payout_account,
                'createdAt' => $p->created_at?->utc()->toIso8601String(),
                'processedAt' => $p->processed_at?->utc()->toIso8601String(),
            ]);

        return ApiResponse::success(['payouts' => $rows->values()]);
    }

    public function requestPayout(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        $data = $request->validate([
            'amount_minor' => ['required', 'integer', 'min:1'],
            'idempotency_key' => ['required', 'string', 'max:128'],
        ]);
        try {
            $payout = $this->payouts->request($agent, (int) $data['amount_minor'], $data['idempotency_key']);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success([
            'payout' => [
                'id' => $payout->public_id,
                'status' => $payout->status,
                'amountMinor' => $payout->amount_minor,
            ],
            'commissions' => $this->commissions->summaryForAgent($agent->id),
        ], 'Payout requested', 201);
    }

    private function agent(Request $request): Agent
    {
        $agent = Agent::query()->where('user_id', $request->user()->id)->first();
        abort_unless($agent, 404, 'Agent profile not found');

        return $agent;
    }
}
