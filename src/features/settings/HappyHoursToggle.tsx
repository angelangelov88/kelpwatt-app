import type { HappyHoursToggleProps } from "../../types/Settings";

// A switch in the happy hours form. It only changes the form; Save sends it.
const HappyHoursToggle = ({
  id,
  label,
  hint,
  isOn,
  isDisabled,
  onChange,
}: HappyHoursToggleProps) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex flex-col gap-1">
      <span id={`${id}-label`} className="text-sm text-gray-200">
        {label}
      </span>
      <span id={`${id}-hint`} className="text-sm text-gray-400">
        {hint}
      </span>
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-hint`}
      disabled={isDisabled}
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

export default HappyHoursToggle;
