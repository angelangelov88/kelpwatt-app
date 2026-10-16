import { z } from "zod";
import { LATEST_START } from "./automaticExport";

// Shared by /api/settings and the settings form.

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");

// A whole-number percentage, as the inverter takes it.
const percentSchema = z
  .int("Use a whole number")
  .min(1, "At least 1%")
  .max(100, "At most 100%");

const settingsSchema = z
  .object({
    // Charge every night in a fixed window of the user's own. Off: only
    // Octopus slots are charged in.
    windowEnabled: z.boolean(),
    // That overnight window, UK time. Kept while windowEnabled is off.
    chargeStart: timeSchema,
    chargeEnd: timeSchema,
    // Percent of the inverter's maximum power used for AC charging.
    powerRate: percentSchema,
    // Stop charging from the grid at this battery level, in percent.
    stopSOC: percentSchema,
    // Let the scheduled job apply Octopus slots to the inverter.
    automationEnabled: z.boolean(),
  })
  // It may cross midnight (end before start), e.g. 23:30–05:30.
  .refine((s) => !s.windowEnabled || s.chargeStart !== s.chargeEnd, {
    message: "The window can't start and end at the same time",
    path: ["chargeEnd"],
  });

// The dashboard's Export to grid dropdowns go in 5% steps.
const stepSchema = percentSchema.multipleOf(5, "Use steps of 5%");

// One of the Export to grid preset buttons: what it fills the form with.
const exportPresetSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give it a name")
      .max(20, "At most 20 characters"),
    start: timeSchema,
    end: timeSchema,
    // Discharge power, percent of the inverter's maximum.
    powerRate: stepSchema,
    // Stop exporting at this battery level, in percent.
    stopSOC: stepSchema,
  })
  .refine((p) => p.start < p.end, {
    message: "It must end after it starts, before midnight",
    path: ["end"],
  });

// PUT /api/settings?part=export
const exportPresetsSchema = z.object({
  high: exportPresetSchema,
  low: exportPresetSchema,
});

// PUT /api/settings?part=daily: put the export times last applied on the
// dashboard back after Growatt clears them each night.
const dailyExportSchema = z.object({ enabled: z.boolean() });

// PUT /api/settings?part=automatic: Export until battery % every evening, at
// a UK time in 5-minute steps (the check runs every 5 minutes).
const automaticExportSchema = z
  .object({
    enabled: z.boolean(),
    at: timeSchema
      .refine((t) => Number(t.slice(3, 5)) % 5 === 0, {
        message: "Use steps of 5 minutes",
      })
      .refine((t) => t <= LATEST_START, {
        message: `No later than ${LATEST_START}`,
      }),
    // Discharge power, percent of the inverter's maximum.
    powerRate: stepSchema,
    // Stop exporting at this battery level, in percent.
    stopSOC: stepSchema,
    // Only start if the battery is at least this full, in percent.
    minSOC: stepSchema,
  })
  .refine((s) => s.minSOC > s.stopSOC, {
    message: "Must be above the stop level",
    path: ["minSOC"],
  });

// PUT /api/settings?part=battery: what the Export until battery % button
// works the end time out from. Growatt doesn't give either.
const batterySchema = z.object({
  // How much the battery holds, in kWh.
  batteryKwh: z
    .number("Enter a number")
    .min(0.5, "At least 0.5 kWh")
    .max(100, "At most 100 kWh")
    .multipleOf(0.1, "Use at most 1 decimal place"),
  // How fast it discharges at a 100% discharge rate, in kW.
  maxDischargeKw: z
    .number("Enter a number")
    .min(0.1, "At least 0.1 kW")
    .max(30, "At most 30 kW")
    .multipleOf(0.01, "Use at most 2 decimal places"),
});

// PUT /api/settings?part=theme: light, dark or the device's setting.
const themeSchema = z.object({ theme: z.enum(["system", "light", "dark"]) });

// PUT /api/settings?part=notifications: which kinds of push notification to
// send, to every device the user has turned them on for.
const notificationsSchema = z.object({
  failures: z.boolean(),
  automaticExport: z.boolean(),
  exports: z.boolean(),
  security: z.boolean(),
  summary: z.boolean(),
});

// Until the user saves their own.
const defaultSettings: z.infer<typeof settingsSchema> = {
  windowEnabled: true,
  chargeStart: "23:30",
  chargeEnd: "05:30",
  powerRate: 35,
  stopSOC: 95,
  automationEnabled: false,
};

const defaultAutomaticExport: z.infer<typeof automaticExportSchema> = {
  enabled: false,
  at: "21:00",
  powerRate: 95,
  stopSOC: 20,
  minSOC: 50,
};

const defaultExportPresets: z.infer<typeof exportPresetsSchema> = {
  high: {
    name: "High Export",
    start: "18:00",
    end: "19:00",
    powerRate: 95,
    stopSOC: 20,
  },
  low: {
    name: "Low Export",
    start: "20:00",
    end: "22:15",
    powerRate: 60,
    stopSOC: 15,
  },
};

export {
  timeSchema,
  percentSchema,
  settingsSchema,
  exportPresetsSchema,
  dailyExportSchema,
  automaticExportSchema,
  batterySchema,
  themeSchema,
  notificationsSchema,
  defaultSettings,
  defaultExportPresets,
  defaultAutomaticExport,
};
