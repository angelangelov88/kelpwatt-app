import type { NotificationsSwitchProps } from "../../types/Notifications";

// Turns notifications on or off for this device only.
const NotificationsSwitch = ({
  state,
  isPending,
  onChange,
}: NotificationsSwitchProps) => {
  const isOn = state === "on";
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span id="notifications-label" className="text-sm text-gray-200">
          Notifications on this device
        </span>
        <span id="notifications-hint" className="text-sm text-gray-400">
          Turn this on on each phone or computer you want them on. Logging out
          turns it off.
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-labelledby="notifications-label"
        aria-describedby="notifications-hint"
        disabled={isPending || state === "loading"}
        onClick={() => {
          onChange(!isOn);
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:opacity-40 disabled:cursor-not-allowed ${
          isOn ? "bg-violet-600" : "bg-gray-700"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            isOn ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
};

export default NotificationsSwitch;
