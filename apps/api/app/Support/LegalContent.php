<?php

namespace App\Support;

/**
 * Default operator-editable legal copy for Admin Settings → Legal.
 * Not a substitute for licensed legal counsel or regulator-approved text.
 */
final class LegalContent
{
    public static function termsTitle(): string
    {
        return 'Terms of Service';
    }

    public static function termsBody(): string
    {
        return <<<'TXT'
Important notice
These Terms of Service (“Terms”) govern your use of this sportsbook platform (the “Service”), operated by the business entity shown in Admin branding and licence disclosures (“Operator”, “we”, “us”). By creating an account, depositing funds, loading a booking code, or placing a bet, you agree to these Terms.

These Terms are an operator-editable standard. They are not licensed legal advice. Where a Ghana gaming licence, payment-provider rules, or other law applies, those requirements prevail. The Operator must complete independent legal and regulatory review before offering real-money betting to the public.

1. Who may use the Service
1.1 You must be at least 18 years old (or the higher legal age in your location, if greater).
1.2 You must be legally allowed to use online sports betting services where you access the Service.
1.3 You confirm that the name, mobile number, email, and other details you provide are true, current, and yours.
1.4 One person should maintain one customer account unless the Operator expressly allows otherwise.
1.5 We may refuse, suspend, or close accounts that fail eligibility checks, fail KYC, or breach these Terms.

2. Your account
2.1 You are responsible for keeping your password and account PIN private.
2.2 Activity under your account is treated as yours, including bets placed after you load a booking code.
2.3 Password reset uses your registered mobile number and account PIN. Keep your PIN safe.
2.4 Tell support immediately if you believe someone else used your account.
2.5 We may require identity, address, or payout verification (KYC) before withdrawals or at other times.

3. Money, wallet, and currency
3.1 The Service uses Ghana Cedis (GHS). Balances and stakes are shown in GHS.
3.2 Your wallet may include:
• Cash (available) — funds you can use to bet and, subject to rules, withdraw;
• Bonus — promotional funds that may help fund stakes under the Operator’s bonus rules, but cannot be withdrawn as cash;
• Reserved — amounts held for open bets or pending withdrawals.
3.3 Deposits are processed through the Operator’s configured payment provider (for example Paystack). In live operation, deposits complete only after the payment provider confirms payment to our systems. In sandbox/test mode, demo top-ups may be used for testing only.
3.4 Withdrawals are subject to minimum/maximum limits, fees, KYC, payout details, and Operator approval rules published in Settings.
3.5 Winnings from settled winning bets are credited to cash, not bonus, unless a specific promotion states otherwise.
3.6 You must not attempt to reverse, charge back, or dispute legitimate deposits in bad faith. We may suspend accounts and recover amounts where permitted by law and provider rules.

4. Placing bets
4.1 A bet is only accepted after our systems validate the event, market, selection, odds, stake, wallet funds, and applicable limits.
4.2 The odds and market state stored with your accepted bet are the odds that apply to settlement of that bet, subject to the Operator’s odds-change and void rules.
4.3 If odds change before acceptance, the Service may require you to confirm again, reject the bet, or apply the policy set by the Operator.
4.4 Duplicate or repeated submissions may be rejected. Do not assume a bet is placed until you receive a confirmed bet receipt in My bets.
4.5 Stake limits, maximum payout, allowed bet types (for example singles and accumulators), and cash-out availability are set by the Operator and may change.
4.6 Pre-match and live availability depends on Operator configuration. Markets may be suspended or removed at any time.

5. Settlement, voids, and results
5.1 Settlement is based on official or Operator-accepted results for the relevant market.
5.2 The Operator may void, suspend, or recalculate bets where an event is postponed, abandoned, or where markets are void under published rules.
5.3 For accumulators, if a leg is void, the Operator’s accumulator void rule (for example recalculate) applies.
5.4 Displayed scores, clocks, and live updates are informational. Final settlement follows the Operator’s settlement process.
5.5 If you believe a settlement error occurred, contact support promptly with your bet reference.

6. Booking codes
6.1 A booking code is a selection template only. Loading a code does not place a bet and creates no stake until you confirm and place the bet yourself.
6.2 You remain fully responsible for reviewing every selection, odds, and stake before you place a bet from a code.
6.3 Admin or agent booking-code tools do not create betting liability until a customer places a paid bet.

7. Promotions and bonus funds
7.1 Promotions (including deposit or win bonuses) are optional and governed by the rules shown at the time of the offer and in Admin promotion settings.
7.2 Bonus funds are separate from cash, may be limited in how much of a stake they can fund, and are not withdrawable.
7.3 Abuse of promotions (including multi-accounting or circular funding) may lead to cancellation of bonuses, bets, or accounts.

8. Agents and referrals
8.1 If you register with a referral code, your account may be attributed to an agent for commission purposes under Operator rules.
8.2 Agents do not place bets on your behalf merely by sharing a booking code. You decide whether to stake.

9. Prohibited conduct
You must not:
• use the Service if underage or otherwise ineligible;
• provide false identity or payment details;
• use another person’s account or allow others to use yours;
• attempt fraud, money laundering, or payment abuse;
• attack, scrape, or interfere with the Service;
• exploit software errors for unfair advantage—report errors to support instead.

We may suspend accounts, cancel bets, withhold funds pending investigation, and take other steps permitted by law and these Terms.

10. Service availability
10.1 We aim for reliable service but do not guarantee uninterrupted access.
10.2 Maintenance windows, network issues, or third-party outages may delay betting, deposits, or withdrawals.
10.3 During maintenance, customer and agent access may be limited while admin tools remain available to the Operator.

11. Intellectual property and branding
The Service’s software, design, logos (as uploaded by the Operator), and content are owned by the Operator or its licensors. You may use the Service for personal betting only, not for copying or reselling the platform.

12. Limitation of liability
To the maximum extent permitted by applicable law:
12.1 You use the Service at your own risk and are solely responsible for your betting decisions and financial losses from betting.
12.2 We are not liable for losses caused by your device, internet connection, or third-party payment or data providers beyond our reasonable control.
12.3 Nothing in these Terms excludes liability that cannot be excluded under Ghanaian or other applicable law.

13. Privacy
Our handling of personal data is described in the Privacy Policy. By using the Service you also acknowledge that Policy.

14. Responsible gambling
Betting can be harmful if misused. Please read Responsible Gambling. If gambling is no longer entertainment for you, stop and seek help.

15. Changes to these Terms
The Operator may update these Terms through Admin Settings. Continued use after an update means you accept the revised Terms. Material changes should be communicated through the Service where practical.

16. Contact
For account, payment, or settlement questions, use the support email or phone published in the Service branding settings.

17. Governing approach
These Terms are intended for operation in Ghana (GHS). If a dispute arises, the Operator’s support process should be used first. Formal legal venue and governing law should be confirmed by the Operator’s counsel to match the licensed entity.
TXT;
    }

