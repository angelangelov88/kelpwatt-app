import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { MIN_EXPORT_MIN } from "../../lib/automaticExport";
import { fieldErrors } from "../../lib/fieldErrors";
import { CHARGE_LEAD_MIN, exportTarget } from "../../lib/happyHourAutomation";
import { happyHoursSchema } from "../../lib/settingsSchema";
import type { HappyHourSettings, Settings } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type { HappyHoursFormProps } from "../../types/Settings";
import {
  RATE_OPTIONS,
  SOC_OPTIONS,
  selectClass,
  withCurrent,
} from "../growatt/slotOptions";
import HappyHoursToggle from "./HappyHoursToggle";
import { SETTINGS_KEY } from "./useSettings";

const SELECT = `${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`;
// For the example under the export levels.
const ONE_HOUR = { start: new Date(0), end: new Date(3_600_000) };

// Charging during, and exporting before, booked happy hours. Starts from
// what's saved; the switches and levels stay here until Save.
const HappyHoursForm = ({ saved, hasBattery }: HappyHoursFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const current = saved.happyHours;
  const [chargeOn, setChargeOn] = useState(current.chargeEnabled);
  const [chargePower, setChargePower] = useState(
    String(current.chargePowerRate),
  );
  const [chargeStop, setChargeStop] = useState(String(current.chargeStopSOC));
  const [exportOn, setExportOn] = useState(current.exportEnabled);
  const [exportPower, setExportPower] = useState(
    String(current.exportPowerRate),
  );
  const [exportStop, setExportStop] = useState(String(current.exportStopSOC));
  const [exportMin, setExportMin] = useState(String(current.exportMinSOC));
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: (body: HappyHourSettings) =>
      apiRequest<Settings>("settings?part=happy", { method: "PUT", body }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      showToast("Happy hour settings saved", "success");
    },
  });

  const draft: HappyHourSettings = {
    chargeEnabled: chargeOn,
    chargePowerRate: Number(chargePower),
    chargeStopSOC: Number(chargeStop),
    exportEnabled: exportOn,
    exportPowerRate: Number(exportPower),
    exportStopSOC: Number(exportStop),
    exportMinSOC: Number(exportMin),
  };
  const isChanged = (Object.keys(draft) as (keyof HappyHourSettings)[]).some(
    (key) => draft[key] !== current[key],
  );

  // How far a 1-hour happy hour would export down to, with these levels.
  const example =
    hasBattery && saved.batteryKwh !== null && saved.maxDischargeKw !== null
      ? exportTarget(
          {
            ...draft,
            batteryKwh: saved.batteryKwh,
            maxDischargeKw: saved.maxDischargeKw,
          },
          ONE_HOUR,
        )
      : null;

  const handleChargeChange = (isOn: boolean) => {
    setChargeOn(isOn);
    // The export only makes sense if the happy hour charges it back.
    if (!isOn) setExportOn(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = happyHoursSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  // The same 5% dropdowns as the dashboard's Export until battery % card.
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

  const exportHint = !chargeOn
    ? "Turn on charging during happy hours to use this."
    : !hasBattery
      ? "Add your battery details under Your battery below to use this."
      : "Exports just enough before each one for it to charge back, ending the minute it starts. It won't run while your car is plugged in.";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-6 max-w-sm"
    >
      {save.error && <FormAlert message={save.error.message} />}
      <div className="flex flex-col gap-4">
        <HappyHoursToggle
          id="happy-charge"
          label="Charge during happy hours"
          hint={`Adds each booked happy hour to your charge times ${String(CHARGE_LEAD_MIN)} minutes before it starts, and takes it off when it ends.`}
          isOn={chargeOn}
          isDisabled={save.isPending}
          onChange={handleChargeChange}
        />
        {chargeOn && (
          <div className="grid grid-cols-2 gap-4">
            {renderSelect(
              "happy-charge-power",
              "Charge rate",
              chargePower,
              setChargePower,
              withCurrent(RATE_OPTIONS, chargePower),
              errors.chargePowerRate,
            )}
            {renderSelect(
              "happy-charge-stop",
              "Charge up to",
              chargeStop,
              setChargeStop,
              withCurrent(SOC_OPTIONS, chargeStop),
              errors.chargeStopSOC,
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <HappyHoursToggle
          id="happy-export"
          label="Export before happy hours"
          hint={exportHint}
          isOn={exportOn}
          isDisabled={save.isPending || !chargeOn || (!hasBattery && !exportOn)}
          onChange={setExportOn}
        />
        {errors.exportEnabled && (
          <p className="-mt-2 text-xs text-red-400">{errors.exportEnabled}</p>
        )}
        {exportOn && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {renderSelect(
                "happy-export-power",
                "Discharge rate",
                exportPower,
                setExportPower,
                withCurrent(RATE_OPTIONS, exportPower),
                errors.exportPowerRate,
              )}
              {renderSelect(
                "happy-export-stop",
                "Never below",
                exportStop,
                setExportStop,
                withCurrent(SOC_OPTIONS, exportStop),
                errors.exportStopSOC,
              )}
            </div>
            {renderSelect(
              "happy-export-min",
              "Only run if battery is at least",
              exportMin,
              setExportMin,
              withCurrent(SOC_OPTIONS, exportMin),
              errors.exportMinSOC,
            )}
            <p className="-mt-2 text-xs text-gray-500">
              {example !== null &&
                `For a 1-hour happy hour, it would export down to about ${String(example)}%. `}
              Skipped if the battery is below your minimum, or if the export
              would last less than {MIN_EXPORT_MIN} minutes. Your own export
              times come back once it ends, apart from any during the happy
              hour. If the happy hour is cancelled or moved, the export stops
              within 5 minutes; if only part of it is, the export stops at a
              higher level to match.
            </p>
          </>
        )}
      </div>
      {isChanged && (
        <SubmitButton
          label="Save happy hour settings"
          pendingLabel="Saving…"
          isPending={save.isPending}
        />
      )}
    </form>
  );
};

export default HappyHoursForm;
