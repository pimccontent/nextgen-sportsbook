<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordPinResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_requires_valid_security_pin(): void
    {
        $tenantId = Tenant::query()->create([
            'slug' => 'default',
            'name' => 'Default',
            'status' => 'active',
        ])->id;

        User::query()->create([
            'tenant_id' => $tenantId,
            'name' => 'Cust',
            'phone' => '233241111111',
            'email' => 'c@test.local',
            'password' => 'Password1!',
            'security_pin_hash' => Hash::make('123456'),
            'role' => UserRole::Customer,
            'status' => UserStatus::Active,
        ]);

        $this->postJson('/api/v1/auth/password/reset', [
            'phone' => '0241111111',
            'security_pin' => '000000',
            'password' => 'Password2!',
            'password_confirmation' => 'Password2!',
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/password/reset', [
            'phone' => '0241111111',
            'security_pin' => '123456',
            'password' => 'Password2!',
            'password_confirmation' => 'Password2!',
        ])->assertOk();
    }
}
