import type postgres from "postgres";
import type { JwtPayload, SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ChargePlan } from "./Octopus";

// Types for the Vercel functions in api/. Server-only: never imported by the app.

type Tx = postgres.TransactionSql;

type Provider = "growatt" | "octopus";

type EncryptedSecret = {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  keyVersion: number;
};

// The logged-in user for one request, from a verified access token.
type SessionUser = {
  userId: string;
  claims: JwtPayload;
  supabase: SupabaseClient;
};

// A Google login in progress, kept in an httpOnly cookie between
// /api/auth/google and /api/auth/callback. next: a name from
// AFTER_GOOGLE_PAGES, or "" for home.
type GoogleLogin = {
  state: string;
  verifier: string;
  nonce: string;
  next: string;
};

// One endpoint. Several share a Vercel function through a router, because the
// Hobby plan allows at most 12 functions per deployment.
type Handler = (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void> | void;

// What private.audit_log records.
type AuditAction =
  | "mfa_enrolled"
  | "mfa_removed"
  | "password_changed"
  | "account_exported"
  | "credentials_saved"
  | "credentials_deleted"
  | "credentials_check_failed"
  | "credentials_check_unavailable"
  | "settings_saved"
  | "growatt_write"
  | "octopus_join"
  | "automation_run"
  | "signed_in"
  | "export_presets_saved"
  | "daily_export_saved"
  | "export_restored"
  | "battery_saved"
  | "one_off_ended"
  | "automatic_export_saved"
  | "automatic_export_run"
  | "charging_summary";

// Which call of a credentials check went wrong: Growatt's login or the
// inverter read with the serial, Octopus's API key or the account number.
type CredentialStep = "login" | "inverter" | "key" | "account";

// How Growatt or Octopus didn't answer: no reply in time, no connection, or a
// reply that wasn't the expected JSON (a web page, say).
type OutageKind = "timeout" | "network" | "unexpected_reply" | "other";

// Why a credentials check failed. outage: Growatt or Octopus didn't answer, so
// it says nothing about the credentials and doesn't count as a failed check.
type CredentialProblem = {
  code: string;
  message: string;
  step: CredentialStep;
  outage?: OutageKind;
};

// What tonight's Automatic export did, in its audit entries. exported: the
// slot was set. The rest skipped it: the car was plugged in, a one-off export
// was already running (busy), the battery was below the minimum, already at
// the stop level, too close to Growatt's 23:30 reset or the export would have
// been too short; failed: Octopus or Growatt didn't respond in time, or a
// login was refused.
type AutomaticExportResult =
  | "exported"
  | "car_plugged_in"
  | "busy"
  | "low_battery"
  | "already"
  | "too_late"
  | "too_short"
  | "failed";

// What an automation check did for one user. skipped: automation is off.
// busy: another check for them was running. paused: a saved login was
// refused, so only Sync now or new details restart it.
type AutomationResult =
  | "applied"
  | "unchanged"
  | "skipped"
  | "busy"
  | "paused"
  | "failed";

// A check's result, with the plan when it got that far.
type AutomationOutcome = {
  result: AutomationResult;
  plan: ChargePlan | null;
};

// Who asked for a check, for the audit log.
type AutomationTrigger = "schedule" | "check_now";

// A private.automation_state row, as the check reads it.
type AutomationStateRow = {
  plan_power: number | null;
  plan_stop: number | null;
  plan_slots: string | null;
  inverter_checked_at: Date | null;
  last_code: string | null;
  paused: boolean;
  // UK dates (YYYY-MM-DD) for Export every day: the reset the export times
  // were last checked after (null: just turned on, keep what's on the inverter
  // at once), and the last day a restore failure was logged.
  export_restored_on: string | null;
  export_failed_on: string | null;
  // Export until battery %: when the one-off slot ends and the slot itself
  // (e.g. "16:05-17:27"), null when there's none; and whether turning it off
  // has failed and been logged.
  one_off_until: Date | null;
  one_off_slot: string | null;
  one_off_failed: boolean;
  // Automatic export: the UK date (YYYY-MM-DD) it last ran, was skipped or
  // given up on; and why tonight's last try failed, null if it hasn't.
  automatic_export_on: string | null;
  automatic_export_code: string | null;
  automatic_export_message: string | null;
  // The UK date (YYYY-MM-DD) the morning charging summary was last written.
  summary_on: string | null;
  // When automatic charging's current run of failed checks started (null when
  // the last one worked), and whether a notification was sent for it.
  failing_since: Date | null;
  failure_notified: boolean;
};

// The /api/cron/update reply. Counts only: GitHub Actions logs are public.
type CronSummary = { users: number } & Record<AutomationResult, number>;

// A new audit_log row to maybe send a push for (private.take_push_rows).
// from_schedule: written by the scheduled check, not a request from the user.
type PushRow = {
  id: string;
  user_id: string;
  action: string;
  details: unknown;
  from_schedule: boolean;
};

// A private.push_subscriptions row: one device with notifications on.
type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// The /api/cron/notify reply, counts only. rows: audit rows looked at; sent:
// pushes delivered; removed: devices the push service said are gone; failed:
// pushes that didn't go.
type CronNotifySummary = {
  rows: number;
  sent: number;
  removed: number;
  failed: number;
};

export type {
  Tx,
  Provider,
  EncryptedSecret,
  SessionUser,
  GoogleLogin,
  Handler,
  AuditAction,
  CredentialStep,
  OutageKind,
  CredentialProblem,
  AutomaticExportResult,
  AutomationResult,
  AutomationOutcome,
  AutomationTrigger,
  AutomationStateRow,
  CronSummary,
  PushRow,
  PushSubscriptionRow,
  CronNotifySummary,
};
