<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Bet;
use App\Models\PaymentIntent;
use App\Models\Tenant;
use App\Services\TenantSettingsService;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/**
 * Anonymized lobby activity for marketing / social proof.
 * Synthetic items are labelled; real items never expose PII.
 */
final class PublicActivityController
{
    public function __construct(private readonly TenantSettingsService $settings)
    {
    }

    public function __invoke(): JsonResponse
    {
        $tenant = Tenant::default();
        $messaging = $this->settings->getGroup($tenant, 'customer_messaging')['payload'] ?? [];

        $enabled = (bool) ($messaging['activity_enabled'] ?? false);
        if (! $enabled) {
            return ApiResponse::success([
                'enabled' => false,
                'items' => [],
                'illustrativeLabel' => (string) ($messaging['activity_illustrative_label'] ?? 'Illustrative'),
            ]);
        }

        $limit = max(3, min(30, (int) ($messaging['activity_limit'] ?? 12)));
        $minWin = max(0, (int) ($messaging['activity_min_win_minor'] ?? 500));
        $minWd = max(0, (int) ($messaging['activity_min_withdrawal_minor'] ?? 1000));
        $includeReal = (bool) ($messaging['activity_include_real'] ?? true);
        $includeFake = (bool) ($messaging['activity_include_fake'] ?? true);
        $label = (string) ($messaging['activity_illustrative_label'] ?? 'Illustrative');

        $items = [];

        if ($includeReal) {
            $items = array_merge($items, $this->realWins($tenant->id, $minWin, (int) ceil($limit / 2)));
            $items = array_merge($items, $this->realWithdrawals($tenant->id, $minWd, (int) ceil($limit / 2)));
        }

        if ($includeFake) {
            $need = max(0, $limit - count($items));
            if ($need > 0) {
                $items = array_merge($items, $this->syntheticItems($need, $minWin, $minWd));
            }
        }

        usort($items, fn ($a, $b) => strcmp((string) ($b['at'] ?? ''), (string) ($a['at'] ?? '')));
        $items = array_slice($items, 0, $limit);

        return ApiResponse::success([
            'enabled' => true,
            'items' => array_values($items),
            'illustrativeLabel' => $label,
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function realWins(int $tenantId, int $minMinor, int $limit): array
    {
        return Bet::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'won')
            ->where('potential_return_minor', '>=', $minMinor)
            ->whereNotNull('settled_at')
            ->orderByDesc('settled_at')
            ->limit($limit)
            ->get()
            ->map(function (Bet $bet) {
                return [
                    'id' => 'win-'.$bet->public_id,
                    'kind' => 'win',
                    'synthetic' => false,
                    'displayName' => $this->maskName('Player'),
                    'amountMinor' => (int) $bet->potential_return_minor,
                    'message' => 'just won',
                    'at' => $bet->settled_at?->toIso8601String(),
                ];
            })
            ->all();
    }

    /** @return list<array<string, mixed>> */
    private function realWithdrawals(int $tenantId, int $minMinor, int $limit): array
    {
        return PaymentIntent::query()
            ->where('tenant_id', $tenantId)
            ->where('direction', 'withdrawal')
            ->where('status', 'completed')
            ->where('amount_minor', '>=', $minMinor)
            ->orderByDesc('completed_at')
            ->limit($limit)
            ->get()
            ->map(function (PaymentIntent $p) {
                return [
                    'id' => 'wd-'.$p->id,
                    'kind' => 'withdrawal',
                    'synthetic' => false,
                    'displayName' => $this->maskName('Customer'),
                    'amountMinor' => (int) $p->amount_minor,
                    'message' => 'withdrew',
                    'at' => ($p->completed_at ?? $p->created_at)?->toIso8601String(),
                ];
            })
            ->all();
    }

    /** @return list<array<string, mixed>> */
    private function syntheticItems(int $count, int $minWin, int $minWd): array
    {
        $names = ['Kwame', 'Ama', 'Kofi', 'Abena', 'Yaw', 'Akosua', 'Kojo', 'Efua', 'Nana', 'Adwoa'];
        $out = [];
        $now = now();
        for ($i = 0; $i < $count; $i++) {
            $isWin = $i % 2 === 0;
            $name = $names[$i % count($names)];
            $amount = $isWin
                ? max($minWin, (int) (rand(8, 250) * 100))
                : max($minWd, (int) (rand(10, 180) * 100));
            $out[] = [
                'id' => 'syn-'.Str::lower(Str::random(10)),
                'kind' => $isWin ? 'win' : 'withdrawal',
                'synthetic' => true,
                'displayName' => $this->maskName($name),
                'amountMinor' => $amount,
                'message' => $isWin ? 'just won' : 'withdrew',
                'at' => $now->copy()->subMinutes($i * 7 + rand(1, 5))->toIso8601String(),
            ];
        }

        return $out;
    }

    private function maskName(string $name): string
    {
        $name = trim($name);
        if ($name === '') {
            return 'G***';
        }
        $first = mb_substr($name, 0, 1);

        return $first.'***';
    }
}
