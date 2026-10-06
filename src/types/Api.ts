import type { z } from "zod";
import type {
  deleteAccountSchema,
  loginSchema,
  mfaSchema,
  newPasswordSchema,
  resetRequestSchema,
  signupSchema,
} from "../lib/authSchemas";
import type {
  credentialsSchema,
  providerSchema,
} from "../lib/credentialSchemas";
import type { contactSchema } from "../lib/contactSchema";
import type { periodsSchema } from "../lib/growattSchemas";
import type { joinSchema } from "../lib/octopusSchemas";
import type {
  batterySchema,
  dailyExportSchema,
  exportPresetsSchema,
  settingsSchema,
  themeSchema,
} from "../lib/settingsSchema";
import type { ChargePlan, Dispatch, PowerDownSession } from "./Octopus";

// Shared by the api/ functions and the app.

// The JSON body of every error response.
type ApiError = {
  code: string;
  message: string;
};

type LoginBody = z.infer<typeof loginSchema>;
type SignupBody = z.infer<typeof signupSchema>;
type ContactBody = z.infer<typeof contactSchema>;
type MfaBody = z.infer<typeof mfaSchema>;
// POST and PUT /api/auth/password.
type ResetRequestBody = z.infer<typeof resetRequestSchema>;
type NewPasswordBody = z.infer<typeof newPasswordSchema>;
// PUT /api/credentials. Sent once to be checked and saved; never sent back.
type CredentialsBody = z.infer<typeof credentialsSchema>;

// GET /api/auth/me
type Me = {
  email: string | null;
  // aal2 once the user has passed an MFA check in this session.
  aal: "aal1" | "aal2";
  mfaEnrolled: boolean;
  // False for Google users until they add one.
  hasPassword: boolean;
  hasGrowatt: boolean;
  hasOctopus: boolean;
  // Saved in settings; here too so every page can use it.
  theme: Theme;
};

// POST /api/auth/mfa { action: "enroll" }. Shown once, to add the app.
type MfaEnrollment = {
  // A data: URL of an SVG QR code, for an <img>.
  qrCode: string;
  // The same secret as text, for typing in by hand.
  secret: string;
};

// PUT /api/growatt/charge and /api/growatt/discharge. GET returns the
// ChargePeriods type from Growatt.ts.
type PeriodsBody = z.infer<typeof periodsSchema>;

// GET /api/growatt/battery: how full the battery is now, in percent.
type BatterySoc = { soc: number };

// GET /api/octopus/slots
type OctopusSlots = { plannedDispatches: Dispatch[] };

// GET /api/octopus/sessions. SavingSessionsData, with the dates as ISO strings.
type SessionJson = Omit<PowerDownSession, "startAt" | "endAt"> & {
  startAt: string;
  endAt: string;
};
type SavingSessions = {
  region: number | null;
  events: SessionJson[];
  joined: SessionJson[];
};

// POST /api/octopus/join
type JoinBody = z.infer<typeof joinSchema>;

// PUT /api/settings: the charge window, power, stop SOC and automation.
type ChargeSettings = z.infer<typeof settingsSchema>;

// PUT /api/settings?part=export: the two Grid First preset buttons.
type ExportPresets = z.infer<typeof exportPresetsSchema>;
type ExportPreset = ExportPresets["high"];
type Preset = keyof ExportPresets;

// PUT /api/settings?part=daily: Export every day on or off.
type DailyExport = z.infer<typeof dailyExportSchema>;

// PUT /api/settings?part=battery: battery size and max discharge power.
type BatteryInfo = z.infer<typeof batterySchema>;

// PUT /api/settings?part=theme. system follows the device.
type ThemeSetting = z.infer<typeof themeSchema>;
type Theme = ThemeSetting["theme"];

// GET /api/settings, and what the PUTs return. exportEveryDay: the export
// times last applied on the dashboard are put back every night after
// Growatt's 23:30 reset. batteryKwh, maxDischargeKw: null until saved.
type Settings = ChargeSettings & {
  exportPresets: ExportPresets;
  exportEveryDay: boolean;
  theme: Theme;
} & { [K in keyof BatteryInfo]: BatteryInfo[K] | null };

// GET /api/automation: what automatic charging last did. Times are ISO
// strings, null until it first happens.
type AutomationStatus = {
  // When the last check finished.
  checkedAt: string | null;
  // Why the last check failed, or null if it worked.
  error: { code: string; message: string } | null;
  // A saved login was refused, so scheduled checks wait for new details or
  // Sync now.
  paused: boolean;
  // The charge times the inverter was last set to or found with, e.g.
  // "01:00-05:00, 18:00-19:00"; "" for none.
  slots: string | null;
  // When automatic charging last changed the inverter.
  appliedAt: string | null;
};

// POST /api/automation (Sync now). busy: another check was already running.
// plan: what the inverter now has, when the check got that far.
type CheckNowResult = {
  result: "applied" | "unchanged" | "failed" | "busy";
  plan: ChargePlan | null;
  status: AutomationStatus;
};

// DELETE /api/account.
type DeleteAccountBody = z.infer<typeof deleteAccountSchema>;

// GET /api/account: everything stored about the user (UK GDPR access request).
// Never any secrets.
type AccountExport = {
  exportedAt: string;
  account: {
    id: string;
    email: string | null;
    createdAt: string;
    lastSignInAt: string | null;
    // "email", "google".
    signInMethods: string[];
    mfaEnrolled: boolean;
  };
  settings: Settings;
  automation: AutomationStatus;
  credentials: Credentials;
  auditLog: {
    at: string;
    action: string;
    details: unknown;
    ip: string | null;
  }[];
};

// GET /api/account?view=activity&before=<id>: the activity log, newest first,
// a page at a time. nextBefore: pass it as before for the next page, or null
// when there's no more.
type ActivityEntry = {
  id: string;
  at: string;
  action: string;
  details: unknown;
  // null for the scheduled job's entries.
  ip: string | null;
};
type ActivityPage = {
  entries: ActivityEntry[];
  nextBefore: string | null;
};

// How a signed_in entry in the activity log logged in.
type SignInMethod = "password" | "google" | "email_link";

type Provider = z.infer<typeof providerSchema>;

// GET /api/credentials, and the reply to PUT and DELETE. Never the secrets.
type Credentials = {
  growatt: { serial: string; verifiedAt: string } | null;
  octopus: { account: string; verifiedAt: string } | null;
};

export type {
  ApiError,
  LoginBody,
  SignupBody,
  ContactBody,
  MfaBody,
  ResetRequestBody,
  NewPasswordBody,
  CredentialsBody,
  Me,
  MfaEnrollment,
  Provider,
  Credentials,
  ChargeSettings,
  ExportPresets,
  ExportPreset,
  Preset,
  DailyExport,
  BatteryInfo,
  ThemeSetting,
  Theme,
  Settings,
  AutomationStatus,
  CheckNowResult,
  PeriodsBody,
  BatterySoc,
  OctopusSlots,
  SessionJson,
  SavingSessions,
  JoinBody,
  AccountExport,
  ActivityEntry,
  ActivityPage,
  SignInMethod,
  DeleteAccountBody,
};
