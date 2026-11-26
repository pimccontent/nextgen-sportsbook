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
                'support_chat_enabled' => false,
                'support_chat_label' => 'Live support',
                'customer_primary' => '#18181b',
                'color_primary' => '#18181b',
                'color_accent' => '#F5A524',
                'color_background' => '#f3f4f6',
                'color_surface' => '#ffffff',
                'color_text' => '#18181b',
                'font_display' => 'Sora',
                'font_body' => 'Manrope',
                // Full customer-app palette (day / night). Applied as CSS variables.
                'themes' => [
                    'day' => [
                        'bg' => '#f3f4f6',
                        'surface' => '#ffffff',
                        'surface_2' => '#eef0f3',
                        'border' => '#e2e5ea',
                        'text' => '#18181b',
                        'muted' => '#71717a',
                        'accent' => '#F5A524',
                        'accent_ink' => '#18181b',
                        'danger' => '#dc2626',
                        'live' => '#dc2626',
                        'odds_up' => '#16a34a',
                        'odds_down' => '#e11d48',
                        'win' => '#16a34a',
                        'loss' => '#71717a',
                        'atmosphere_base' => '#f3f4f6',
                        'atmosphere_mid' => '#e8ebef',
                        'atmosphere_edge' => 'rgba(24, 28, 36, 0.045)',
                        'chat_panel' => '#ffffff',
                        'chat_input' => '#eef0f3',
                        'chat_composer' => '#ffffff',
                        'chat_bubble_mine' => '#F5A524',
                        'chat_bubble_mine_ink' => '#18181b',
                        'chat_bubble_peer' => '#f8f9fb',
                        'chat_bubble_peer_border' => '#e2e5ea',
                        'chat_system' => '#e4e4e7',
                    ],
                    'night' => [
                        'bg' => '#090a0c',
                        'surface' => '#111318',
                        'surface_2' => '#181b21',
                        'border' => '#2a2e36',
                        'text' => '#f4f4f5',
                        'muted' => '#9ca3af',
                        'accent' => '#F5A524',
                        'accent_ink' => '#0a0a0a',
                        'danger' => '#f87171',
                        'live' => '#f87171',
                        'odds_up' => '#4ade80',
                        'odds_down' => '#fb7185',
                        'win' => '#4ade80',
                        'loss' => '#9ca3af',
                        'atmosphere_base' => '#090a0c',
                        'atmosphere_mid' => '#12151a',
                        'atmosphere_edge' => 'rgba(36, 42, 54, 0.45)',
                        'chat_panel' => '#111318',
                        'chat_input' => '#181b21',
                        'chat_composer' => '#111318',
                        'chat_bubble_mine' => '#F5A524',
                        'chat_bubble_mine_ink' => '#0a0a0a',
                        'chat_bubble_peer' => '#181b21',
                        'chat_bubble_peer_border' => '#2a2e36',
                        'chat_system' => '#27272a',
                    ],
                ],
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
            'support_chat' => [
                'enabled' => false,
                'widget_enabled' => true,
                'title' => 'Live support',
                'subtitle' => 'Chat with our team in real time',
                'greeting' => 'Hi! How can we help you today?',
                'offline_message' => 'Our team is currently offline. Leave a message and we will reply when we are back.',
                'allow_customer_reopen' => false,
                'business_hours_enabled' => false,
                'business_hours_start' => '09:00',
                'business_hours_end' => '21:00',
                'timezone' => 'Africa/Accra',
                'sound_enabled' => true,
                'enter_to_send' => true,
                'poll_interval_ms' => 2000,
                'canned_replies' => [
                    [
                        'id' => 'hello',
                        'title' => 'Greeting',
                        'body' => 'Hello! Thanks for reaching out. How can we help?',
                    ],
                    [
                        'id' => 'deposit',
                        'title' => 'Deposit help',
                        'body' => 'Please share your deposit reference and amount so we can check it for you.',
                    ],
                    [
                        'id' => 'closing',
                        'title' => 'Closing',
                        'body' => 'Glad we could help. Feel free to message again anytime.',
                    ],
                ],
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
                // Lobby activity popups (wins / withdrawals) — real anonymized + optional synthetic.
                'activity_enabled' => false,
                'activity_include_real' => true,
                'activity_include_fake' => true,
                'activity_limit' => 12,
                'activity_min_win_minor' => 500,
                'activity_min_withdrawal_minor' => 1000,
                'activity_interval_ms' => 10000,
                'activity_display_ms' => 4500,
                // bottom_left | bottom_center | bottom_right | top_left | top_center | top_right
                'activity_position' => 'bottom_left',
                'activity_illustrative_label' => 'Illustrative',
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
