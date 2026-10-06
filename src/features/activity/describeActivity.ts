import { GROWATT_RESET } from "../../lib/dailyExport";
import type { ActivityDescription } from "../../types/Activity";
import type { ActivityEntry } from "../../types/Api";

// Turns activity log entries into words. details comes from the database as
// JSON and has changed over time, so every field is read defensively.

const field = (details: unknown, key: string): unknown =>
  typeof details === "object" && details !== null && key in details
    ? (details as Record<string, unknown>)[key]
    : undefined;

const text = (details: unknown, key: string) => {
  const value = field(details, key);
  return typeof value === "string" && value !== "" ? value : undefined;
};

const number = (details: unknown, key: string) => {
  const value = field(details, key);
  if (typeof value === "number") return value;
  return typeof value === "string" && value !== "" && !isNaN(Number(value))
    ? Number(value)
    : undefined;
};

const flag = (details: unknown, key: string) => {
  const value = field(details, key);
  return typeof value === "boolean" ? value : undefined;
};

// "01:00-05:00, 18:30-19:00" → "01:00–05:00, 18:30–19:00". Empty slots are
// left out.
const formatSlots = (slots: string | undefined, none = "no charge times") => {
  const real = (slots ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "" && s !== "00:00-00:00")
    .map((s) => s.replace("-", "–"));
  return real.length > 0 ? real.join(", ") : none;
};

// "power 100% · stop at 90%", with whichever of the two is there.
const powerAndStop = (details: unknown) => {
  const power = number(details, "powerRate");
  const stop = number(details, "stopSOC");
  return [
    power !== undefined && `power ${String(power)}%`,
    stop !== undefined && `stop at ${String(stop)}%`,
  ].filter((part): part is string => typeof part === "string");
};

const join = (parts: (string | false | undefined)[]) => {
  const kept = parts.filter((p): p is string => typeof p === "string" && !!p);
  return kept.length > 0 ? kept.join(" · ") : undefined;
};

const SIGN_IN_METHODS: Record<string, string> = {
  password: "With your password",
  google: "With Google",
  email_link: "From a link in an email",
};

const CHECK_FAILURES: Record<string, string> = {
  growatt_login_failed: "Wrong Growatt username or password",
  growatt_serial_failed: "The inverter serial number didn't match the account",
  octopus_key_failed: "Octopus didn't recognise the API key",
  octopus_account_failed: "The account number didn't match the API key",
};

const SAVED = { growatt: "Growatt login", octopus: "Octopus API key" };

const providerName = (details: unknown) =>
  text(details, "provider") === "octopus" ? SAVED.octopus : SAVED.growatt;

const describeAutomation = (details: unknown): ActivityDescription => {
  const trigger =
    text(details, "trigger") === "check_now" ? "Sync now" : "Scheduled check";
  switch (text(details, "result")) {
    case "applied": {
      const skipped = number(details, "skipped") ?? 0;
      // What changed, compared with what the inverter had. Entries from before
      // these were recorded have none of them.
      const ended = text(details, "ended");
      const removed = text(details, "removed");
      const added = text(details, "added");
      const changes = [
        ended && `${formatSlots(ended)} finished`,
        removed && `removed ${formatSlots(removed)}`,
        added && `added ${formatSlots(added)}`,
      ].filter((c): c is string => typeof c === "string");
      const slots = formatSlots(text(details, "slots"));
      return {
        title: "Automatic charging updated your inverter",
        detail: join([
          trigger,
          ...changes,
          changes.length > 0 ? `now ${slots}` : slots,
          ...powerAndStop(details),
          skipped > 0 &&
            `${String(skipped)} Octopus slot${skipped === 1 ? "" : "s"} didn't fit`,
        ]),
        failed: false,
      };
    }
    case "failed":
      return {
        title: "Automatic charging stopped working",
        detail: join([
          trigger,
          text(details, "message"),
          flag(details, "paused") && "Paused until you update your saved login",
        ]),
        failed: true,
      };
    case "recovered":
      return {
        title: "Automatic charging is working again",
        detail: trigger,
        failed: false,
      };
    default:
      return { title: "Automatic charging ran", failed: false };
  }
};

// "High Export 18:00–19:00, 95%, stop at 20%", from highName, highStart…
const describePreset = (details: unknown, key: "high" | "low") => {
  const start = text(details, `${key}Start`);
  const end = text(details, `${key}End`);
  const power = number(details, `${key}Power`);
  const stop = number(details, `${key}Stop`);
  const parts = [
    start && end && `${start}–${end}`,
    power !== undefined && `${String(power)}%`,
    stop !== undefined && `stop at ${String(stop)}%`,
  ].filter((part): part is string => typeof part === "string" && part !== "");
  const name = text(details, `${key}Name`);
  if (!name && parts.length === 0) return undefined;
  return [name ?? (key === "high" ? "First" : "Second"), parts.join(", ")]
    .filter(Boolean)
    .join(" ");
};

