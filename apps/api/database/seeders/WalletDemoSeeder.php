<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Services\LedgerService;
use App\Services\WalletService;
use Illuminate\Database\Seeder;

class WalletDemoSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::default();
        app(LedgerService::class)->ensureChart($tenant);

        $customer = User::query()->where('phone', '233241111111')->first();
        if (! $customer) {
            return;
        }

        $wallets = app(WalletService::class);
        $wallet = $wallets->forUser($customer);
        if ($wallet->available_minor > 0) {
            return;
        }

        $wallets->creditDeposit(
            $tenant,
            $wallet,
            25000,
            'seed-demo-deposit-'.$customer->id,
            null
        );
    }
}
