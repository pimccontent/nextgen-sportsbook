<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            TenantSettingsSeeder::class,
            IdentitySeeder::class,
            SportsCatalogueSeeder::class,
            WalletDemoSeeder::class,
            BannerSeeder::class,
        ]);
    }
}
