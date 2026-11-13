<?php

namespace App\Support;

final class TenantSettingsDefaults
{
    /**
     * Sandbox demo defaults — operators must override for real installs.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function all(): array
    {
        return [
            'branding' => [
                'display_name' => 'NextGen',
                'legal_name' => 'NextGen Demo Operator',
                'logo_url' => null,
                'favicon_url' => null,
                'support_email' => 'support@example.com',
                'support_phone' => '0240000000',
                'customer_primary' => '#18181b',
                'color_primary' => '#18181b',
                'color_accent' => '#F5A524',
                'color_background' => '#fafafa',
                'color_surface' => '#ffffff',
                'color_text' => '#18181b',
                'font_display' => 'Sora',
                'font_body' => 'Manrope',
            ],
            'locale' => [
                'currency' => 'GHS',
                'currency_name' => 'Ghana Cedis',
                'minor_unit' => 'pesewa', // internal ledger unit only — UI shows Ghana Cedis
                'timezone' => 'Africa/Accra',
                'odds_format' => 'decimal',
                'age_minimum' => 18,
            ],
            'sports_data' => [
                // thesportsdb works with free demo key for testing; football_data_org needs a free token.
                'provider' => 'thesportsdb', // mock | football_data_org | thesportsdb
                'sync_top_leagues' => true,
                'sync_other_leagues' => true,
                'competition_codes' => 'PL,PD,BL1,SA,FL1,CL,ELC',
                'default_home_odds' => 2.1,
                'default_draw_odds' => 3.2,
                'default_away_odds' => 3.4,
                'auto_publish' => false,
            ],
            'betting' => [
                'min_stake_minor' => 100,
                'max_stake_minor' => 500000,
                'max_payout_minor' => 5000000,
                'bet_types' => 'singles_accumulators',
                'odds_change_policy' => 'reconfirm',
                'suspend_on_kickoff' => true,
                'void_on_postponed' => true,
                'void_on_abandoned' => true,
                'accumulator_void_rule' => 'recalculate',
                'cashout_enabled' => false,
                'prematch_only' => true,
            ],
            'wallet' => [
                'min_deposit_minor' => 500,
                'max_deposit_minor' => 1000000,
                'min_withdrawal_minor' => 1000,
                'max_withdrawal_minor' => 500000,
                'deposit_fee_minor' => 0,
                'withdrawal_fee_minor' => 0,
                'withdrawal_approval' => 'manual',
                'withdrawal_auto_threshold_minor' => 5000,
                'pending_definition' => 'Awaiting provider confirmation or admin review',
                'available_definition' => 'Settled funds available to stake or withdraw',
                'withdrawal_require_kyc' => true,
                'withdrawal_require_payout_details' => true,
                'withdrawal_daily_limit_minor' => 200000,
                'withdrawal_rules_title' => 'Withdrawal rules',
                'withdrawal_rules_text' => "1. Complete KYC before withdrawing.\n2. Add payout details (MoMo or bank).\n3. Respect min/max and daily limits.\n4. Requests may require admin approval.",
            ],
            'commissions' => [
                'attribution' => 'referral_code',
                'basis' => 'turnover',
                'rate_bps' => 200,
                'exclude_voids' => true,
                'exclude_bonuses' => true,
                'exclude_reversals' => true,
                'period' => 'monthly',
                'hold_days' => 7,
                'min_withdrawal_minor' => 5000,
                'bet_commissions_enabled' => true,
                'deposit_commissions_enabled' => true,
                'deposit_commissionable_default' => true,
            ],
            'payments' => [
                'provider' => 'paystack',
                'public_key' => '',
                'mode' => 'test',
                'callback_url' => 'http://localhost:3000/wallet',
                'webhook_url' => 'http://localhost:8081/api/v1/webhooks/paystack',
            ],
            'compliance' => [
                'jurisdiction' => 'GH',
                'licence_label' => 'Sandbox demo — not a licensed operator',
                'rg_footer_enabled' => true,
                'rg_message' => '18+ only. Play responsibly. Betting can be addictive.',
                'self_exclusion_enabled' => false,
            ],
            'legal' => [
                'terms_title' => 'Terms of Service',
                'terms_body' => "These sandbox Terms of Service apply to demo use only.\n\n1. You must be 18+.\n2. Funds and odds are simulated until licensed go-live.\n3. The operator may suspend accounts that abuse the platform.",
                'privacy_title' => 'Privacy Policy',
                'privacy_body' => "We process account data to operate this sportsbook demo.\n\n1. Phone and profile details identify your account.\n2. Payment references are stored for reconciliation.\n3. Contact support to request data corrections.",
                'responsible_gambling_title' => 'Responsible Gambling',
                'responsible_gambling_body' => "18+ only. Play responsibly. Betting can be addictive.\n\nSet personal limits and take breaks. Seek help if gambling stops being fun.",
                'about_title' => 'About',
                'about_body' => 'NextGen is a white-label sportsbook demo for Ghana (GHS).',
            ],
            'promotions' => [
                'deposit_bonus_enabled' => true,
                'deposit_bonus_percent_bps' => 1000, // 10%
                'deposit_bonus_max_minor' => 5000, // GHS 50
                'deposit_bonus_first_only' => true,
                'deposit_bonus_title' => 'Top-up bonus',
                'deposit_bonus_blurb' => 'Get a bonus on your first completed deposit (sandbox).',
                'win_bonus_enabled' => true,
                'win_bonus_percent_bps' => 500, // 5% of net win
                'win_bonus_max_minor' => 2000, // GHS 20
                'win_bonus_title' => 'Win bonus',
                'win_bonus_blurb' => 'Earn an extra bonus when your bet wins (sandbox, no wagering).',
            ],
        ];
    }

    /** @return list<string> */
    public static function groups(): array
    {
        return array_keys(self::all());
    }
}
