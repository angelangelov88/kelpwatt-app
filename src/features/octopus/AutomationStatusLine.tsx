import { Link } from "react-router";
import type { AutomationStatusLineProps } from "../../types/Octopus";

// "14:05" for today, "28 Sep 14:05" otherwise, in UK time.
const formatUkTime = (iso: string) => {
  const date = new Date(iso);
  const day = (d: Date) =>
    d.toLocaleDateString("en-GB", { timeZone: "Europe/London" });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
  if (day(date) === day(new Date())) return time;
  const dayMonth = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
  return `${dayMonth} ${time}`;
};

// What automatic charging last did, under the Sync now button.
const AutomationStatusLine = ({ status }: AutomationStatusLineProps) => {
  if (!status) return null;

  if (status.paused)
    return (
      <p role="status" className="text-xs text-amber-400">
        Paused: {status.error?.message ?? "a saved login was refused"}.{" "}
        <Link to="/settings" className="underline hover:text-amber-300">
          Open Settings
        </Link>
      </p>
    );

  if (!status.checkedAt)
    return (
      <p className="text-xs text-gray-400">
        Not checked yet. The first check runs within 5 minutes.
      </p>
    );

  return (
    <div className="flex flex-col gap-1 text-xs text-gray-400">
      <p>
        Last checked {formatUkTime(status.checkedAt)}. Checked again every 5
        minutes.
      </p>
      {status.error && (
        <p className="text-red-400">
          That check failed: {status.error.message}. It will try again at the
          next check.
        </p>
      )}
      {status.slots !== null && (
        <p>
          Inverter charge times (UK):{" "}
          <span className="font-mono text-gray-200">
            {status.slots || "none"}
          </span>
          {status.appliedAt &&
            `, last changed ${formatUkTime(status.appliedAt)}`}
        </p>
      )}
    </div>
  );
};

export default AutomationStatusLine;
