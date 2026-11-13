<?php

namespace App\Services;

use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\LedgerJournal;
use App\Models\Tenant;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class LedgerService
{
    public function ensureChart(Tenant $tenant): void
    {
        $accounts = [
            ['code' => 'cash_clearing', 'name' => 'Cash clearing', 'type' => 'asset'],
            ['code' => 'customer_liability', 'name' => 'Customer wallet liability', 'type' => 'liability'],
            ['code' => 'betting_revenue', 'name' => 'Betting revenue', 'type' => 'revenue'],
            ['code' => 'betting_liability', 'name' => 'Open bet liability', 'type' => 'liability'],
            ['code' => 'commission_expense', 'name' => 'Agent commission expense', 'type' => 'expense'],
            ['code' => 'promo_expense', 'name' => 'Promotion expense', 'type' => 'expense'],
        ];

        foreach ($accounts as $a) {
            LedgerAccount::query()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'code' => $a['code']],
                ['name' => $a['name'], 'type' => $a['type'], 'currency' => 'GHS']
            );
        }
    }

    public function account(Tenant $tenant, string $code): LedgerAccount
    {
        $this->ensureChart($tenant);
        $account = LedgerAccount::query()
            ->where('tenant_id', $tenant->id)
            ->where('code', $code)
            ->first();

        if (! $account) {
            throw new RuntimeException("Missing ledger account {$code}");
        }

        return $account;
    }

    /**
     * @param  list<array{account: string, debit?: int, credit?: int, wallet_id?: int|null}>  $lines
     */
    public function post(
        Tenant $tenant,
        string $idempotencyKey,
        string $type,
        array $lines,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $memo = null,
    ): LedgerJournal {
        $existing = LedgerJournal::query()
            ->where('tenant_id', $tenant->id)
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) {
            return $existing;
        }

        $debit = 0;
        $credit = 0;
        foreach ($lines as $line) {
            $debit += (int) ($line['debit'] ?? 0);
            $credit += (int) ($line['credit'] ?? 0);
        }
        if ($debit !== $credit || $debit <= 0) {
            throw new RuntimeException('Journal must balance with positive totals.');
        }

        return DB::transaction(function () use ($tenant, $idempotencyKey, $type, $lines, $referenceType, $referenceId, $memo) {
            $journal = LedgerJournal::query()->create([
                'tenant_id' => $tenant->id,
                'idempotency_key' => $idempotencyKey,
                'type' => $type,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'currency' => 'GHS',
                'memo' => $memo,
                'posted_at' => now(),
            ]);

            foreach ($lines as $line) {
                $account = $this->account($tenant, $line['account']);
                LedgerEntry::query()->create([
                    'journal_id' => $journal->id,
                    'ledger_account_id' => $account->id,
                    'wallet_id' => $line['wallet_id'] ?? null,
                    'debit_minor' => (int) ($line['debit'] ?? 0),
                    'credit_minor' => (int) ($line['credit'] ?? 0),
                ]);
            }

            return $journal;
        });
    }

    public function creditAvailable(Wallet $wallet, int $amountMinor): void
    {
        $updated = Wallet::query()
            ->where('id', $wallet->id)
            ->where('version', $wallet->version)
            ->update([
                'available_minor' => $wallet->available_minor + $amountMinor,
                'version' => $wallet->version + 1,
            ]);
        if ($updated !== 1) {
            throw new RuntimeException('Wallet concurrency conflict.');
        }
        $wallet->refresh();
    }

    public function reserveStake(Wallet $wallet, int $amountMinor): void
    {
        if ($wallet->available_minor < $amountMinor) {
            throw new RuntimeException('Insufficient available balance.');
        }
        $updated = Wallet::query()
            ->where('id', $wallet->id)
            ->where('version', $wallet->version)
            ->where('available_minor', '>=', $amountMinor)
            ->update([
                'available_minor' => $wallet->available_minor - $amountMinor,
                'reserved_minor' => $wallet->reserved_minor + $amountMinor,
                'version' => $wallet->version + 1,
            ]);
        if ($updated !== 1) {
            throw new RuntimeException('Unable to reserve stake.');
        }
        $wallet->refresh();
    }

    public function consumeReserved(Wallet $wallet, int $amountMinor): void
    {
        $updated = Wallet::query()
            ->where('id', $wallet->id)
            ->where('version', $wallet->version)
            ->where('reserved_minor', '>=', $amountMinor)
            ->update([
                'reserved_minor' => $wallet->reserved_minor - $amountMinor,
                'version' => $wallet->version + 1,
            ]);
        if ($updated !== 1) {
            throw new RuntimeException('Unable to consume reserved funds.');
        }
        $wallet->refresh();
    }

    public function releaseReservedToAvailable(Wallet $wallet, int $amountMinor): void
    {
        $updated = Wallet::query()
            ->where('id', $wallet->id)
            ->where('version', $wallet->version)
            ->where('reserved_minor', '>=', $amountMinor)
            ->update([
                'reserved_minor' => $wallet->reserved_minor - $amountMinor,
                'available_minor' => $wallet->available_minor + $amountMinor,
                'version' => $wallet->version + 1,
            ]);
        if ($updated !== 1) {
            throw new RuntimeException('Unable to release reserved funds.');
        }
        $wallet->refresh();
    }
}
