<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Agent;
use App\Models\Profile;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class IdentitySeeder extends Seeder
{
    public function run(): void
    {
        $tenantId = Tenant::query()->where('slug', 'default')->value('id');

        $customer = User::query()->updateOrCreate(
            ['phone' => '233241111111'],
            [
                'tenant_id' => $tenantId,
                'name' => 'Demo Customer',
                'email' => '233241111111@phone.nextgen.local',
                'password' => 'Password1!',
                'role' => UserRole::Customer,
                'status' => UserStatus::Active,
            ]
        );
        Profile::query()->updateOrCreate(
            ['user_id' => $customer->id],
            [
                'display_name' => 'Demo Customer',
                'country_code' => 'GH',
                'preferred_currency' => 'GHS',
            ]
        );

        $agentUser = User::query()->updateOrCreate(
            ['email' => 'agent@nextgen.local'],
            [
                'tenant_id' => $tenantId,
                'name' => 'Demo Agent',
                'phone' => '233242222222',
                'password' => 'Password1!',
                'role' => UserRole::Agent,
                'status' => UserStatus::Active,
            ]
        );
        Profile::query()->updateOrCreate(
            ['user_id' => $agentUser->id],
            [
                'display_name' => 'Demo Agent',
                'country_code' => 'GH',
                'preferred_currency' => 'GHS',
            ]
        );
        Agent::query()->updateOrCreate(
            ['user_id' => $agentUser->id],
            [
                'referral_code' => 'AGT-7K2M',
                'status' => 'active',
            ]
        );

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@nextgen.local'],
            [
                'tenant_id' => $tenantId,
                'name' => 'Super Administrator',
                'phone' => null,
                'password' => 'Password1!',
                'role' => UserRole::SuperAdmin,
                'status' => UserStatus::Active,
                'two_factor_enabled' => true,
            ]
        );
        Profile::query()->updateOrCreate(
            ['user_id' => $admin->id],
            [
                'display_name' => 'Super Administrator',
                'country_code' => 'GH',
                'preferred_currency' => 'GHS',
            ]
        );
    }
}
