"use client";

import * as React from "react";
import { api, type SettingsGroup } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { ImageUploadField } from "@/components/ImageUploadField";

const TABS = [
  { id: "operations", label: "Operations" },
  { id: "branding", label: "Branding" },
  { id: "customer_messaging", label: "Customer messages" },
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
  const [tab, setTab] = React.useState<TabId>("operations");
  const [liveConfirm, setLiveConfirm] = React.useState("");
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

  const liveSaveBlocked =
    tab === "operations" &&
    String(draft.environment ?? "sandbox") === "live" &&
    liveConfirm.trim().toUpperCase() !== "LIVE";

  const save = async () => {
    if (!token) return;
    if (liveSaveBlocked) {
      setError('Type LIVE to confirm production environment before saving.');
      return;
    }
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await api.updateSettings(token, tab, draft);
      setGroups((prev) => ({ ...prev, [tab]: res.settings }));
      setStatus(`${tab} saved (v${res.settings.version})`);
      if (tab === "operations") setLiveConfirm("");
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
          {tab === "operations" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-primary)]">Environment &amp; maintenance</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Switching to Live updates payments mode and public banners. It does{" "}
                  <strong className="text-[var(--text-primary)]">not</strong> by itself enable real
                  Paystack HTTP rails — see go-live checklist. Maintenance blocks Customer and Agent
                  apps/APIs; Admin stays available.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="System environment"
                  value={String(draft.environment ?? "sandbox")}
                  options={["sandbox", "live"]}
                  onChange={(v) => {
                    setField("environment", v);
                    if (v !== "live") setLiveConfirm("");
                  }}
                />
                <Toggle
                  label="Show sandbox banner on Customer/Agent (never shown in Live)"
                  checked={Boolean(draft.show_environment_banner)}
                  onChange={(v) => setField("show_environment_banner", v)}
                />
              </div>

              {String(draft.environment ?? "sandbox") === "live" ? (
                <div className="rounded-lg border border-[color-mix(in_srgb,var(--status-warning-fg)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-warning-fg)_12%,transparent)] p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--status-warning-fg)]">
                    Confirm live / production label
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Type <span className="font-mono text-[var(--text-primary)]">LIVE</span> to allow
                    saving while environment is live.
                  </p>
                  <Field
                    label="Confirmation"
                    value={liveConfirm}
                    onChange={setLiveConfirm}
                  />
                </div>
              ) : null}

              <div className="border-t border-[var(--border-soft)] pt-4 space-y-3">
                <Toggle
                  label="Maintenance mode"
                  checked={Boolean(draft.maintenance_enabled)}
                  onChange={(v) => setField("maintenance_enabled", v)}
                />
                <Field
                  label="Maintenance title"
                  value={String(draft.maintenance_title ?? "")}
                  onChange={(v) => setField("maintenance_title", v)}
                />
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Maintenance message
                    <textarea
                      value={String(draft.maintenance_message ?? "")}
                      onChange={(e) => setField("maintenance_message", e.target.value)}
                      rows={3}
                      className={inputClass}
                    />
                  </label>
                </div>
                <Field
                  label="ETA (optional text)"
                  value={String(draft.maintenance_eta ?? "")}
                  onChange={(v) => setField("maintenance_eta", v || null)}
                />
              </div>
            </div>
          )}

          {tab === "customer_messaging" && (
            <div className="space-y-5">
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-primary)]">
                  Customer popups &amp; notifications
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Control the modal and toast shown on the customer app. Hero slides stay under{" "}
                  <strong className="text-[var(--text-primary)]">Banners</strong>. Change the
                  popup/toast ID after editing copy so returning visitors see the new message.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle
                  label="Show popup modal"
                  checked={Boolean(draft.popup_enabled)}
                  onChange={(v) => setField("popup_enabled", v)}
                />
                <Field
                  label="Popup ID (version key)"
                  value={String(draft.popup_id ?? "welcome")}
                  onChange={(v) => setField("popup_id", v)}
                />
                <Field
                  label="Popup title"
                  value={String(draft.popup_title ?? "")}
                  onChange={(v) => setField("popup_title", v)}
                />
                <Field
                  label="CTA label"
                  value={String(draft.popup_cta_label ?? "Got it")}
                  onChange={(v) => setField("popup_cta_label", v)}
                />
                <Field
                  label="CTA URL (optional)"
                  value={String(draft.popup_cta_url ?? "")}
                  onChange={(v) => setField("popup_cta_url", v || null)}
                />
                <Toggle
                  label="Popup dismissible"
                  checked={draft.popup_dismissible !== false}
                  onChange={(v) => setField("popup_dismissible", v)}
                />
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Popup body
                    <textarea
                      value={String(draft.popup_body ?? "")}
                      onChange={(e) => setField("popup_body", e.target.value)}
                      rows={4}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>
              <div className="border-t border-[var(--border-soft)] pt-4 grid gap-3 sm:grid-cols-2">
                <Toggle
                  label="Show toast notification"
                  checked={Boolean(draft.toast_enabled)}
                  onChange={(v) => setField("toast_enabled", v)}
                />
                <Field
                  label="Toast ID (version key)"
                  value={String(draft.toast_id ?? "notice")}
                  onChange={(v) => setField("toast_id", v)}
                />
                <Select
                  label="Toast tone"
                  value={String(draft.toast_tone ?? "info")}
                  options={["info", "success", "warning"]}
                  onChange={(v) => setField("toast_tone", v)}
                />
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Toast message
                    <textarea
                      value={String(draft.toast_message ?? "")}
                      onChange={(e) => setField("toast_message", e.target.value)}
                      rows={2}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

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
              <ImageUploadField
                label="Site logo"
                kind="logo"
                value={String(draft.logo_url ?? "")}
                onChange={(v) => setField("logo_url", v || null)}
                hint="Shown on Customer, Admin, and Agent headers. Save Branding after upload."
              />
              <ImageUploadField
                label="Favicon"
                kind="favicon"
                value={String(draft.favicon_url ?? "")}
                onChange={(v) => setField("favicon_url", v || null)}
                hint="Browser tab icon for customer and agent apps."
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
              <p className="sm:col-span-2 text-[11px] text-[var(--text-tertiary)]">
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
                Bonuses credit the segregated bonus wallet. Winnings from bonus-funded stakes
                settle to cash. Withdrawals remain cash-only.
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
              <label className={`${labelClass} sm:col-span-2`}>
                Top-up bonus mode
                <select
                  value={String(draft.deposit_bonus_mode ?? "percent")}
                  onChange={(e) => setField("deposit_bonus_mode", e.target.value)}
                  className={inputClass}
                >
                  <option value="percent">Percent of deposit</option>
                  <option value="fixed">Fixed GHS amount</option>
                </select>
              </label>
              {String(draft.deposit_bonus_mode ?? "percent") === "fixed" ? (
                <CedisField
                  label="Top-up bonus fixed amount (GHS)"
                  minor={Number(draft.deposit_bonus_fixed_minor ?? 0)}
                  onChangeMinor={(v) => setField("deposit_bonus_fixed_minor", v)}
                />
              ) : (
                <NumberField
                  label="Top-up bonus (basis points, 1000 = 10%)"
                  value={Number(draft.deposit_bonus_percent_bps ?? 0)}
                  onChange={(v) => setField("deposit_bonus_percent_bps", v)}
                />
              )}
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
              <label className={`${labelClass} sm:col-span-2`}>
                Win bonus mode
                <select
                  value={String(draft.win_bonus_mode ?? "percent")}
                  onChange={(e) => setField("win_bonus_mode", e.target.value)}
                  className={inputClass}
                >
                  <option value="percent">Percent of net win</option>
                  <option value="fixed">Fixed GHS amount</option>
                </select>
              </label>
              {String(draft.win_bonus_mode ?? "percent") === "fixed" ? (
                <CedisField
                  label="Win bonus fixed amount (GHS)"
                  minor={Number(draft.win_bonus_fixed_minor ?? 0)}
                  onChangeMinor={(v) => setField("win_bonus_fixed_minor", v)}
                />
              ) : (
                <NumberField
                  label="Win bonus (basis points of net win)"
                  value={Number(draft.win_bonus_percent_bps ?? 0)}
                  onChange={(v) => setField("win_bonus_percent_bps", v)}
                />
              )}
              <CedisField
                label="Win bonus max (Ghana Cedis)"
                minor={Number(draft.win_bonus_max_minor ?? 0)}
                onChangeMinor={(v) => setField("win_bonus_max_minor", v)}
              />
              <CedisField
                label="Max stake from bonus per bet (GHS)"
                minor={Number(draft.max_bonus_stake_minor ?? 0)}
                onChangeMinor={(v) => setField("max_bonus_stake_minor", v)}
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
              <div className="rounded-lg border border-dashed border-[var(--border-soft)] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Secrets (write-only)
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
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
                  className="mt-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)] disabled:opacity-60"
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
                  options={[
                    "mock",
                    "football_data_org",
                    "thesportsdb",
                    "openligadb",
                    "embedded_world",
                  ]}
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
                  label="Sync other / mid-tier leagues (provider list)"
                  checked={Boolean(draft.sync_other_leagues)}
                  onChange={(v) => setField("sync_other_leagues", v)}
                />
                <Toggle
                  label="Always sync obscure worldwide leagues"
                  checked={draft.sync_obscure_leagues !== false}
                  onChange={(v) => setField("sync_obscure_leagues", v)}
                />
                <Toggle
                  label="Live sync obscure leagues (TheSportsDB)"
                  checked={Boolean(draft.obscure_live_sync)}
                  onChange={(v) => setField("obscure_live_sync", v)}
                />
                <Toggle
                  label="Auto-publish imported fixtures"
                  checked={Boolean(draft.auto_publish)}
                  onChange={(v) => setField("auto_publish", v)}
                />
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Free fixtures (no paid plan required): <strong>embedded_world</strong> (curated
                obscure leagues offline; optional TheSportsDB live sync),{" "}
                <strong>openligadb</strong> (no API key),{" "}
                <strong>thesportsdb</strong> (free demo key <code className="font-mono">123</code> —
                strict rate limits; sync spaces requests and retries 429s),{" "}
                <strong>football-data.org</strong> (free token you register yourself), or{" "}
                <strong>mock</strong> built-in catalogue. If TheSportsDB returns HTTP 429, wait a
                minute and retry, or use <strong>embedded_world</strong> / <strong>mock</strong>.
                Live sync for <strong>embedded_world</strong> falls back to the catalogue per league
                if empty or rate-limited. Nothing in this stack secretly bills a paid sports API.
                Admin still controls odds, publication, and results after import.
              </p>
              <div className="rounded-lg border border-dashed border-[var(--border-soft)] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Sports API key (write-only)
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
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
                  className="mt-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)] disabled:opacity-60"
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
              disabled={saving || liveSaveBlocked}
              className="rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-bold text-[var(--action-primary-fg)] disabled:opacity-60"
            >
              {saving ? "Saving…" : `Save ${tab}`}
            </button>
            {status ? (
              <p className="text-xs font-semibold text-[var(--status-healthy-fg)]">{status}</p>
            ) : null}
            {error ? (
              <p className="text-xs font-semibold text-[var(--status-destructive-fg)]">{error}</p>
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
