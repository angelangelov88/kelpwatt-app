import { GROWATT_RESET } from "./dailyExport";
import type { ActivityDescription } from "../types/Activity";
import type { ActivityEntry } from "../types/Api";

// Turns activity log entries into words, for the activity page and push
// notifications. details comes from the database as JSON and has changed over
// time, so every field is read defensively.

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
  growatt_in_use: "That inverter is already linked to another Kelpwatt account",
  octopus_in_use:
    "That Octopus account is already linked to another Kelpwatt account",
};

// Growatt or Octopus didn't answer: at which call, and how.
const UNAVAILABLE_STEPS: Record<string, string> = {
  login: "Growatt didn't answer the login",
  inverter: "Logged in, but the inverter didn't answer",
  key: "Octopus didn't answer the API key check",
  account: "Octopus didn't answer the account check",
};
const OUTAGE_KINDS: Record<string, string> = {
  timeout: "no reply in time",
  network: "couldn't connect",
  unexpected_reply: "an unexpected reply",
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
    // Written once a failure has lasted half an hour.
    case "still_failing": {
      const since = text(details, "since");
      return {
        title: "Automatic charging still isn't working",
        detail: join([since && `Since ${since}`, text(details, "message")]),
        failed: true,
      };
    }
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

// What tonight's Automatic export did: started, skipped (and why) or failed.
const describeAutomaticExport = (details: unknown): ActivityDescription => {
  const at = text(details, "at");
  const soc = number(details, "soc");
  const skipped = (reason: string | undefined) => ({
    title: "Automatic export skipped",
    detail: join([at && `Set for ${at}`, reason]),
    failed: false,
  });
  switch (text(details, "result")) {
    case "exported":
      return {
        title: "Automatic export started",
        detail: join([
          formatSlots(text(details, "slot"), "no export times"),
          soc !== undefined && `from ${String(soc)}%`,
          ...powerAndStop(details),
          flag(details, "capped") &&
            `cut short to end before Growatt's ${GROWATT_RESET} reset`,
        ]),
        failed: false,
      };
    case "car_plugged_in":
      return skipped("Your car was plugged in");
    case "busy":
      return skipped("An Export until battery % was already running");
    case "low_battery": {
      const min = number(details, "minSOC");
      return skipped(
        soc !== undefined && min !== undefined
          ? `The battery was at ${String(soc)}%, below your ${String(min)}% minimum`
          : "The battery was below your minimum",
      );
    }
    case "already":
      return skipped(
        soc !== undefined
          ? `The battery was already at ${String(soc)}%, near your stop level`
          : "The battery was already near your stop level",
      );
    case "too_late":
      return skipped(`Too close to Growatt's ${GROWATT_RESET} reset`);
    case "too_short": {
      const minutes = number(details, "minutes");
      return skipped(
        minutes !== undefined
          ? `It would only have lasted ${String(minutes)} minute${minutes === 1 ? "" : "s"}`
          : "It would have been too short",
      );
    }
    case "failed":
      return {
        title: "Automatic export didn't run",
        detail: join([
          at && `Set for ${at}`,
          text(details, "message"),
          flag(details, "paused") && "Update your saved login in Settings",
        ]),
        failed: true,
      };
    default:
      return { title: "Automatic export ran", failed: false };
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

// The morning charging summary: the battery level now, the user's window and
// the other times it was set to charge overnight, and how many checks failed.
// It only counts as a problem if automatic charging was still failing then
// (problem: its message). Entries from before that was recorded don't have it.
const describeChargingSummary = (details: unknown): ActivityDescription => {
  const soc = number(details, "soc");
  const failures = number(details, "failures") ?? 0;
  const window = text(details, "window");
  const slots = text(details, "slots");
  const problem = text(details, "problem");
  const detail = join([
    soc !== undefined
      ? `Battery at ${String(soc)}%`
      : "Couldn't read your battery level",
    window && `your ${formatSlots(window)} window`,
    slots && `${window ? "plus " : ""}Octopus slots ${formatSlots(slots)}`,
    !window && !slots && "no charge times",
    ...(problem
      ? [
          `still not working: ${problem}`,
          flag(details, "paused") && "Paused until you update your saved login",
        ]
      : [
          failures > 0 &&
            `${String(failures)} check${failures === 1 ? "" : "s"} failed, later ones worked`,
        ]),
  ]);
  return problem
    ? { title: "Automatic charging isn't working", detail, failed: true }
    : { title: "Last night's charging", detail, failed: false };
};

const describeActivity = ({
  action,
  details,
}: Pick<ActivityEntry, "action" | "details">): ActivityDescription => {
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
        title: text(details, "reason")?.endsWith("_in_use")
          ? `Couldn't save your ${providerName(details)}`
          : text(details, "provider") === "octopus"
            ? "Octopus didn't accept the details you entered"
            : "Growatt didn't accept the details you entered",
        detail: CHECK_FAILURES[text(details, "reason") ?? ""],
        failed: true,
      };
    // Growatt or Octopus didn't answer, so the details weren't checked.
    case "credentials_check_unavailable":
      return {
        title: `Couldn't check your ${providerName(details)}`,
        detail: join([
          UNAVAILABLE_STEPS[text(details, "step") ?? ""],
          OUTAGE_KINDS[text(details, "outage") ?? ""],
        ]),
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
    case "automatic_export_saved": {
      const at = text(details, "at");
      const min = number(details, "minSOC");
      return {
        title: "Automatic export settings saved",
        detail: join([
          flag(details, "enabled") ? "On" : "Off",
          at && `every evening at ${at}`,
          ...powerAndStop(details),
          min !== undefined && `only from ${String(min)}%`,
        ]),
        failed: false,
      };
    }
    // The 5-minute check, at the time chosen for Automatic export.
    case "automatic_export_run":
      return describeAutomaticExport(details);
    case "automation_run":
      return describeAutomation(details);
    // The first scheduled check after 07:00, with automatic charging on.
    case "charging_summary":
      return describeChargingSummary(details);
    default:
      return { title: action, failed: false };
  }
};

export default describeActivity;
