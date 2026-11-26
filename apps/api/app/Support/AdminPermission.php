<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\User;
use InvalidArgumentException;

final class AdminPermission
{
    /** @var list<string> */
    public const MODULES = [
        'dashboard',
        'fixtures',
        'competitions',
        'booking_codes',
        'settlement',
        'banners',
        'customers',
        'support',
        'deposits',
        'withdrawals',
        'agents',
        'agent_payouts',
        'settings',
        'audit',
    ];

    /** @return list<string> */
    public static function modules(): array
    {
        return self::MODULES;
    }

    /** @return array<string, string> */
    public static function labels(): array
    {
        return [
            'dashboard' => 'Dashboard',
            'fixtures' => 'Fixtures',
            'competitions' => 'Competitions',
            'booking_codes' => 'Booking codes',
            'settlement' => 'Settlement',
            'banners' => 'Banners',
            'customers' => 'Customer accounts',
            'support' => 'Live support',
            'deposits' => 'Deposits',
            'withdrawals' => 'Withdrawals',
            'agents' => 'Agents',
            'agent_payouts' => 'Agent payouts',
            'settings' => 'Settings',
            'audit' => 'Audit log',
        ];
    }

    public static function isValid(string $module): bool
    {
        return in_array($module, self::MODULES, true);
    }

    /**
     * @param  list<mixed>|null  $raw
     * @return list<string>
     */
    public static function sanitize(?array $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }

        $clean = [];
        foreach ($raw as $item) {
            if (! is_string($item)) {
                continue;
            }
            $key = trim($item);
            if (self::isValid($key) && ! in_array($key, $clean, true)) {
                $clean[] = $key;
            }
        }

        sort($clean);

        return $clean;
    }

    public static function isSuperAdmin(User $user): bool
    {
        return $user->role === UserRole::SuperAdmin;
    }

    public static function assertSuperAdmin(User $user): void
    {
        if (! self::isSuperAdmin($user)) {
            throw new InvalidArgumentException('Only Super Admin can manage staff.');
        }
    }

    /**
     * Effective modules for UI/API. Super Admin always gets the full catalog.
     *
     * @return list<string>
     */
    public static function effective(User $user): array
    {
        if (! $user->role->isStaff()) {
            return [];
        }

        if (self::isSuperAdmin($user)) {
            return self::MODULES;
        }

        return self::sanitize($user->admin_permissions);
    }

    public static function allows(User $user, string $module): bool
    {
        if (! $user->role->isStaff() || ! $user->isActive()) {
            return false;
        }

        if (self::isSuperAdmin($user)) {
            return true;
        }

        if (! self::isValid($module)) {
            return false;
        }

        return in_array($module, self::effective($user), true);
    }
}
