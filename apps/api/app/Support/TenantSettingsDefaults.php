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
                // embedded_world = curated obscure leagues (offline generate; optional TheSportsDB live).
                'provider' => 'thesportsdb', // mock | football_data_org | thesportsdb | openligadb | embedded_world
                'openligadb_league' => 'bl1',
                'sync_top_leagues' => true,
                'sync_other_leagues' => true,
                // Always pull curated lesser-known leagues (in addition to the selected provider).
                'sync_obscure_leagues' => true,
                // Prefer live TheSportsDB kickoffs for obscure leagues; catalogue fills gaps.
                'obscure_live_sync' => true,
                'competition_codes' => 'PL,PD,BL1,SA,FL1,CL,ELC',
                'default_home_odds' => 2.1,
                'default_draw_odds' => 3.2,
                'default_away_odds' => 3.4,
                // Customer lobby only shows published fixtures — sync should publish by default.
                'auto_publish' => true,
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
                'licence_label' => 'Operator disclosures are configured by admin',
                'rg_footer_enabled' => true,
                'rg_message' => '18+ only. Play responsibly. Betting can be addictive. Only stake what you can afford to lose.',
                'self_exclusion_enabled' => false,
                'show_payment_mode_label' => true,
            ],
            'legal' => [
                'terms_title' => LegalContent::termsTitle(),
                'terms_body' => LegalContent::termsBody(),
                'privacy_title' => LegalContent::privacyTitle(),
                'privacy_body' => LegalContent::privacyBody(),
                'responsible_gambling_title' => LegalContent::responsibleGamblingTitle(),
                'responsible_gambling_body' => LegalContent::responsibleGamblingBody(),
                'about_title' => LegalContent::aboutTitle(),
                'about_body' => LegalContent::aboutBody(),
            ],
            'operations' => [
                // sandbox = demo/test money UX; live = operator production label (does not alone enable provider money rails)
                'environment' => 'sandbox', // sandbox | live
                'maintenance_enabled' => false,
                'maintenance_title' => "We'll be right back",
                'maintenance_message' => 'The sportsbook is undergoing scheduled maintenance. Please try again shortly.',
                'maintenance_eta' => null,
                // When true, Customer/Agent may show a sandbox-only strip. Live never shows a customer banner.
                'show_environment_banner' => false,
            ],
            'customer_messaging' => [
                'popup_enabled' => false,
                'popup_id' => 'welcome',
                'popup_title' => 'Welcome',
                'popup_body' => 'Place responsibly. 18+ only.',
                'popup_cta_label' => 'Got it',
                'popup_cta_url' => null,
                'popup_dismissible' => true,
                'toast_enabled' => true,
                'toast_id' => 'lobby-welcome',
                'toast_message' => 'Explore fixtures worldwide — including lesser-known leagues.',
                'toast_tone' => 'info', // info | success | warning
            ],
            'promotions' => [
                'deposit_bonus_enabled' => true,
                'deposit_bonus_mode' => 'percent', // percent | fixed
                'deposit_bonus_percent_bps' => 1000, // 10%
                'deposit_bonus_fixed_minor' => 1000, // GHS 10 when mode=fixed
                'deposit_bonus_max_minor' => 5000, // GHS 50 cap for percent mode
                'deposit_bonus_first_only' => true,
                'deposit_bonus_title' => 'Top-up bonus',
                'deposit_bonus_blurb' => 'Bonus GHS credited separately from cash. Bonus cannot be withdrawn.',
                'win_bonus_enabled' => true,
                'win_bonus_mode' => 'percent',
                'win_bonus_percent_bps' => 500, // 5% of net win
                'win_bonus_fixed_minor' => 500,
                'win_bonus_max_minor' => 2000, // GHS 20
                'win_bonus_title' => 'Win bonus',
                'win_bonus_blurb' => 'Extra bonus GHS on wins. Separate from cash; not withdrawable.',
                'max_bonus_stake_minor' => 2000, // max GHS 20 of a stake from bonus
            ],
        ];
    }

    /** @return list<string> */
    public static function groups(): array
    {
        return array_keys(self::all());
    }
}