    public static function privacyTitle(): string
    {
        return 'Privacy Policy';
    }

    public static function privacyBody(): string
    {
        return <<<'TXT'
Important notice
This Privacy Policy explains how the Operator of this sportsbook (“we”, “us”) collects, uses, stores, and shares personal data when you use the customer, agent, or related services (the “Service”). It is an operator-editable standard and is not a substitute for counsel advice or a regulator-approved notice. The Operator must align this Policy with Ghana’s Data Protection Act, 2012 (Act 843) and any licence conditions before live public operation.

1. Who we are
The Operator is the business identified in the Service’s branding and licence disclosures. Support contact details appear in branding settings (email and/or phone).

2. Data we collect
Depending on how you use the Service, we may process:

A. Identity and contact
• Full name or display name
• Mobile number
• Email address (required for deposits through payment providers such as Paystack)
• Account PIN (stored only as a secure hash, not in plain text)
• Password (stored only as a secure hash)

B. Profile and verification
• Country preference and currency preference (GHS)
• KYC status and documents or details you submit for verification
• Payout / withdrawal destination details you provide

C. Financial and betting activity
• Wallet balances (cash, bonus, reserved)
• Deposits, withdrawals, payment references, and status
• Bets, selections, stakes, odds accepted, and settlement outcomes
• Promotions and bonus awards
• Agent referral attribution where applicable

D. Technical and security data
• Login sessions and authentication tokens
• Approximate security signals such as rate-limit and abuse-prevention logs
• Device/browser information reasonably needed to run the Service
• Audit records of sensitive admin or financial actions

We do not ask you to store card numbers inside the sportsbook app. Card payments are handled by the configured payment provider.

3. Why we use your data (purposes)
We process personal data to:
• create and secure your account;
• let you deposit, bet, withdraw, and view history;
• prevent fraud, abuse, and unauthorised access;
• apply Operator limits, promotions, and settlement rules;
• attribute eligible agent commissions;
• meet legal, accounting, dispute, and regulatory obligations;
• communicate service messages (for example deposit or account notices);
• improve reliability and customer support.

4. Legal bases (high level)
Where Act 843 or similar rules apply, processing is typically based on:
• performance of our contract with you (providing the betting wallet service);
• compliance with legal obligations;
• legitimate interests in securing the platform and preventing abuse;
• consent, where we specifically ask for it (for example optional marketing, if enabled).

5. Sharing your data
We may share data with:
• payment providers (for example Paystack) to process deposits/withdrawals;
• sports-data or infrastructure providers needed to run fixtures and hosting;
• agents, only to the extent needed for their authorised referral/commission view—not your password or full payment credentials;
• professional advisors, auditors, or authorities when legally required;
• successor operators if the business is transferred, under appropriate safeguards.

We do not sell your personal data.

6. Cross-border transfers
Servers or providers may process data outside Ghana. Where that happens, the Operator should use appropriate contractual and security safeguards consistent with applicable law.

7. How long we keep data
• Account and profile data: while your account is active and for a reasonable period afterward for disputes and legal retention.
• Financial, betting, and audit records: retained longer as needed for reconciliation, tax, AML, and regulatory purposes.
• Marketing preferences (if any): until you withdraw consent or your account is closed.

Exact retention schedules should be set by the Operator to match licence and accounting requirements.

8. Security
We use industry-standard measures appropriate to a financial betting service, including hashed passwords and PINs, access controls for admin tools, encrypted storage of payment secrets on the server, and separation of customer-facing apps from privileged admin functions. No method of transmission or storage is perfectly secure; please protect your device and credentials.

9. Your rights
Subject to Ghanaian data-protection law and applicable exemptions, you may have rights to:
• access personal data we hold about you;
• request correction of inaccurate data;
• request deletion or restriction in certain cases;
• object to certain processing;
• lodge a complaint with the Data Protection Commission (or successor authority).

To exercise rights, contact the support channels published in the Service. We may need to verify your identity first. Some financial records cannot be erased where law requires retention.

10. Children
The Service is not for anyone under 18. We do not knowingly collect data from minors for betting accounts.

11. Cookies and similar technologies
The websites may use essential storage (for example to keep you signed in, remember theme preference, or keep your bet slip). These are used to operate the Service. If additional analytics cookies are added later, the Operator should update this Policy and obtain any required consent.

12. Changes to this Policy
The Operator may update this Policy through Admin Settings. The version published in the Service is the current version. Significant changes should be highlighted where practical.

13. Contact
Privacy questions: use the support email or phone in branding settings. For formal data-protection correspondence, address the Operator’s registered entity as published in its licence disclosures.
TXT;
    }

