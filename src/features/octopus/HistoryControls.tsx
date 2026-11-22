import SectionHeading from "./SectionHeading";
import type { HistoryControlsProps, HistoryDays } from "../../types/Octopus";

const HISTORY_DAYS: HistoryDays[] = [7, 30, 365];

// The History heading: an on/off switch, and while it's on, how many days back
// to show.
const HistoryControls = ({
  label,
  showHistory,
  onToggle,
  days,
  onDaysChange,
}: HistoryControlsProps) => (
  <div
    className={`flex items-center justify-between gap-3 ${showHistory ? "mb-3" : ""}`}
  >
    <div className="flex items-center gap-3">
      <SectionHeading>History</SectionHeading>
      <button
        role="switch"
        aria-checked={showHistory}
        aria-label={label}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          showHistory ? "bg-emerald-600" : "bg-gray-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            showHistory ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
    {showHistory && (
      <div className="flex gap-1 p-1 rounded-xl bg-gray-800">
        {HISTORY_DAYS.map((d) => (
          <button
            key={d}
            onClick={() => {
              onDaysChange(d);
            }}
            aria-pressed={days === d}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              days === d
                ? "bg-gray-600 text-strong"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {d} days
          </button>
        ))}
      </div>
    )}
  </div>
);

export default HistoryControls;
