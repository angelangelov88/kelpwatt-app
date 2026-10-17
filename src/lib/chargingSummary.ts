import { toUkMinutes } from "./chargePlan";
import type { NightPlan, Span } from "../types/Octopus";

// Works out when the battery was set to charge last night, for the morning
// summary. Octopus often moves a car's slots several times a night, and
// automatic charging follows, so the slots it added aren't the ones that ran:
// some are removed before they start, and some are for later in the day.
// Instead, between one change and the next the inverter had that plan, so
// each plan's slots count only for the time it was on the inverter.
//
// Times are minutes from 18:00 UK (18:00 is 0, 07:00 is 780), so a night
// sorts in order across midnight.

const DAY = 24 * 60;
const EVENING = 18 * 60;

// Bits shorter than this are left out: where an Octopus slot meets the user's
// window, the plan can have a minute either side that isn't worth showing.
const MIN_PIECE = 5;

const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

const fromEvening = (minutes: number) => (minutes - EVENING + DAY) % DAY;

const toClock = (minutes: number) => {
  const m = (minutes + EVENING) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// "05:00-06:30" → its time in the night. A slot is the same every day, so one
// that crosses 18:00 is in the night twice: its start and its end.
const toSpans = (slot: string): Span[] => {
  const start = fromEvening(toMinutes(slot.slice(0, 5)));
  const end = fromEvening(toMinutes(slot.slice(6, 11)));
  return end > start
    ? [{ start, end }]
    : [
        { start: 0, end },
        { start, end: DAY },
      ];
};

const list = (slots: string) =>
  slots
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d\d:\d\d-\d\d:\d\d$/.test(s) && s !== "00:00-00:00");

const mergeSpans = (spans: Span[]) => {
  const merged: Span[] = [];
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    const last = merged.length > 0 ? merged[merged.length - 1] : null;
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }
  return merged;
};

const subtract = (spans: Span[], cut: Span) =>
  spans.flatMap((s) =>
    [
      { start: s.start, end: Math.min(s.end, cut.start) },
      { start: Math.max(s.start, cut.end), end: s.end },
    ].filter((p) => p.end > p.start),
  );

// The charge times that ran from 18:00 until now, outside the user's window,
// e.g. "22:10-22:30, 05:00-06:30" ("" for none). plans: oldest first.
const slotsThatRan = (
  plans: NightPlan[],
  window: string | null,
  now = new Date(),
) => {
  const until = fromEvening(toUkMinutes(now));
  const ran = plans.flatMap((plan, i) => {
    const from = plan.beforeNight ? 0 : fromEvening(toUkMinutes(plan.at));
    const next = i + 1 < plans.length ? plans[i + 1] : null;
    const to = next ? fromEvening(toUkMinutes(next.at)) : until;
    return list(plan.slots)
      .flatMap(toSpans)
      .map((s) => ({
        start: Math.max(s.start, from),
        end: Math.min(s.end, to),
      }))
      .filter((s) => s.end > s.start);
  });
  const outside = (window ? toSpans(window) : []).reduce(
    subtract,
    mergeSpans(ran),
  );
  return outside
    .filter((s) => s.end - s.start >= MIN_PIECE)
    .map((s) => `${toClock(s.start)}-${toClock(s.end)}`)
    .join(", ");
};

export { slotsThatRan };
