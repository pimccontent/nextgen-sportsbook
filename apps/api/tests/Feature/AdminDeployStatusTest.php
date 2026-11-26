<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDeployStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_read_deploy_status(): void
    {
        $tenantId = Tenant::query()->create([
            'slug' => 'default',
            'name' => 'Default',
            'status' => 'active',
        ])->id;

        $user = User::query()->create([
            'tenant_id' => $tenantId,
            'name' => 'Super Admin',
            'email' => 'super@test.local',
            'password' => 'Password1!',
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
        ]);

        putenv('DEPLOY_URL_LAYOUT=path');
        putenv('DEPLOY_DOMAIN=bet.example.com');
        putenv('DEPLOY_CUSTOMER_URL=https://bet.example.com');
        putenv('DEPLOY_ADMIN_URL=https://admin.bet.example.com');
        putenv('DEPLOY_AGENT_URL=https://bet.example.com/agent');
        putenv('DEPLOY_API_URL=https://bet.example.com/api/v1');

        $token = $user->createToken('admin', ['role:super_admin'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/deploy')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.layout', 'path')
            ->assertJsonPath('data.domain', 'bet.example.com')
            ->assertJsonPath('data.urls.agent', 'https://bet.example.com/agent')
            ->assertJsonPath('data.dns_required.0', 'bet.example.com')
            ->assertJsonPath('data.dns_required.1', 'admin.bet.example.com');
    }

    public function test_admin_without_settings_perm_cannot_read_deploy(): void
    {
        $tenantId = Tenant::query()->create([
            'slug' => 'default',
            'name' => 'Default',
            'status' => 'active',
        ])->id;

        $user = User::query()->create([
            'tenant_id' => $tenantId,
            'name' => 'Limited',
            'email' => 'limited@test.local',
            'password' => 'Password1!',
            'role' => UserRole::Admin,
            'admin_permissions' => ['support'],
            'status' => UserStatus::Active,
        ]);

        $token = $user->createToken('admin', ['role:admin'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/deploy')
            ->assertStatus(403);
    }
}
