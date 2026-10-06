import type { ChargePeriods, SlotParam } from "../types/Growatt";
import type {
  ChargePlan,
  ChargeSettings,
  Dispatch,
  Piece,
  Slots,
} from "../types/Octopus";

// Decides what charge periods to write to the inverter from Octopus dispatches.
// Shared by the "Apply Slots to Growatt" button and the scheduled job on the
// server, so it must stay free of browser-only and React code.
//
// Rules, from the user's settings:
// - Their charge power and stop-at-battery level.
// - If they use their own overnight window (23:30–05:30 by default), it's slot
//   1. It may cross midnight, e.g. 23:30–05:30.
// - Octopus periods are trimmed to the parts outside that window (dropped entirely if
//   inside it, split in two if they span it), then touching or overlapping ones merged.
// - The inverter has 6 slots, so at most 5 Octopus periods are kept (6 without
//   a window), soonest first. Without a window or periods, every slot is off.
// - All times are UK local time, whatever time zone the machine is in.

const MAX_SLOTS = 6;
const DAY = 24 * 60;

// "HH:MM" → minutes past midnight.
const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

const ukTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const toUkMinutes = (date: Date) => {
  const parts = ukTime.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return get("hour") * 60 + get("minute");
};

const pad = (n: number) => String(n).padStart(2, "0");

// `end` may run past midnight (above DAY) for a period that crosses it.
const toSlot = (start: number, end: number): SlotParam => ({
  startHour: pad(Math.floor(start / 60)),
  startMin: pad(start % 60),
  endHour: pad(Math.floor((end % DAY) / 60)),
  endMin: pad(end % 60),
});

// A dispatch crossing midnight becomes two same-day pieces.
const toPieces = (dispatch: Dispatch): Piece[] => {
  const start = toUkMinutes(new Date(dispatch.startDt));
  let end = toUkMinutes(new Date(dispatch.endDt));
  if (end <= start) end += DAY;
  const firstStart = new Date(dispatch.startDt).getTime();
  if (end <= DAY) return [{ start, end, firstStart }];
  return [
    { start, end: DAY, firstStart },
    { start: 0, end: end - DAY, firstStart },
  ];
};

// Keeps only what falls outside the overnight window. A window crossing
// midnight covers the start and end of the day, so outside is between its end
// and its start.
const outsideWindow =
  (windowStart: number, windowEnd: number) =>
  (piece: Piece): Piece[] =>
    (windowStart < windowEnd
      ? [
          { ...piece, end: Math.min(piece.end, windowStart) },
          { ...piece, start: Math.max(piece.start, windowEnd) },
        ]
      : [
          {
            ...piece,
            start: Math.max(piece.start, windowEnd),
            end: Math.min(piece.end, windowStart),
          },
        ]
    ).filter((p) => p.end > p.start);

const merge = (pieces: Piece[]): Piece[] => {
  const merged: Piece[] = [];
  for (const piece of [...pieces].sort((a, b) => a.start - b.start)) {
    const last = merged.length > 0 ? merged[merged.length - 1] : null;
    if (last && piece.start <= last.end) {
      last.end = Math.max(last.end, piece.end);
      last.firstStart = Math.min(last.firstStart, piece.firstStart);
    } else {
      merged.push({ ...piece });
    }
  }
  // Rejoin a period split at midnight into a single slot that crosses it.
  const first = merged[0];
  const last = merged[merged.length - 1];
  if (merged.length > 1 && first.start === 0 && last.end === DAY) {
    merged.shift();
    last.end = DAY + first.end;
    last.firstStart = Math.min(last.firstStart, first.firstStart);
  }
  return merged;
};