    public static function responsibleGamblingTitle(): string
    {
        return 'Responsible Gambling';
    }

    public static function responsibleGamblingBody(): string
    {
        return <<<'TXT'
Our commitment
Betting should be entertainment, not a way to make money or solve financial problems. The Operator promotes safer play for adults in Ghana and expects every customer to take personal responsibility for their choices.

18+ only
You must be at least 18 years old (or older if the law where you live requires it). Do not allow minors to use your account, device, or payment methods.

Know the risks
• You can lose the money you stake.
• Odds favour the Operator over time.
• Chasing losses often makes harm worse.
• Bonus funds are for betting under promotion rules and are not the same as withdrawable cash.

Safer play habits
• Decide a budget before you play and stick to it.
• Decide how much time you will spend and take breaks.
• Never bet with money needed for rent, food, school fees, or family essentials.
• Do not bet when you are upset, drunk, or under pressure.
• Treat wins as luck, not as a system that will keep working.
• If a booking code is shared with you, still review every selection and stake yourself before you confirm.

Warning signs
Seek help if you:
• bet more than you can afford;
• hide betting from family;
• borrow money to bet;
• feel anxious or irritable when not betting;
• keep playing to win back losses;
• neglect work, school, or relationships because of betting.

Tools and support
• Use account features the Operator provides (limits, timeouts, or self-exclusion when enabled).
• Contact support if you want your account restricted.
• Talk to someone you trust.
• Consider professional help if gambling feels out of control.

Local help
If you need urgent support in Ghana, contact local health services or recognised counselling organisations. The Operator may publish additional helpline details in compliance settings as they become available.

Our role and your role
We provide information, age controls, and Operator tools. You remain fully responsible for every deposit, bet, and withdrawal on your account—including bets placed after loading a booking code.

If gambling is no longer fun, stop. Walk away. Ask for help.
TXT;
    }

    public static function aboutTitle(): string
    {
        return 'About';
    }

    public static function aboutBody(): string
    {
        return <<<'TXT'
About this sportsbook
This is a mobile-first sportsbook for Ghana Cedis (GHS). Customers can browse fixtures, build a bet slip, deposit and withdraw through the Operator’s payment setup, and track open and settled bets. Agents can manage referrals and commissions. Administrators manage fixtures, markets, settings, promotions, and compliance content.

What you can expect
• Clear wallets that separate cash and bonus funds
• Booking codes you can load, then stake yourself
• Operator-controlled branding, limits, and legal pages
• Support contacts published in branding settings

Important
Real-money operation requires the Operator’s own licensing, payment approvals, security review, and responsible-gambling controls. Until those are in place, the Service may run in sandbox or test mode for demonstration only.

Play responsibly. 18+ only.
TXT;
    }
}
