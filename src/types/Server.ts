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
  | "settings_saved"
  | "growatt_write"
  | "octopus_join"
  | "automation_run"
  | "signed_in"
  | "export_presets_saved"
  | "daily_export_saved"
  | "export_restored"
  | "battery_saved"
  | "one_off_ended";

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
};

// The /api/cron/update reply. Counts only: GitHub Actions logs are public.
type CronSummary = { users: number } & Record<AutomationResult, number>;

export type {
  Tx,
  Provider,
  EncryptedSecret,
  SessionUser,
  GoogleLogin,
  Handler,
  AuditAction,
  AutomationResult,
  AutomationOutcome,
  AutomationTrigger,
  AutomationStateRow,
  CronSummary,
};
