import type { VercelRequest, VercelResponse } from "@vercel/node";
import { hasPassed } from "../src/lib/automaticExport";
import { ukDay } from "../src/lib/dailyExport";
import {
  automaticExportSchema,
  batterySchema,
  dailyExportSchema,
  exportPresetsSchema,
  settingsSchema,
  themeSchema,
} from "../src/lib/settingsSchema";
import type { ExportPresets } from "../src/types/Api";
import { audit } from "./_lib/audit";
import { checkOrigin } from "./_lib/csrf";
import { withUser } from "./_lib/db";
import { allowMethods, sendError } from "./_lib/http";
import { requireUser } from "./_lib/session";
import { readSettings, recheckInverter } from "./_lib/userData";

// The presets as flat audit details, e.g. highName, highStart.
const presetDetails = ({ high, low }: ExportPresets) =>
  Object.fromEntries(
    Object.entries({ high, low }).flatMap(([key, p]) => [
      [`${key}Name`, p.name],
      [`${key}Start`, p.start],
      [`${key}End`, p.end],
      [`${key}Power`, p.powerRate],
      [`${key}Stop`, p.stopSOC],
    ]),
  ) as Record<string, string | number>;

// GET → Settings.
// PUT ChargeSettings → Settings. Automation can only be turned on once both
//   Growatt and Octopus credentials are saved. Leaves the presets alone.
// PUT ?part=export ExportPresets → Settings. The Grid First preset buttons;
//   leaves everything else alone.
// PUT ?part=daily DailyExport → Settings. Turns Export every day on or off;
//   on needs Growatt credentials. Leaves everything else alone.
// PUT ?part=automatic AutomaticExport → Settings. Export until battery %
//   every evening; on needs Growatt and Octopus credentials and the battery
//   details. Leaves everything else alone.
// PUT ?part=battery BatteryInfo → Settings. Battery size and max discharge
//   power, for Export until battery %. Leaves everything else alone.
// PUT ?part=theme ThemeSetting → Settings. Light, dark or the device's
//   setting. Leaves everything else alone. Not audited: it's only how the
//   app looks.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "PUT"]) || !checkOrigin(req, res)) return;
  const user = await requireUser(req, res);
  if (!user) return;
  const { userId } = user;

  if (req.method === "GET") {
    res.json(await withUser(userId, readSettings));
    return;
  }

  if (req.query.part === "export") {
    const presets = exportPresetsSchema.safeParse(req.body);
    if (!presets.success) {
      sendError(
        res,
        400,
        "invalid_input",
        presets.error.issues[0]?.message ?? "Invalid input",
      );
      return;
    }
    const { high, low } = presets.data;
    res.json(
      await withUser(userId, async (tx) => {
        await tx`
          insert into private.user_settings
            (user_id, high_export_name, high_export_start, high_export_end,
              high_export_power, high_export_stop, low_export_name,
              low_export_start, low_export_end, low_export_power,
              low_export_stop)
          values (${userId}, ${high.name}, ${high.start}, ${high.end},
            ${high.powerRate}, ${high.stopSOC}, ${low.name}, ${low.start},
            ${low.end}, ${low.powerRate}, ${low.stopSOC})
          on conflict (user_id) do update set
            high_export_name = excluded.high_export_name,
            high_export_start = excluded.high_export_start,
            high_export_end = excluded.high_export_end,
            high_export_power = excluded.high_export_power,
            high_export_stop = excluded.high_export_stop,
            low_export_name = excluded.low_export_name,
            low_export_start = excluded.low_export_start,
            low_export_end = excluded.low_export_end,
            low_export_power = excluded.low_export_power,
            low_export_stop = excluded.low_export_stop`;
        await audit(
          tx,
          req,
          userId,
          "export_presets_saved",
          presetDetails(presets.data),
        );
        return readSettings(tx);
      }),
    );
    return;
  }

  if (req.query.part === "theme") {
    const body = themeSchema.safeParse(req.body);
    if (!body.success) {
      sendError(
        res,
        400,
        "invalid_input",
        body.error.issues[0]?.message ?? "Invalid input",
      );
      return;
    }
    const { theme } = body.data;
    res.json(
      await withUser(userId, async (tx) => {
        await tx`
          insert into private.user_settings (user_id, theme)
          values (${userId}, ${theme})
          on conflict (user_id) do update set theme = excluded.theme`;
        return readSettings(tx);
      }),
    );
    return;
  }

  if (req.query.part === "battery") {
    const battery = batterySchema.safeParse(req.body);
    if (!battery.success) {
      sendError(
        res,
        400,
        "invalid_input",
        battery.error.issues[0]?.message ?? "Invalid input",
      );
      return;
    }
    const { batteryKwh, maxDischargeKw } = battery.data;
    res.json(
      await withUser(userId, async (tx) => {
        await tx`
          insert into private.user_settings
            (user_id, battery_kwh, battery_max_kw)
          values (${userId}, ${batteryKwh}, ${maxDischargeKw})
          on conflict (user_id) do update set
            battery_kwh = excluded.battery_kwh,
            battery_max_kw = excluded.battery_max_kw`;
        await audit(tx, req, userId, "battery_saved", battery.data);
        return readSettings(tx);
      }),
    );
    return;
  }

  if (req.query.part === "daily") {
    const daily = dailyExportSchema.safeParse(req.body);
    if (!daily.success) {
      sendError(
        res,
        400,
        "invalid_input",
        daily.error.issues[0]?.message ?? "Invalid input",
      );
      return;
    }
    const { enabled } = daily.data;
    const saved = await withUser(userId, async (tx) => {
      if (enabled) {
        const rows = await tx`
          select from private.user_credentials where provider = 'growatt'`;
        if (rows.length === 0) return null;
      }
      // Off forgets the kept times, so turning it on again starts afresh.
      await tx`
        insert into private.user_settings (user_id, keep_export)
        values (${userId}, ${enabled})
        on conflict (user_id) do update set
          keep_export = excluded.keep_export,
          keep_export_power = null, keep_export_stop = null,
          keep_export_slots = null`;
      // The next check (within 5 minutes) keeps the export times on the
      // inverter now.
      if (enabled)
        await tx`
          update private.automation_state set export_restored_on = null`;
      await audit(tx, req, userId, "daily_export_saved", { enabled });
      return readSettings(tx);
    });
    if (!saved) {
      sendError(
        res,
        409,
        "credentials_missing",
        "Save your Growatt details before turning on Export every day",
      );
      return;
    }
    res.json(saved);
    return;
  }

  if (req.query.part === "automatic") {
    const automatic = automaticExportSchema.safeParse(req.body);
    if (!automatic.success) {
      sendError(
        res,
        400,
        "invalid_input",
        automatic.error.issues[0]?.message ?? "Invalid input",
      );
      return;
    }
    const { enabled, at, powerRate, stopSOC, minSOC } = automatic.data;
    const saved = await withUser(userId, async (tx) => {
      if (enabled) {
        // Octopus is optional: without it, there's no car check.
        const growatt = await tx`
          select from private.user_credentials where provider = 'growatt'`;
        const battery = await tx`
          select from private.user_settings
          where battery_kwh is not null and battery_max_kw is not null`;
        if (growatt.length === 0 || battery.length === 0) return null;
      }
      await tx`
        insert into private.user_settings
          (user_id, automatic_export, automatic_export_at,
            automatic_export_power, automatic_export_stop,
            automatic_export_min_soc)
        values (${userId}, ${enabled}, ${at}, ${powerRate}, ${stopSOC},
          ${minSOC})
        on conflict (user_id) do update set
          automatic_export = excluded.automatic_export,
          automatic_export_at = excluded.automatic_export_at,
          automatic_export_power = excluded.automatic_export_power,
          automatic_export_stop = excluded.automatic_export_stop,
          automatic_export_min_soc = excluded.automatic_export_min_soc`;
      // Saved after today's time: it starts tomorrow, not straight away. A
      // failure from an earlier try is forgotten.
      if (enabled)
        await tx`
          insert into private.automation_state as s
            (user_id, automatic_export_on)
          values (${userId},
            ${hasPassed(at) ? ukDay(new Date()) : null}::date)
          on conflict (user_id) do update set
            automatic_export_on =
              coalesce(excluded.automatic_export_on, s.automatic_export_on),
            automatic_export_code = null, automatic_export_message = null`;
      await audit(tx, req, userId, "automatic_export_saved", automatic.data);
      return readSettings(tx);
    });
    if (!saved) {
      sendError(
        res,
        409,
        "setup_missing",
        "Save your Growatt details and your battery details before turning on Automatic export",
      );
      return;
    }
    res.json(saved);
    return;
  }

  const body = settingsSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  const settings = body.data;
  const saved = await withUser(userId, async (tx) => {
    if (settings.automationEnabled) {
      const [{ providers }] = await tx<{ providers: number }[]>`
        select count(*)::int as providers from private.user_credentials`;
      if (providers < 2) return null;
    }
    await tx`
      insert into private.user_settings
        (user_id, window_enabled, charge_start, charge_end, power_rate,
          stop_soc, automation_enabled)
      values (${userId}, ${settings.windowEnabled}, ${settings.chargeStart},
        ${settings.chargeEnd}, ${settings.powerRate}, ${settings.stopSOC},
        ${settings.automationEnabled})
      on conflict (user_id) do update set
        window_enabled = excluded.window_enabled,
        charge_start = excluded.charge_start, charge_end = excluded.charge_end,
        power_rate = excluded.power_rate, stop_soc = excluded.stop_soc,
        automation_enabled = excluded.automation_enabled`;
    // The inverter may have changed while automation was off.
    await recheckInverter(tx);
    await audit(tx, req, userId, "settings_saved", settings);
    return readSettings(tx);
  });
  if (!saved) {
    sendError(
      res,
      409,
      "credentials_missing",
      "Save your Growatt and Octopus details before turning on automation",
    );
    return;
  }
  res.json(saved);
};

export default handler;
