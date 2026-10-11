import type { AutomaticExportStatus } from "../types/Growatt";
import type { Dispatch } from "../types/Octopus";
import { toUkMinutes } from "./chargePlan";

// Automatic export: Export until battery % every evening, at a time the user
// picks. The 5-minute check starts it, so it runs within about 5 minutes of
// that time. Shared, so it stays free of browser-only and React code.

// How long after the chosen time a check still tries to start it (when
// Octopus or Growatt didn't respond), and then how long a failure is still
// logged for.
const RETRY_WINDOW_MIN = 30;
// The shortest export worth starting, in minutes.
const MIN_EXPORT_MIN = 5;
// The latest time it can start: Growatt clears export times at 23:30, and the
// retries need room before then.
const LATEST_START = "23:00";

const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// due: within RETRY_WINDOW_MIN of the time, so a check tries to start it.
// late: in the RETRY_WINDOW_MIN after that, when a failure that kept it from
// starting is logged. wait: any other time. at is no later than LATEST_START,
// so neither runs past midnight.
const automaticExportStatus = (
  at: string,
  now = new Date(),
): AutomaticExportStatus => {
  const elapsed = toUkMinutes(now) - toMinutes(at);
  if (elapsed < 0 || elapsed >= 2 * RETRY_WINDOW_MIN) return "wait";
  return elapsed < RETRY_WINDOW_MIN ? "due" : "late";
};

// True when the time has come today (UK), so saving it now shouldn't start it
// until tomorrow.
const hasPassed = (at: string, now = new Date()) =>
  toUkMinutes(now) >= toMinutes(at);

// Intelligent Octopus only plans charging while the car is plugged in, so a
// slot that hasn't ended yet means it is.
const isCarPluggedIn = (dispatches: Dispatch[], now = new Date()) =>
  dispatches.some((d) => new Date(d.endDt).getTime() > now.getTime());

export {
  RETRY_WINDOW_MIN,
  MIN_EXPORT_MIN,
  LATEST_START,
  automaticExportStatus,
  hasPassed,
  isCarPluggedIn,
};
