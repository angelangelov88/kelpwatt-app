import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { MIN_EXPORT_MIN, RETRY_WINDOW_MIN } from "../../lib/automaticExport";
import { GROWATT_RESET } from "../../lib/dailyExport";
import { fieldErrors } from "../../lib/fieldErrors";
import { automaticExportSchema } from "../../lib/settingsSchema";
import type { AutomaticExport, Settings } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type { AutomaticExportFormProps } from "../../types/Settings";
import {
  HOURS,
  RATE_OPTIONS,
  SOC_OPTIONS,
  minuteOptions,
  selectClass,
  withCurrent,
} from "../growatt/slotOptions";
import { SETTINGS_KEY } from "./useSettings";

const SELECT = `${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`;

// Automatic export's time and levels. Starts from what's saved; edits stay
// here until Save. On or off is the switch's.
const AutomaticExportForm = ({ saved }: AutomaticExportFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const current = saved.automaticExport;
  const [hour, setHour] = useState(current.at.slice(0, 2));
  const [minute, setMinute] = useState(current.at.slice(3, 5));
  const [powerRate, setPowerRate] = useState(String(current.powerRate));
  const [stopSOC, setStopSOC] = useState(String(current.stopSOC));
  const [minSOC, setMinSOC] = useState(String(current.minSOC));
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: (body: AutomaticExport) =>
      apiRequest<Settings>("settings?part=automatic", { method: "PUT", body }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      showToast("Automatic export saved", "success");
    },
  });

  const isChanged =
    `${hour}:${minute}` !== current.at ||
    powerRate !== String(current.powerRate) ||
    stopSOC !== String(current.stopSOC) ||
    minSOC !== String(current.minSOC);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = automaticExportSchema.safeParse({
      // Changed only by the switch.
      enabled: current.enabled,
      at: `${hour}:${minute}`,
      powerRate: Number(powerRate),
      stopSOC: Number(stopSOC),
      minSOC: Number(minSOC),
    });
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

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 max-w-sm"
    >
      {save.error && <FormAlert message={save.error.message} />}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm text-gray-300 mb-1.5">Start at</legend>
        <div className="grid grid-cols-2 gap-4">
          <select
            aria-label="Start hour"
            value={hour}
            onChange={(e) => {
              setHour(e.target.value);
            }}
            disabled={save.isPending}
            aria-invalid={errors.at ? true : undefined}
            aria-describedby={errors.at ? "automatic-at-error" : undefined}
            className={SELECT}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <select
            aria-label="Start minute"
            value={minute}
            onChange={(e) => {
              setMinute(e.target.value);
            }}
            disabled={save.isPending}
            aria-invalid={errors.at ? true : undefined}
            aria-describedby={errors.at ? "automatic-at-error" : undefined}
            className={SELECT}
          >
            {minuteOptions(minute).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        {errors.at && (
          <p id="automatic-at-error" className="text-xs text-red-400">
            {errors.at}
          </p>
        )}
      </fieldset>
      <p className="-mt-2 text-xs text-gray-500">
        UK time, every evening. It starts within 5 minutes of this; if Octopus
        or Growatt doesn&apos;t respond, it tries again for {RETRY_WINDOW_MIN}{" "}
        minutes.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {renderSelect(
          "automatic-power-rate",
          "Discharge rate",
          powerRate,
          setPowerRate,
          withCurrent(RATE_OPTIONS, powerRate),
          errors.powerRate,
        )}
        {renderSelect(
          "automatic-stop-soc",
          "Stop at battery",
          stopSOC,
          setStopSOC,
          withCurrent(SOC_OPTIONS, stopSOC),
          errors.stopSOC,
        )}
      </div>
      {renderSelect(
        "automatic-min-soc",
        "Only run if battery is at least",
        minSOC,
        setMinSOC,
        withCurrent(SOC_OPTIONS, minSOC),
        errors.minSOC,
      )}
      <p className="-mt-2 text-xs text-gray-500">
        Skipped if the battery is below your minimum, or if the export would
        last less than {MIN_EXPORT_MIN} minutes. It replaces your export times
        until Growatt clears them at {GROWATT_RESET}.
      </p>
      {isChanged && (
        <SubmitButton
          label="Save automatic export"
          pendingLabel="Saving…"
          isPending={save.isPending}
        />
      )}
    </form>
  );
};

export default AutomaticExportForm;
