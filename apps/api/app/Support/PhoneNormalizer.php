<?php

namespace App\Support;

final class PhoneNormalizer
{
    /**
     * Normalize Ghana mobile numbers to E.164-ish local form: 233XXXXXXXXX
     */
    public static function normalizeGh(string $raw): ?string
    {
        $digits = preg_replace('/\D+/', '', $raw) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '233') && strlen($digits) === 12) {
            return $digits;
        }

        if (str_starts_with($digits, '0') && strlen($digits) === 10) {
            return '233'.substr($digits, 1);
        }

        if (strlen($digits) === 9) {
            return '233'.$digits;
        }

        return null;
    }

    public static function syntheticEmail(string $normalizedPhone): string
    {
        return $normalizedPhone.'@phone.nextgen.local';
    }
}
