import {
  defaultAutomaticExport,
  defaultExportPresets,
  defaultSettings,
} from "../../src/lib/settingsSchema";
import { keptPlan } from "../../src/lib/dailyExport";
import type {
  AutomationStatus,
  Credentials,
  ExportPreset,
  Preset,
  Settings,
  Theme,
} from "../../src/types/Api";
import type { Provider, Tx } from "../../src/types/Server";

// Reads (and small updates) of the user's own rows, shared by several
// endpoints. Run inside withUser.

type SettingsRow = {
  window_enabled: boolean;
  charge_start: string | null;
  theme: Theme;
  charge_end: string | null;
  power_rate: number | null;
  stop_soc: number | null;
  automation_enabled: boolean;
  keep_export: boolean;
  battery_kwh: number | null;
  battery_max_kw: number | null;
  automatic_export: boolean;
  automatic_export_at: string | null;
  automatic_export_power: number | null;
  automatic_export_stop: number | null;
  automatic_export_min_soc: number | null;
} & Record<`${Preset}_export_${"name" | "start" | "end"}`, string | null> &
  Record<`${Preset}_export_${"power" | "stop"}`, number | null>;

type AutomationRow = {
  checked_at: Date | null;
  plan_slots: string | null;
  applied_at: Date | null;
  last_code: string | null;
  last_message: string | null;
  paused: boolean;
};

// The user's settings, or the defaults for anything not saved yet.
const readSettings = async (tx: Tx): Promise<Settings> => {
  const rows = await tx<SettingsRow[]>`
    select window_enabled, charge_start::text as charge_start,
      charge_end::text as charge_end, power_rate, stop_soc, automation_enabled,
      high_export_name, high_export_start::text as high_export_start,
      high_export_end::text as high_export_end, high_export_power,
      high_export_stop,
      low_export_name, low_export_start::text as low_export_start,
      low_export_end::text as low_export_end, low_export_power,
      low_export_stop, keep_export,
      -- numeric comes back as a string otherwise.
      battery_kwh::float8 as battery_kwh,
      battery_max_kw::float8 as battery_max_kw,
      automatic_export, automatic_export_at::text as automatic_export_at,
      automatic_export_power, automatic_export_stop, automatic_export_min_soc,
      theme
    from private.user_settings`;
  const row = rows.at(0);
  const preset = (key: Preset): ExportPreset => {
    const fallback = defaultExportPresets[key];
    return {
      name: row?.[`${key}_export_name`] ?? fallback.name,
      start: row?.[`${key}_export_start`]?.slice(0, 5) ?? fallback.start,
      end: row?.[`${key}_export_end`]?.slice(0, 5) ?? fallback.end,
      powerRate: row?.[`${key}_export_power`] ?? fallback.powerRate,
      stopSOC: row?.[`${key}_export_stop`] ?? fallback.stopSOC,
    };
  };
  return {
    windowEnabled: row?.window_enabled ?? defaultSettings.windowEnabled,
    // Postgres gives HH:MM:SS.
    chargeStart: row?.charge_start?.slice(0, 5) ?? defaultSettings.chargeStart,
    chargeEnd: row?.charge_end?.slice(0, 5) ?? defaultSettings.chargeEnd,
    powerRate: row?.power_rate ?? defaultSettings.powerRate,
    stopSOC: row?.stop_soc ?? defaultSettings.stopSOC,
    automationEnabled: row?.automation_enabled ?? false,
    exportPresets: { high: preset("high"), low: preset("low") },
    exportEveryDay: row?.keep_export ?? false,
    automaticExport: {
      enabled: row?.automatic_export ?? false,
      at: row?.automatic_export_at?.slice(0, 5) ?? defaultAutomaticExport.at,
      powerRate:
        row?.automatic_export_power ?? defaultAutomaticExport.powerRate,
      stopSOC: row?.automatic_export_stop ?? defaultAutomaticExport.stopSOC,
      minSOC: row?.automatic_export_min_soc ?? defaultAutomaticExport.minSOC,
    },
    batteryKwh: row?.battery_kwh ?? null,
    maxDischargeKw: row?.battery_max_kw ?? null,
    theme: row?.theme ?? "system",
  };
};

// The export times Export every day puts back: the ones last applied on the
// dashboard (or found on the inverter) while it was on. null when there are
// none, or it's off.
const readKeptExport = async (tx: Tx) => {
  const rows = await tx<{ power: number; stop: number; slots: string }[]>`
    select keep_export_power as power, keep_export_stop as stop,
      keep_export_slots as slots
    from private.user_settings
    where keep_export and keep_export_power is not null
      and keep_export_stop is not null and keep_export_slots is not null`;
  const row = rows.at(0);
  return row ? keptPlan(row.power, row.stop, row.slots) : null;
};

// What's saved, never the secrets.
const readStatus = async (tx: Tx): Promise<Credentials> => {
  const rows = await tx<
    { provider: Provider; identifier: string; verified_at: Date }[]
  >`select provider, identifier, verified_at from private.user_credentials`;
  const find = (provider: Provider) => {
    const row = rows.find((r) => r.provider === provider);
    return row && { id: row.identifier, at: row.verified_at.toISOString() };
  };
  const growatt = find("growatt");
  const octopus = find("octopus");
  return {
    growatt: growatt ? { serial: growatt.id, verifiedAt: growatt.at } : null,
    octopus: octopus ? { account: octopus.id, verifiedAt: octopus.at } : null,
  };
};

// What automatic charging last did, for the dashboard and the data export.
const readAutomationStatus = async (tx: Tx): Promise<AutomationStatus> => {
  const rows = await tx<AutomationRow[]>`
    select checked_at, plan_slots, applied_at, last_code, last_message, paused
    from private.automation_state`;
  const row = rows.at(0);
  return {
    checkedAt: row?.checked_at?.toISOString() ?? null,
    error:
      row?.last_code && row.last_message
        ? { code: row.last_code, message: row.last_message }
        : null,
    paused: row?.paused ?? false,
    slots: row?.plan_slots ?? null,
    appliedAt: row?.applied_at?.toISOString() ?? null,
  };
};

// Makes the next automation check read the inverter instead of trusting what it
// last saw: after a manual change to it, or new settings. unpause: new login
// details were saved, so scheduled checks start again.
const recheckInverter = (tx: Tx, { unpause = false } = {}) =>
  tx`update private.automation_state set inverter_checked_at = null,
    paused = paused and ${!unpause}`;

export {
  readSettings,
  readKeptExport,
  readStatus,
  readAutomationStatus,
  recheckInverter,
};
