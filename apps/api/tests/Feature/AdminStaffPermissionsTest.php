<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Profile;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminStaffPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private function tenantId(): int
    {
        return Tenant::query()->create([
            'slug' => 'default',
            'name' => 'Default',
            'status' => 'active',
        ])->id;
    }

    private function makeStaff(
        int $tenantId,
        UserRole $role,
        string $email,
        ?array $permissions = null
    ): User {
        $user = User::query()->create([
            'tenant_id' => $tenantId,
            'name' => $role === UserRole::SuperAdmin ? 'Super Admin' : 'Staff Admin',
            'email' => $email,
            'phone' => null,
            'password' => 'Password1!',
            'role' => $role,
            'admin_permissions' => $permissions,
            'status' => UserStatus::Active,
        ]);
        Profile::query()->create([
            'user_id' => $user->id,
            'display_name' => $user->name,
            'country_code' => 'GH',
            'preferred_currency' => 'GHS',
        ]);

        return $user;
    }

    private function tokenFor(User $user): string
    {
        return $user->createToken('admin', ['role:'.$user->role->value])->plainTextToken;
    }

    public function test_super_admin_can_create_and_list_staff(): void
    {
        $tenantId = $this->tenantId();
        $super = $this->makeStaff($tenantId, UserRole::SuperAdmin, 'super@test.local');

        $create = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($super))
            ->postJson('/api/v1/admin/staff', [
                'name' => 'Limited Staff',
                'email' => 'limited@test.local',
                'password' => 'Password1!',
                'permissions' => ['support', 'deposits', 'bogus'],
            ]);

        $create->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.staff.email', 'limited@test.local')
            ->assertJsonPath('data.staff.role', 'admin')
            ->assertJsonPath('data.staff.permissions', ['deposits', 'support']);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($super))
            ->getJson('/api/v1/admin/staff')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data.staff');
    }

    public function test_regular_admin_cannot_access_staff_api(): void
    {
        $tenantId = $this->tenantId();
        $this->makeStaff($tenantId, UserRole::SuperAdmin, 'super@test.local');
        $staff = $this->makeStaff(
            $tenantId,
            UserRole::Admin,
            'staff@test.local',
            ['support', 'deposits']
        );

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($staff))
            ->getJson('/api/v1/admin/staff')
            ->assertStatus(403);
    }

    public function test_admin_without_fixtures_perm_gets_403(): void
    {
        $tenantId = $this->tenantId();
        $staff = $this->makeStaff(
            $tenantId,
            UserRole::Admin,
            'support-only@test.local',
            ['support']
        );

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($staff))
            ->getJson('/api/v1/admin/fixtures')
            ->assertStatus(403)
            ->assertJsonPath('message', 'You do not have permission for this module.');
    }

    public function test_super_admin_bypasses_module_permissions(): void
    {
        $tenantId = $this->tenantId();
        $super = $this->makeStaff($tenantId, UserRole::SuperAdmin, 'super@test.local');

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($super))
            ->getJson('/api/v1/admin/fixtures')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_staff_can_read_and_update_own_account(): void
    {
        $tenantId = $this->tenantId();
        $staff = $this->makeStaff(
            $tenantId,
            UserRole::Admin,
            'account@test.local',
            ['dashboard']
        );

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($staff))
            ->getJson('/api/v1/admin/account')
            ->assertOk()
            ->assertJsonPath('data.account.email', 'account@test.local')
            ->assertJsonPath('data.account.is_super_admin', false)
            ->assertJsonPath('data.account.permissions', ['dashboard']);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($staff))
            ->putJson('/api/v1/admin/account', [
                'name' => 'Account Updated',
                'display_name' => 'Account Display',
            ])
            ->assertOk()
            ->assertJsonPath('data.account.name', 'Account Updated')
            ->assertJsonPath('data.account.display_name', 'Account Display');
    }

    public function test_staff_can_change_own_password(): void
    {
        $tenantId = $this->tenantId();
        $staff = $this->makeStaff(
            $tenantId,
            UserRole::Admin,
            'pw@test.local',
            ['dashboard']
        );

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($staff))
            ->putJson('/api/v1/admin/account/password', [
                'current_password' => 'Password1!',
                'password' => 'Password2!',
                'password_confirmation' => 'Password2!',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
