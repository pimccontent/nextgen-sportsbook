<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantSettingsService;
use Illuminate\Database\Seeder;

class TenantSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::query()->updateOrCreate(
            ['slug' => 'default'],
            ['name' => 'NextGen Demo', 'status' => 'active']
        );

        app(TenantSettingsService::class)->seedDefaults($tenant);

        User::query()->whereNull('tenant_id')->update(['tenant_id' => $tenant->id]);
    }
}
