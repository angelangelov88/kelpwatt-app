import type {
  Dispatch,
  HappyBlock,
  HappyExportInput,
  HappyExportStatus,
} from "../types/Octopus";
import { MIN_EXPORT_MIN } from "./automaticExport";
import { toUkClock, toUkMinutes } from "./chargePlan";
import { ukDay } from "./dailyExport";
import { exportMinutes } from "./exportUntil";

// Settings → Happy hours, run by the 5-minute check. Shared, so it stays free
// of browser-only and React code.
//
// Charging: each booked happy hour's times are added to the charge plan, with
// its own power and stop level. Growatt's charge times repeat every day, so
// they only go on CHARGE_LEAD_MIN before it starts, and come off when it ends.
//
// Export: before a happy hour, the battery is exported down to what the happy
// hour can charge back, ending the minute before it starts. Growatt's
// discharge times repeat every day too, so it's a one-off slot, set on the
// day.

// How long before a happy hour its times go on the inverter.
const CHARGE_LEAD_MIN = 30;
// How long before the longest export could need to start the battery is
// first read, so a check (every 5 minutes) has a few tries.
const READ_AHEAD_MIN = 15;
// The share of a happy hour's charging counted on to refill the battery: the
// battery details are estimates and charging slows near full.
const REFILL_SHARE = 0.9;
// Growatt clears export times at 23:30 and a slot can't cross midnight.
const LAST_END = 23 * 60 + 29;

// Booked happy hours that haven't ended, soonest first, with ones that touch
// or overlap joined.
const happyHourBlocks = (
  bookings: { startAt: Date; endAt: Date }[],
  now = new Date(),
): HappyBlock[] => {
  const blocks: HappyBlock[] = [];
  const upcoming = bookings
    .filter((b) => b.endAt > now && b.endAt > b.startAt)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  for (const b of upcoming) {
    const last = blocks.length > 0 ? blocks[blocks.length - 1] : null;
    if (last && b.startAt <= last.end) {
      if (b.endAt > last.end) last.end = b.endAt;
    } else {
      blocks.push({ start: b.startAt, end: b.endAt });
    }
  }
  return blocks;
};

// The blocks to charge in now: from CHARGE_LEAD_MIN before each starts until
// it ends, as charge plan periods.
const blocksToCharge = (blocks: HappyBlock[], now = new Date()): Dispatch[] =>
  blocks
    .filter(
      (b) => b.start.getTime() - CHARGE_LEAD_MIN * 60_000 <= now.getTime(),
    )
    .map((b) => ({
      startDt: b.start.toISOString(),
      endDt: b.end.toISOString(),
    }));

// e.g. "13:00-15:00, 16:00-17:00", for the activity log.
const describeBlocks = (charge: Dispatch[]) =>
  charge
    .map(
      (d) =>
        `${toUkClock(new Date(d.startDt))}-${toUkClock(new Date(d.endDt))}`,
    )
    .join(", ");

// The battery level to export down to before a block: what charging at the
// happy hour's power for its whole length can bring back up to its stop
// level, never below the export stop level. Charging is taken to be as fast
// as the battery's maximum discharge.
const exportTarget = (input: HappyExportInput, block: HappyBlock) => {
  const hours = (block.end.getTime() - block.start.getTime()) / 3_600_000;
  const refillKwh =
    (input.chargePowerRate / 100) * input.maxDischargeKw * hours * REFILL_SHARE;
  const refillPercent = (refillKwh / input.batteryKwh) * 100;
  return Math.max(
    input.exportStopSOC,
    Math.ceil(input.chargeStopSOC - refillPercent),
  );
};

// When the export before a block should start. It's on the block's own UK
// day, before it starts, from READ_AHEAD_MIN before the longest export it
// could need (from a full battery), until the time left is under
// MIN_EXPORT_MIN.
const happyExportStatus = (
  block: HappyBlock,
  input: HappyExportInput,
  now = new Date(),
): HappyExportStatus => {
  if (now >= block.start || ukDay(now) !== ukDay(block.start)) return "wait";
  const end = Math.min(toUkMinutes(block.start) - 1, LAST_END);
  const left = end - toUkMinutes(now);
  if (left < MIN_EXPORT_MIN) return "late";
  const longest = exportMinutes({
    soc: 100,
    powerRate: input.exportPowerRate,
    stopSOC: exportTarget(input, block),
    batteryKwh: input.batteryKwh,
    maxDischargeKw: input.maxDischargeKw,
  });
  return left > Math.max(longest, 0) + READ_AHEAD_MIN ? "wait" : "due";
};

// The user's export times (as describePeriods writes them) to put back once
// the export before a block ends: all but those during the block, which would
// export what it charges.
const slotsToRestore = (described: string, block: HappyBlock) => {
  const DAY = 24 * 60;
  const toMinutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const blockStart = toUkMinutes(block.start);
  let blockEnd = toUkMinutes(block.end);
  if (blockEnd <= blockStart) blockEnd += DAY;
  return described
    .split(", ")
    .filter(Boolean)
    .filter((slot) => {
      const [start, end] = slot.split("-").map(toMinutes);
      const slotEnd = end <= start ? end + DAY : end;
      return !(start < blockEnd && slotEnd > blockStart);
    })
    .join(", ");
};

export {
  CHARGE_LEAD_MIN,
  happyHourBlocks,
  blocksToCharge,
  describeBlocks,
  exportTarget,
  happyExportStatus,
  slotsToRestore,
};
