<?php

namespace App\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Agent = 'agent';
    case Admin = 'admin';
    case SuperAdmin = 'super_admin';

    public function isStaff(): bool
    {
        return $this === self::Admin || $this === self::SuperAdmin;
    }

    public function label(): string
    {
        return match ($this) {
            self::Customer => 'Customer',
            self::Agent => 'Agent',
            self::Admin => 'Admin',
            self::SuperAdmin => 'Super Admin',
        };
    }
}