const describeActivity = ({
  action,
  details,
}: ActivityEntry): ActivityDescription => {
  switch (action) {
    case "signed_in":
      return {
        title: "Logged in",
        detail: SIGN_IN_METHODS[text(details, "method") ?? ""],
        failed: false,
      };
    case "mfa_enrolled":
      return { title: "Two-step verification turned on", failed: false };
    case "mfa_removed":
      return { title: "Two-step verification turned off", failed: false };
    case "password_changed":
      return {
        title: "Password changed",
        detail: flag(details, "otherSessionsEnded")
          ? "Other devices were logged out"
          : undefined,
        failed: false,
      };
    case "account_exported":
      return { title: "Your data was downloaded", failed: false };
    case "credentials_saved": {
      const id = text(details, "identifier");
      const octopus = text(details, "provider") === "octopus";
      return {
        title: `${providerName(details)} saved`,
        detail: id && (octopus ? `Account ${id}` : `Inverter ${id}`),
        failed: false,
      };
    }
    case "credentials_deleted":
      return { title: `${providerName(details)} removed`, failed: false };
    case "credentials_check_failed":
      return {
        title:
          text(details, "provider") === "octopus"
            ? "Octopus didn't accept the details you entered"
            : "Growatt didn't accept the details you entered",
        detail: CHECK_FAILURES[text(details, "reason") ?? ""],
        failed: true,
      };
    case "settings_saved": {
      // Entries from before the window could be turned off have no
      // windowEnabled; the window was always on then.
      const windowOn = flag(details, "windowEnabled") ?? true;
      const start = text(details, "chargeStart");
      const end = text(details, "chargeEnd");
      const automation = flag(details, "automationEnabled");
      return {
        title: "Battery charging settings saved",
        detail: join([
          windowOn
            ? start && end && `Window ${start}–${end}`
            : "No charge window",
          ...powerAndStop(details),
          automation !== undefined &&
            `automatic charging ${automation ? "on" : "off"}`,
        ]),
        failed: false,
      };
    }
    case "growatt_write": {
      const isExport = text(details, "kind") === "discharge";
      const ok = flag(details, "ok") ?? true;
      if (flag(details, "oneOff"))
        return {
          title: ok
            ? "Export until battery % set"
            : "Couldn't set Export until battery %",
          detail: join([
            formatSlots(text(details, "slots"), "no export times"),
            ...powerAndStop(details),
          ]),
          failed: !ok,
        };
      return {
        title: ok
          ? `${isExport ? "Export" : "Charge"} times changed`
          : `Couldn't change the ${isExport ? "export" : "charge"} times`,
        detail: join([
          isExport
            ? formatSlots(text(details, "slots"), "no export times")
            : formatSlots(text(details, "slots")),
          ...powerAndStop(details),
        ]),
        failed: !ok,
      };
    }
    // Daily export, after a save in Settings or Growatt's nightly reset.
    case "export_restored":
      return flag(details, "ok") === false
        ? {
            title: "Couldn't put your export times back",
            detail: text(details, "message"),
            failed: true,
          }
        : {
            title: `Export times put back after Growatt's ${GROWATT_RESET} reset`,
            detail: join([
              formatSlots(text(details, "slots"), "no export times"),
              ...powerAndStop(details),
            ]),
            failed: false,
          };
    case "octopus_join": {
      const ok = flag(details, "ok") ?? true;
      return {
        title: ok
          ? "Joined a saving session"
          : "Couldn't join a saving session",
        failed: !ok,
      };
    }
    case "export_presets_saved":
      return {
        title: "Export to grid presets saved",
        detail: join([
          describePreset(details, "high"),
          describePreset(details, "low"),
        ]),
        failed: false,
      };
    case "daily_export_saved":
      return {
        title:
          flag(details, "enabled") === false
            ? "Export every day turned off"
            : "Export every day turned on",
        failed: false,
      };
    case "battery_saved": {
      const kwh = number(details, "batteryKwh");
      const kw = number(details, "maxDischargeKw");
      return {
        title: "Battery details saved",
        detail: join([
          kwh !== undefined && `${String(kwh)} kWh`,
          kw !== undefined && `max ${String(kw)} kW`,
        ]),
        failed: false,
      };
    }
    // The 5-minute check, after an Export until battery % slot ended.
    case "one_off_ended":
      return flag(details, "ok") === false
        ? {
            title: "Couldn't turn off Export until battery %",
            detail: text(details, "message"),
            failed: true,
          }
        : {
            title: "Export until battery % finished",
            detail: flag(details, "removed")
              ? "Export times turned off"
              : "The export times had already changed, so they were left alone",
            failed: false,
          };
    case "automation_run":
      return describeAutomation(details);
    default:
      return { title: action, failed: false };
  }
};

export default describeActivity;
