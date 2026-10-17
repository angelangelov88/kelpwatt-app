import describeActivity from "./describeActivity";
import type { NotificationCategory, NotificationPrefs } from "../types/Api";
import type { PushEntry, PushPayload } from "../types/Notifications";

// Which activity entries become push notifications. The words are the same as
// the activity page's. Only what the background check did is sent, since the
// result of a button is already on the user's screen; security changes are
// sent either way, so the user notices one that wasn't them.

const SECURITY_ACTIONS = new Set([
  "signed_in",
  "password_changed",
  "mfa_enrolled",
  "mfa_removed",
  "credentials_saved",
  "credentials_deleted",
  "account_exported",
]);

const TAGS: Record<NotificationCategory, string> = {
  failures: "failure",
  automaticExport: "automatic-export",
  exports: "export",
  security: "security",
  summary: "summary",
};

const field = (details: unknown, key: string): unknown =>
  typeof details === "object" && details !== null && key in details
    ? (details as Record<string, unknown>)[key]
    : undefined;

// The kind of notification an entry is, or undefined when it isn't sent.
const categoryOf = ({
  action,
  details,
  fromSchedule,
}: PushEntry): NotificationCategory | undefined => {
  if (SECURITY_ACTIONS.has(action)) return "security";
  if (!fromSchedule) return undefined;
  const result = field(details, "result");
  const ok = field(details, "ok");
  switch (action) {
    // A failure is sent straight away only when the user must do something,
    // or once it's lasted (still_failing); "working again" only after one of
    // those (api/_lib/automation.ts sets notify).
    case "automation_run":
      return result === "still_failing" ||
        ((result === "failed" || result === "recovered") &&
          field(details, "notify") === true)
        ? "failures"
        : undefined;
    case "automatic_export_run":
      return result === "failed" ? "failures" : "automaticExport";
    case "one_off_ended":
      return ok === false ? "failures" : "exports";
    case "export_restored":
      return ok === false ? "failures" : undefined;
    case "charging_summary":
      return "summary";
    default:
      return undefined;
  }
};

// The notification for an entry, or null when it isn't sent or the user
// turned that kind off.
const notificationFor = (
  entry: PushEntry,
  prefs: NotificationPrefs,
): PushPayload | null => {
  const category = categoryOf(entry);
  if (!category || !prefs[category]) return null;
  const { title, detail } = describeActivity(entry);
  return { title, body: detail ?? "", tag: TAGS[category], url: "/activity" };
};

export { notificationFor };
