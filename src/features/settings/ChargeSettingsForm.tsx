import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import TextField from "../../components/TextField";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { fieldErrors } from "../../lib/fieldErrors";
import { settingsSchema } from "../../lib/settingsSchema";
import type { ChargeSettings, Settings } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type { ChargeSettingsFormProps } from "../../types/Settings";
import {
  RATE_OPTIONS,
  SOC_OPTIONS,
  selectClass,
  withCurrent,
} from "../growatt/slotOptions";
import { SETTINGS_KEY } from "./useSettings";

const SELECT = `${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`;

// The fixed overnight charge window (optional), and how the inverter charges
// from the grid. Starts from what's saved; edits stay here until Save.
const ChargeSettingsForm = ({ saved, hasOctopus }: ChargeSettingsFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [windowEnabled, setWindowEnabled] = useState(saved.windowEnabled);
  const [chargeStart, setChargeStart] = useState(saved.chargeStart);
  const [chargeEnd, setChargeEnd] = useState(saved.chargeEnd);
  const [powerRate, setPowerRate] = useState(String(saved.powerRate));
  const [stopSOC, setStopSOC] = useState(String(saved.stopSOC));
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: (body: ChargeSettings) =>
      apiRequest<Settings>("settings", { method: "PUT", body }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      showToast("Battery charging settings saved", "success");
    },
  });

  const isChanged =
    windowEnabled !== saved.windowEnabled ||
    chargeStart !== saved.chargeStart ||
    chargeEnd !== saved.chargeEnd ||
    powerRate !== String(saved.powerRate) ||
    stopSOC !== String(saved.stopSOC);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = settingsSchema.safeParse({
      windowEnabled,
      chargeStart,
      chargeEnd,
      powerRate: Number(powerRate),
      stopSOC: Number(stopSOC),
      // Changed only by the switch.
      automationEnabled: saved.automationEnabled,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  // The same 5% dropdowns as the dashboard's Charge battery card.
  const renderSelect = (
    id: string,
    label: string,
    value: string,
    setValue: (value: string) => void,
    options: string[],
    error: string | undefined,
  ) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-gray-300">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        disabled={save.isPending}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={SELECT}
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {v}%
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 max-w-sm"
    >
      {save.error && <FormAlert message={save.error.message} />}
      <div className="flex items-start gap-3">
        <input
          id="window-enabled"
          type="checkbox"
          checked={windowEnabled}
          onChange={(e) => {
            setWindowEnabled(e.target.checked);
          }}
          disabled={save.isPending}
          aria-describedby="window-enabled-hint"
          className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="window-enabled" className="text-sm text-gray-200">
            Charge in my own window
          </label>
          <span id="window-enabled-hint" className="text-xs text-gray-500">
            {hasOctopus
              ? windowEnabled
                ? "Charges every night between these times, plus your Octopus slots. Octopus slots inside the window are left out, and ones partly inside are cut to the part outside."
                : "Only your Octopus slots are used, up to 6 of them. With none planned, the inverter doesn't charge from the grid."
              : windowEnabled
                ? "Apply my settings on the dashboard fills in these times."
                : "Apply my settings on the dashboard keeps the times on your inverter and only sets the power and stop level."}
          </span>
        </div>
      </div>
      {windowEnabled && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="charge-start"
              label="Charge from"
              type="time"
              value={chargeStart}
              onChange={(e) => {
                setChargeStart(e.target.value);
              }}
              error={errors.chargeStart}
              disabled={save.isPending}
              required
            />
            <TextField
              id="charge-end"
              label="Until"
              type="time"
              value={chargeEnd}
              onChange={(e) => {
                setChargeEnd(e.target.value);
              }}
              error={errors.chargeEnd}
              disabled={save.isPending}
              required
            />
          </div>
          <p className="-mt-2 text-xs text-gray-500">
            UK time, every night. Recommended: 23:30–05:30, Octopus&apos;s cheap
            overnight rate.
          </p>
        </>
      )}
      <div className="grid grid-cols-2 gap-4">
        {renderSelect(
          "power-rate",
          "Charge power",
          powerRate,
          setPowerRate,
          withCurrent(RATE_OPTIONS, powerRate),
          errors.powerRate,
        )}
        {renderSelect(
          "stop-soc",
          "Stop at battery",
          stopSOC,
          setStopSOC,
          withCurrent(SOC_OPTIONS, stopSOC),
          errors.stopSOC,
        )}
      </div>
      <p className="-mt-2 text-xs text-gray-500">
        How much of the inverter&apos;s power to charge from the grid with, and
        the battery level to stop at.
        {hasOctopus && " Used for the Octopus slots too."}
      </p>
      {isChanged && (
        <SubmitButton
          label="Save battery charging settings"
          pendingLabel="Saving…"
          isPending={save.isPending}
        />
      )}
    </form>
  );
};

export default ChargeSettingsForm;
