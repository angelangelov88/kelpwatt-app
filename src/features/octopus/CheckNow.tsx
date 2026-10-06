import Spinner from "../../components/Spinner";
import type { CheckNowProps } from "../../types/Octopus";
import AutomationStatusLine from "./AutomationStatusLine";
import useAutomation from "./useAutomation";

// Shown instead of the Apply button while automatic charging is on: runs the
// scheduled check straight away (after plugging the car in, say).
const CheckNow = ({ onChecked }: CheckNowProps) => {
  const { status, checkNow, isChecking } = useAutomation({ onChecked });

  return (
    <div className="flex flex-col gap-3">
      <AutomationStatusLine status={status} />
      <button
        onClick={checkNow}
        disabled={isChecking}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isChecking && <Spinner className="text-white" />}
        {isChecking ? "Syncing… (up to 30s)" : "Sync now"}
      </button>
      <p className="text-xs text-gray-400">
        Gets your latest Octopus slots and updates your inverter&apos;s charge
        times if they&apos;ve changed, without waiting for the next 5-minute
        check.
      </p>
    </div>
  );
};

export default CheckNow;
