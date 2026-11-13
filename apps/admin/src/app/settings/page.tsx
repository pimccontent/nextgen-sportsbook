"use client";

import * as React from "react";
import { api, type SettingsGroup } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";

const TABS = [
  { id: "branding", label: "Branding" },
  { id: "locale", label: "Locale" },
  { id: "betting", label: "Betting" },
  { id: "wallet", label: "Wallet" },
  { id: "promotions", label: "Promotions" },
  { id: "commissions", label: "Commissions" },
  { id: "payments", label: "Payments" },
  { id: "sports_data", label: "Sports data" },
  { id: "compliance", label: "Compliance" },
  { id: "legal", label: "Legal" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const { token } = useAdminAuth();
  const [tab, setTab] = React.useState<TabId>("branding");
  const [groups, setGroups] = React.useState<Record<string, SettingsGroup>>({});
  const [secrets, setSecrets] = React.useState<
    Record<string, { configured: boolean; hint: string | null }>
  >({});
  const [draft, setDraft] = React.useState<Record<string, unknown>>({});
  const [secretDraft, setSecretDraft] = React.useState({
    paystack_secret_key: "",
    paystack_webhook_secret: "",
    sports_api_key: "",
  });
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.settings(token);
      setGroups(data.groups);
      setSecrets(data.secrets);
      setDraft({ ...(data.groups[tab]?.payload ?? {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (groups[tab]) setDraft({ ...groups[tab].payload });
  }, [tab, groups]);

  const setField = (key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await api.updateSettings(token, tab, draft);
      setGroups((prev) => ({ ...prev, [tab]: res.settings }));
      setStatus(`${tab} saved (v${res.settings.version})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveSecrets = async () => {
    if (!token) return;
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const body: {
        paystack_secret_key?: string;
        paystack_webhook_secret?: string;
        sports_api_key?: string;
      } = {};
      if (secretDraft.paystack_secret_key.trim()) {
        body.paystack_secret_key = secretDraft.paystack_secret_key.trim();
      }
      if (secretDraft.paystack_webhook_secret.trim()) {
        body.paystack_webhook_secret =
          secretDraft.paystack_webhook_secret.trim();
      }
      if (secretDraft.sports_api_key?.trim()) {
        body.sports_api_key = secretDraft.sports_api_key.trim();
      }
      const res = await api.updateSecrets(token, body);
      setSecrets(res.secrets);
      setSecretDraft({
        paystack_secret_key: "",
        paystack_webhook_secret: "",
        sports_api_key: "",
      });
      setStatus("Secrets updated (values never shown again)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Secret save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="font-display text-xl font-semibold tracking-tight">Settings</h1>

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--border-soft)] pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? "bg-[var(--action-primary)] text-[var(--action-primary-fg)]"
                : "text-[var(--text-tertiary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>
      ) : (
        <div className="admin-card space-y-4 p-4 sm:p-5">
          {tab === "branding" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Display name"
                value={String(draft.display_name ?? "")}
                onChange={(v) => setField("display_name", v)}
              />
              <Field
                label="Legal name"
                value={String(draft.legal_name ?? "")}
                onChange={(v) => setField("legal_name", v)}
              />
              <Field
                label="Logo URL"
                value={String(draft.logo_url ?? "")}
                onChange={(v) => setField("logo_url", v || null)}
              />
              <Field
                label="Favicon URL"
                value={String(draft.favicon_url ?? "")}
                onChange={(v) => setField("favicon_url", v || null)}
              />
              <Field
                label="Support email"
                value={String(draft.support_email ?? "")}
                onChange={(v) => setField("support_email", v)}
              />
              <Field
                label="Support phone"
                value={String(draft.support_phone ?? "")}
                onChange={(v) => setField("support_phone", v)}
              />
              <Field
                label="Primary color"
                value={String(draft.color_primary ?? "")}
                onChange={(v) => setField("color_primary", v)}
              />
              <Field
                label="Accent color"
                value={String(draft.color_accent ?? "")}
                onChange={(v) => setField("color_accent", v)}
              />
              <Field
                label="Background"
                value={String(draft.color_background ?? "")}
                onChange={(v) => setField("color_background", v)}
              />
              <Field
                label="Surface"
                value={String(draft.color_surface ?? "")}
                onChange={(v) => setField("color_surface", v)}
              />
              <Field
                label="Text color"
                value={String(draft.color_text ?? "")}
                onChange={(v) => setField("color_text", v)}
              />
            </div>
          )}

          {tab === "locale" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Currency"
                value={String(draft.currency ?? "GHS")}
                onChange={(v) => setField("currency", v)}
              />
              <Field
                label="Currency name"
                value={String(draft.currency_name ?? "Ghana Cedis")}
                onChange={(v) => setField("currency_name", v)}
              />
              <p className="sm:col-span-2 text-[11px] text-graphite-100">
                All money amounts below are entered and shown in <strong>Ghana Cedis (GHS)</strong>.
                The ledger still stores integer pesewas (1 GHS = 100) internally.
              </p>
              <Field
                label="Timezone"
                value={String(draft.timezone ?? "")}
                onChange={(v) => setField("timezone", v)}
              />
              <Select
                label="Odds format"
                value={String(draft.odds_format ?? "decimal")}
                options={["decimal"]}
                onChange={(v) => setField("odds_format", v)}
              />
              <NumberField
                label="Age minimum"
                value={Number(draft.age_minimum ?? 18)}
                onChange={(v) => setField("age_minimum", v)}
              />
            </div>
          )}

          {tab === "betting" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <CedisField
                label="Min stake (Ghana Cedis)"
                minor={Number(draft.min_stake_minor ?? 0)}
                onChangeMinor={(v) => setField("min_stake_minor", v)}
              />
              <CedisField
                label="Max stake (Ghana Cedis)"
                minor={Number(draft.max_stake_minor ?? 0)}
                onChangeMinor={(v) => setField("max_stake_minor", v)}
              />
              <CedisField
                label="Max payout (Ghana Cedis)"
                minor={Number(draft.max_payout_minor ?? 0)}
                onChangeMinor={(v) => setField("max_payout_minor", v)}
              />
              <Select
                label="Bet types"
                value={String(draft.bet_types ?? "singles")}
                options={["singles", "singles_accumulators"]}
                onChange={(v) => setField("bet_types", v)}
              />
              <Select
                label="Odds change policy"
                value={String(draft.odds_change_policy ?? "reconfirm")}
                options={["reject", "offer_new", "reconfirm"]}
                onChange={(v) => setField("odds_change_policy", v)}
              />
              <Select
                label="Accumulator void rule"
                value={String(draft.accumulator_void_rule ?? "recalculate")}
                options={["void_bet", "recalculate"]}
                onChange={(v) => setField("accumulator_void_rule", v)}
              />
              <Toggle
                label="Suspend on kickoff"
                checked={Boolean(draft.suspend_on_kickoff)}
                onChange={(v) => setField("suspend_on_kickoff", v)}
              />
              <Toggle
                label="Prematch only"
                checked={Boolean(draft.prematch_only)}
                onChange={(v) => setField("prematch_only", v)}
              />
              <Toggle
                label="Cash-out enabled"
                checked={Boolean(draft.cashout_enabled)}
                onChange={(v) => setField("cashout_enabled", v)}
              />
            </div>
          )}

          {tab === "wallet" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <CedisField
                label="Min deposit (Ghana Cedis)"
                minor={Number(draft.min_deposit_minor ?? 0)}
                onChangeMinor={(v) => setField("min_deposit_minor", v)}
              />
              <CedisField
                label="Max deposit (Ghana Cedis)"
                minor={Number(draft.max_deposit_minor ?? 0)}
                onChangeMinor={(v) => setField("max_deposit_minor", v)}
              />
              <CedisField
                label="Min withdrawal (Ghana Cedis)"
                minor={Number(draft.min_withdrawal_minor ?? 0)}
                onChangeMinor={(v) => setField("min_withdrawal_minor", v)}
              />
              <CedisField
                label="Max withdrawal (Ghana Cedis)"
                minor={Number(draft.max_withdrawal_minor ?? 0)}
                onChangeMinor={(v) => setField("max_withdrawal_minor", v)}
              />
              <CedisField
                label="Deposit fee (Ghana Cedis)"
                minor={Number(draft.deposit_fee_minor ?? 0)}
                onChangeMinor={(v) => setField("deposit_fee_minor", v)}
              />
              <CedisField
                label="Withdrawal fee (Ghana Cedis)"
                minor={Number(draft.withdrawal_fee_minor ?? 0)}
                onChangeMinor={(v) => setField("withdrawal_fee_minor", v)}
              />
              <Select
                label="Withdrawal approval"
                value={String(draft.withdrawal_approval ?? "manual")}
                options={["auto", "manual", "threshold"]}
                onChange={(v) => setField("withdrawal_approval", v)}
              />
              <CedisField
                label="Auto threshold (Ghana Cedis)"
                minor={Number(draft.withdrawal_auto_threshold_minor ?? 0)}
                onChangeMinor={(v) => setField("withdrawal_auto_threshold_minor", v)}
              />
              <CedisField
                label="Daily withdrawal limit (Ghana Cedis)"
                minor={Number(draft.withdrawal_daily_limit_minor ?? 0)}
                onChangeMinor={(v) => setField("withdrawal_daily_limit_minor", v)}
              />
              <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                <Toggle
                  label="Require KYC before withdraw"
                  checked={Boolean(draft.withdrawal_require_kyc)}
                  onChange={(v) => setField("withdrawal_require_kyc", v)}
                />
                <Toggle
                  label="Require payout details"
                  checked={Boolean(draft.withdrawal_require_payout_details)}
                  onChange={(v) => setField("withdrawal_require_payout_details", v)}
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Withdrawal rules title (customer-facing)"
                  value={String(draft.withdrawal_rules_title ?? "Withdrawal rules")}
                  onChange={(v) => setField("withdrawal_rules_title", v)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Withdrawal rules text (customer must acknowledge)
                  <textarea
                    value={String(draft.withdrawal_rules_text ?? "")}
                    onChange={(e) => setField("withdrawal_rules_text", e.target.value)}
                    rows={5}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          )}

          {tab === "promotions" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-xs text-[var(--text-tertiary)]">
                Sandbox bonuses credit available balance. No wagering engine in v1.
              </p>
              <Toggle
                label="Top-up bonus enabled"
                checked={Boolean(draft.deposit_bonus_enabled)}
                onChange={(v) => setField("deposit_bonus_enabled", v)}
              />
              <Toggle
                label="First deposit only"
                checked={Boolean(draft.deposit_bonus_first_only)}
                onChange={(v) => setField("deposit_bonus_first_only", v)}
              />
              <NumberField
                label="Top-up bonus (basis points, 1000 = 10%)"
                value={Number(draft.deposit_bonus_percent_bps ?? 0)}
                onChange={(v) => setField("deposit_bonus_percent_bps", v)}
              />
              <CedisField
                label="Top-up bonus max (Ghana Cedis)"
                minor={Number(draft.deposit_bonus_max_minor ?? 0)}
                onChangeMinor={(v) => setField("deposit_bonus_max_minor", v)}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Top-up bonus title"
                  value={String(draft.deposit_bonus_title ?? "")}
                  onChange={(v) => setField("deposit_bonus_title", v)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Top-up bonus blurb
                  <textarea
                    value={String(draft.deposit_bonus_blurb ?? "")}
                    onChange={(e) => setField("deposit_bonus_blurb", e.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                </label>
              </div>
              <Toggle
                label="Win bonus enabled"
                checked={Boolean(draft.win_bonus_enabled)}
                onChange={(v) => setField("win_bonus_enabled", v)}
              />
              <NumberField
                label="Win bonus (basis points of net win)"
                value={Number(draft.win_bonus_percent_bps ?? 0)}
                onChange={(v) => setField("win_bonus_percent_bps", v)}
              />
              <CedisField
                label="Win bonus max (Ghana Cedis)"
                minor={Number(draft.win_bonus_max_minor ?? 0)}
                onChangeMinor={(v) => setField("win_bonus_max_minor", v)}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Win bonus title"
                  value={String(draft.win_bonus_title ?? "")}
                  onChange={(v) => setField("win_bonus_title", v)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Win bonus blurb
                  <textarea
                    value={String(draft.win_bonus_blurb ?? "")}
                    onChange={(e) => setField("win_bonus_blurb", e.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          )}

          {tab === "commissions" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Bet commissions enabled"
                checked={draft.bet_commissions_enabled !== false}
                onChange={(v) => setField("bet_commissions_enabled", v)}
              />
              <Toggle
                label="Deposit commissions enabled"
                checked={draft.deposit_commissions_enabled !== false}
                onChange={(v) => setField("deposit_commissions_enabled", v)}
              />
              <Toggle
                label="New deposits commissionable by default"
                checked={draft.deposit_commissionable_default !== false}
                onChange={(v) => setField("deposit_commissionable_default", v)}
              />
              <Select
                label="Attribution"
                value={String(draft.attribution ?? "referral_code")}
                options={["referral_code", "url", "first_click", "last_click"]}
                onChange={(v) => setField("attribution", v)}
              />
              <Select
                label="Basis (bets)"
                value={String(draft.basis ?? "turnover")}
                options={["turnover", "ngr"]}
                onChange={(v) => setField("basis", v)}
              />
              <NumberField
                label="Rate (basis points)"
                value={Number(draft.rate_bps ?? 0)}
                onChange={(v) => setField("rate_bps", v)}
              />
              <Select
                label="Period"
                value={String(draft.period ?? "monthly")}
                options={["weekly", "monthly"]}
                onChange={(v) => setField("period", v)}
              />
              <NumberField
                label="Hold days"
                value={Number(draft.hold_days ?? 0)}
                onChange={(v) => setField("hold_days", v)}
              />
              <CedisField
                label="Min commission payout (Ghana Cedis)"
                minor={Number(draft.min_withdrawal_minor ?? 0)}
                onChangeMinor={(v) => setField("min_withdrawal_minor", v)}
              />
              <Toggle
                label="Exclude voids"
                checked={Boolean(draft.exclude_voids)}
                onChange={(v) => setField("exclude_voids", v)}
              />
              <Toggle
                label="Exclude bonuses"
                checked={Boolean(draft.exclude_bonuses)}
                onChange={(v) => setField("exclude_bonuses", v)}
              />
            </div>
          )}

          {tab === "payments" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Provider"
                  value={String(draft.provider ?? "paystack")}
                  onChange={(v) => setField("provider", v)}
                />
                <Select
                  label="Mode"
                  value={String(draft.mode ?? "test")}
                  options={["test", "live"]}
                  onChange={(v) => setField("mode", v)}
                />
                <Field
                  label="Paystack public key"
                  value={String(draft.public_key ?? "")}
                  onChange={(v) => setField("public_key", v)}
                />
                <Field
                  label="Callback URL"
                  value={String(draft.callback_url ?? "")}
                  onChange={(v) => setField("callback_url", v)}
                />
                <Field
                  label="Webhook URL"
                  value={String(draft.webhook_url ?? "")}
                  onChange={(v) => setField("webhook_url", v)}
                />
              </div>
              <div className="rounded-lg border border-dashed border-graphite-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-graphite-100">
                  Secrets (write-only)
                </p>
                <p className="mt-1 text-[11px] text-graphite-100">
                  Secret key:{" "}
                  {secrets.paystack_secret_key?.configured
                    ? `configured (…${secrets.paystack_secret_key.hint})`
                    : "not set"}
                  {" · "}
                  Webhook:{" "}
                  {secrets.paystack_webhook_secret?.configured
                    ? `configured (…${secrets.paystack_webhook_secret.hint})`
                    : "not set"}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="New secret key"
                    value={secretDraft.paystack_secret_key}
                    onChange={(v) =>
                      setSecretDraft((s) => ({
                        ...s,
                        paystack_secret_key: v,
                      }))
                    }
                  />
                  <Field
                    label="New webhook secret"
                    value={secretDraft.paystack_webhook_secret}
                    onChange={(v) =>
                      setSecretDraft((s) => ({
                        ...s,
                        paystack_webhook_secret: v,
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void saveSecrets()}
                  disabled={saving}
                  className="mt-3 rounded-lg border border-graphite-200 px-3 py-2 text-xs font-bold text-white hover:bg-graphite-200 disabled:opacity-60"
                >
                  Save secrets only
                </button>
              </div>
            </div>
          )}

          {tab === "sports_data" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Provider"
                  value={String(draft.provider ?? "mock")}
                  options={["mock", "football_data_org", "thesportsdb"]}
                  onChange={(v) => setField("provider", v)}
                />
                <Field
                  label="Competition codes (comma-separated)"
                  value={String(draft.competition_codes ?? "")}
                  onChange={(v) => setField("competition_codes", v)}
                />
                <NumberField
                  label="Default home odds"
                  value={Number(draft.default_home_odds ?? 2.1)}
                  onChange={(v) => setField("default_home_odds", v)}
                />
                <NumberField
                  label="Default draw odds"
                  value={Number(draft.default_draw_odds ?? 3.2)}
                  onChange={(v) => setField("default_draw_odds", v)}
                />
                <NumberField
                  label="Default away odds"
                  value={Number(draft.default_away_odds ?? 3.4)}
                  onChange={(v) => setField("default_away_odds", v)}
                />
                <Toggle
                  label="Sync top leagues"
                  checked={Boolean(draft.sync_top_leagues)}
                  onChange={(v) => setField("sync_top_leagues", v)}
                />
                <Toggle
                  label="Sync other / lesser-known leagues"
                  checked={Boolean(draft.sync_other_leagues)}
                  onChange={(v) => setField("sync_other_leagues", v)}
                />
                <Toggle
                  label="Auto-publish imported fixtures"
                  checked={Boolean(draft.auto_publish)}
                  onChange={(v) => setField("auto_publish", v)}
                />
              </div>
              <p className="text-[11px] text-graphite-100">
                Free options: <strong>football-data.org</strong> (API token required —
                free tier), <strong>thesportsdb</strong> (public demo key), or{" "}
                <strong>mock</strong> catalogue. Admin always controls odds, publication,
                and results after import.
              </p>
              <div className="rounded-lg border border-dashed border-graphite-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-graphite-100">
                  Sports API key (write-only)
                </p>
                <p className="mt-1 text-[11px] text-graphite-100">
                  {secrets.sports_api_key?.configured
                    ? `configured (…${secrets.sports_api_key.hint})`
                    : "not set"}
                </p>
                <div className="mt-3">
                  <Field
                    label="New sports API key"
                    value={secretDraft.sports_api_key ?? ""}
                    onChange={(v) =>
                      setSecretDraft((s) => ({ ...s, sports_api_key: v }))
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void saveSecrets()}
                  disabled={saving}
                  className="mt-3 rounded-lg border border-graphite-200 px-3 py-2 text-xs font-bold text-white hover:bg-graphite-200 disabled:opacity-60"
                >
                  Save sports API key
                </button>
              </div>
            </div>
          )}

          {tab === "compliance" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Jurisdiction"
                value={String(draft.jurisdiction ?? "GH")}
                onChange={(v) => setField("jurisdiction", v)}
              />
              <Field
                label="Licence label"
                value={String(draft.licence_label ?? "")}
                onChange={(v) => setField("licence_label", v)}
              />
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  RG message
                  <textarea
                    value={String(draft.rg_message ?? "")}
                    onChange={(e) => setField("rg_message", e.target.value)}
                    rows={3}
                    className={inputClass}
                  />
                </label>
              </div>
              <Toggle
                label="RG footer enabled"
                checked={Boolean(draft.rg_footer_enabled)}
                onChange={(v) => setField("rg_footer_enabled", v)}
              />
            </div>
          )}

          {tab === "legal" && (
            <div className="space-y-4">
              <LegalBlock
                titleLabel="Terms title"
                titleValue={String(draft.terms_title ?? "")}
                onTitle={(v) => setField("terms_title", v)}
                bodyLabel="Terms body"
                bodyValue={String(draft.terms_body ?? "")}
                onBody={(v) => setField("terms_body", v)}
              />
              <LegalBlock
                titleLabel="Privacy title"
                titleValue={String(draft.privacy_title ?? "")}
                onTitle={(v) => setField("privacy_title", v)}
                bodyLabel="Privacy body"
                bodyValue={String(draft.privacy_body ?? "")}
                onBody={(v) => setField("privacy_body", v)}
              />
              <LegalBlock
                titleLabel="Responsible gambling title"
                titleValue={String(draft.responsible_gambling_title ?? "")}
                onTitle={(v) => setField("responsible_gambling_title", v)}
                bodyLabel="Responsible gambling body"
                bodyValue={String(draft.responsible_gambling_body ?? "")}
                onBody={(v) => setField("responsible_gambling_body", v)}
              />
              <LegalBlock
                titleLabel="About title"
                titleValue={String(draft.about_title ?? "")}
                onTitle={(v) => setField("about_title", v)}
                bodyLabel="About body"
                bodyValue={String(draft.about_body ?? "")}
                onBody={(v) => setField("about_body", v)}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-indigo px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : `Save ${tab}`}
            </button>
            {status ? (
              <p className="text-xs font-semibold text-emerald-300">{status}</p>
            ) : null}
            {error ? (
              <p className="text-xs font-semibold text-red-300">{error}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm font-normal normal-case text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";
const labelClass =
  "block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]";

function LegalBlock({
  titleLabel,
  titleValue,
  onTitle,
  bodyLabel,
  bodyValue,
  onBody,
}: {
  titleLabel: string;
  titleValue: string;
  onTitle: (v: string) => void;
  bodyLabel: string;
  bodyValue: string;
  onBody: (v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-[var(--border-soft)] p-3">
      <Field label={titleLabel} value={titleValue} onChange={onTitle} />
      <label className={labelClass}>
        {bodyLabel}
        <textarea
          value={bodyValue}
          onChange={(e) => onBody(e.target.value)}
          rows={5}
          className={inputClass}
        />
      </label>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={labelClass}>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className={labelClass}>
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputClass}
      />
    </label>
  );
}

/** Edit money in Ghana Cedis; persist as integer pesewas (×100). */
function CedisField({
  label,
  minor,
  onChangeMinor,
}: {
  label: string;
  minor: number;
  onChangeMinor: (v: number) => void;
}) {
  const major = (Number.isFinite(minor) ? minor : 0) / 100;
  return (
    <label className={labelClass}>
      {label}
      <input
        type="number"
        step="0.01"
        min="0"
        value={Number.isFinite(major) ? major : 0}
        onChange={(e) =>
          onChangeMinor(Math.round(Number(e.target.value || 0) * 100))
        }
        className={inputClass}
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className={labelClass}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-[var(--text-primary)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}
