import type { ExportUntilInput, ExportUntilPlan } from "../types/Growatt";
import { toUkMinutes } from "./chargePlan";

// Export until battery %: works out one export slot, from now until the
// battery reaches the chosen stop level, so the inverter doesn't sit in Grid
// First with an empty battery and import for the rest of a slot. Shared, so it
// stays free of browser-only and React code.
//
// It aims MARGIN % above the stop level and rounds down, so it ends a little
// early rather than late: the battery details are estimates, the power doesn't
// follow the rate exactly, and Growatt's battery % is whole and can be up to 5
// minutes old.

const MARGIN = 2;
// A slot can't cross midnight, and Growatt clears export times at 23:30.
const LAST_END = 23 * 60 + 29;

const pad = (n: number) => String(n).padStart(2, "0");
const toTime = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

// How many whole minutes it takes to export down to MARGIN % above stopSOC.
const exportMinutes = ({
  soc,
  powerRate,
  stopSOC,
  batteryKwh,
  maxDischargeKw,
}: ExportUntilInput) => {
  const energyKwh = ((soc - (stopSOC + MARGIN)) / 100) * batteryKwh;
  const powerKw = (powerRate / 100) * maxDischargeKw;
  return Math.floor((energyKwh / powerKw) * 60);
};

const planExportUntil = (
  input: ExportUntilInput,
  now = new Date(),
): ExportUntilPlan => {
  const { soc } = input;
  const minutes = exportMinutes(input);
  if (!(minutes >= 1)) return { kind: "already", soc };
  const start = toUkMinutes(now);
  const end = Math.min(start + minutes, LAST_END);
  if (end <= start) return { kind: "tooLate", soc };
  return {
    kind: "export",
    soc,
    start: toTime(start),
    end: toTime(end),
    minutes: end - start,
    capped: end < start + minutes,
  };
};

// The same export, but timed to end the minute before `before` (later today,
// UK): it starts as late as it can, or now if there isn't enough time left
// (capped).
const planExportBefore = (
  input: ExportUntilInput,
  before: Date,
  now = new Date(),
): ExportUntilPlan => {
  const { soc } = input;
  const minutes = exportMinutes(input);
  if (!(minutes >= 1)) return { kind: "already", soc };
  const nowMinutes = toUkMinutes(now);
  const end = Math.min(toUkMinutes(before) - 1, LAST_END);
  if (end <= nowMinutes) return { kind: "tooLate", soc };
  const start = Math.max(nowMinutes, end - minutes);
  return {
    kind: "export",
    soc,
    start: toTime(start),
    end: toTime(end),
    minutes: end - start,
    capped: end - start < minutes,
  };
};

export { MARGIN, exportMinutes, planExportUntil, planExportBefore };