const buildChargePlan = (
  dispatches: Dispatch[],
  settings: ChargeSettings,
  now = new Date(),
): ChargePlan => {
  const windowStart = toMinutes(settings.chargeStart);
  const windowEnd = toMinutes(settings.chargeEnd);
  const upcoming = dispatches.filter((d) => {
    const start = new Date(d.startDt);
    const end = new Date(d.endDt);
    return end > now && end > start;
  });
  const pieces = upcoming.flatMap(toPieces);
  const periods = merge(
    settings.windowEnabled
      ? pieces.flatMap(outsideWindow(windowStart, windowEnd))
      : pieces,
  ).sort((a, b) => a.firstStart - b.firstStart);
  const kept = periods.slice(
    0,
    settings.windowEnabled ? MAX_SLOTS - 1 : MAX_SLOTS,
  );
  const slots: SlotParam[] = [
    ...(settings.windowEnabled ? [toSlot(windowStart, windowEnd)] : []),
    ...kept.map((p) => toSlot(p.start, p.end)),
  ];
  while (slots.length < MAX_SLOTS) slots.push(null);
  return {
    powerRate: String(settings.powerRate),
    stopSOC: String(settings.stopSOC),
    slots: slots as Slots,
    skipped: periods.length - kept.length,
  };
};

// How much of an Octopus slot the user's own window already covers: "all"
// (left out of the plan), "part" (trimmed to the rest) or "none".
const windowCover = (
  dispatch: Dispatch,
  settings: ChargeSettings,
): "all" | "part" | "none" => {
  if (!settings.windowEnabled) return "none";
  const length = (pieces: Piece[]) =>
    pieces.reduce((sum, p) => sum + p.end - p.start, 0);
  const pieces = toPieces(dispatch);
  const outside = pieces.flatMap(
    outsideWindow(
      toMinutes(settings.chargeStart),
      toMinutes(settings.chargeEnd),
    ),
  );
  if (length(outside) === length(pieces)) return "none";
  return length(outside) === 0 ? "all" : "part";
};

const formatSlot = (s: NonNullable<SlotParam>) =>
  `${s.startHour}:${s.startMin}-${s.endHour}:${s.endMin}`;

// e.g. "01:00-05:00, 18:00-19:00"
const describePlan = (plan: ChargePlan) =>
  plan.slots
    .filter((s): s is NonNullable<SlotParam> => s !== null)
    .map(formatSlot)
    .join(", ");

// The inverter's enabled slots, as describePlan writes them.
const describePeriods = (current: ChargePeriods) =>
  [
    current.period1,
    current.period2,
    current.period3,
    current.period4,
    current.period5,
    current.period6,
  ]
    .filter((p) => p.enabled && p.start !== "--")
    .map((p) => `${p.start}-${p.end}`)
    .join(", ");

// True when the inverter already has exactly this plan, so there's nothing to write.
const planMatches = (plan: ChargePlan, current: ChargePeriods) =>
  String(current.powerRate) === plan.powerRate &&
  String(current.stopSOC) === plan.stopSOC &&
  describePlan(plan) === describePeriods(current);

// A removed slot whose end passed this recently was dropped for being over,
// not cancelled by Octopus.
const ENDED_WITHIN_MINUTES = 60;

// What writing a plan changes on the inverter, from describePeriods (before)
// and describePlan (after), for the activity log. Each is a describePlan-style
// list, "" when empty. ended: removed slots that had just finished.
const diffPlan = (before: string, after: string, now = new Date()) => {
  const list = (slots: string) => slots.split(", ").filter((s) => s !== "");
  const was = list(before);
  const is = list(after);
  const nowMinutes = toUkMinutes(now);
  const hasEnded = (slot: string) =>
    (nowMinutes - toMinutes(slot.slice(6)) + DAY) % DAY < ENDED_WITHIN_MINUTES;
  const removed = was.filter((s) => !is.includes(s));
  return {
    added: is.filter((s) => !was.includes(s)).join(", "),
    ended: removed.filter(hasEnded).join(", "),
    removed: removed.filter((s) => !hasEnded(s)).join(", "),
  };
};

export {
  toUkMinutes,
  buildChargePlan,
  describePlan,
  describePeriods,
  diffPlan,
  planMatches,
  windowCover,
};
