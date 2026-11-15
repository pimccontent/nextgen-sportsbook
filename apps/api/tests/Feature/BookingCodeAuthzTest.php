<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingCodeAuthzTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_cannot_create_booking_codes(): void
    {
        $tenantId = Tenant::query()->create([
            'slug' => 'default',
            'name' => 'Default',
            'status' => 'active',
        ])->id;

        $user = User::query()->create([
            'tenant_id' => $tenantId,
            'name' => 'Cust',
            'phone' => '233241111111',
            'email' => 'c@test.local',
            'password' => 'Password1!',
            'role' => UserRole::Customer,
            'status' => UserStatus::Active,
        ]);

        $token = $user->createToken('t', ['role:customer'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/admin/booking-codes', [
                'selection_public_ids' => ['sel_x'],
            ])
            ->assertStatus(403);
    }

    public function test_public_booking_codes_list_is_readable(): void
    {
        Tenant::query()->create([
            'slug' => 'default',
            'name' => 'Default',
            'status' => 'active',
        ]);

        $this->getJson('/api/v1/public/booking-codes')
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
