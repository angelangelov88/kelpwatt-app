import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { ExportUntilInput, ExportUntilPlan } from "../../types/Growatt";
import type { ExportUntilProps } from "../../types/GrowattForm";
import useToast from "../../contexts/useToast";
import HoverTip from "../../components/HoverTip";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import { RATE_OPTIONS, SOC_OPTIONS, selectClass } from "./slotOptions";
import useBatteryRead from "./useBatteryRead";
import useSettings from "../settings/useSettings";
import { GROWATT_RESET } from "../../lib/dailyExport";
import { MARGIN, planExportUntil } from "../../lib/exportUntil";

// A worked-out slot starts now, so it's only offered for this long.
const PREVIEW_MS = 5 * 60 * 1000;

type Preview = { input: ExportUntilInput; plan: ExportUntilPlan };

// 82 → "1 h 22 min", 58 → "58 min".
const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${String(rest)} min`;
  return rest === 0
    ? `${String(hours)} h`
    : `${String(hours)} h ${String(rest)} min`;
};

// "16:05" → the slot's start or end fields.
const splitTime = (time: string) => [time.slice(0, 2), time.slice(3, 5)];

// One export slot that ends when the battery reaches the chosen level, worked
// out from the battery % now and the battery details in Settings. The 5-minute
// check turns it off afterwards.
const ExportUntilCard = ({
  reader,
  setDischargeMutation,
}: ExportUntilProps) => {
  const { showToast } = useToast();
  const settings = useSettings().data;
  const batteryRead = useBatteryRead();
  const [powerRate, setPowerRate] = useState("95");
  const [stopSOC, setStopSOC] = useState("20");
  const [preview, setPreview] = useState<Preview | null>(null);

  // A new preview replaces the timer, so each one lasts PREVIEW_MS.
  useEffect(() => {
    if (!preview) return;
    const timer = setTimeout(() => {
      setPreview(null);
      if (preview.plan.kind === "export")
        showToast("The worked-out times ran out, work them out again", "info");
    }, PREVIEW_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [preview, showToast]);

  const batteryKwh = settings?.batteryKwh ?? null;
  const maxDischargeKw = settings?.maxDischargeKw ?? null;
  const hasBattery = batteryKwh !== null && maxDischargeKw !== null;
  const isEveryDay = settings?.exportEveryDay ?? false;
  const automatic = settings?.automaticExport;
  const isReading = batteryRead.isPending;
  const isApplying = setDischargeMutation.isPending;
  const isExportBusy = reader.isReading || isApplying;

  const workOut = () => {
    if (batteryKwh === null || maxDischargeKw === null) return;
    batteryRead.mutate(undefined, {
      onSuccess: ({ soc }) => {
        const input: ExportUntilInput = {
          soc,
          powerRate: Number(powerRate),
          stopSOC: Number(stopSOC),
          batteryKwh,
          maxDischargeKw,
        };
        setPreview({ input, plan: planExportUntil(input) });
      },
      onError: (error) => {
        showToast(`Couldn't read your battery: ${error.message}`, "error");
      },
    });
  };

  // Worked out again from the current time, so the slot still ends when the
  // battery gets there.
  const confirm = () => {
    if (!preview) return;
    const plan = planExportUntil(preview.input);
    if (plan.kind !== "export") {
      setPreview({ ...preview, plan });
      return;
    }
    const [startHour, startMin] = splitTime(plan.start);
    const [endHour, endMin] = splitTime(plan.end);
    setDischargeMutation.mutate(
      {
        powerRate: String(preview.input.powerRate),
        stopSOC: String(preview.input.stopSOC),
        slots: [{ startHour, startMin, endHour, endMin }],
        oneOff: true,
      },
      {
        onSuccess: () => {
          setPreview(null);
          showToast(
            `Export set until ${plan.end}. We'll turn it off when it ends.`,
            "success",
          );
          reader.verify();
        },
        onError: (error) => {
          showToast(`Couldn't set the export: ${error.message}`, "error");
        },
      },
    );
  };

  const workOutTip = !hasBattery
    ? "Add your battery size and max power in Settings first."
    : isExportBusy
      ? "Wait for the Export to grid card to finish."
      : null;

  const closeButton = (
    <button
      onClick={() => {
        setPreview(null);
      }}
      className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 transition-colors"
    >
      OK
    </button>
  );

  const renderPreview = ({ input, plan }: Preview) => {
    if (plan.kind === "already")
      return (
        <>
          <p className="text-sm text-gray-300">
            Your battery is at {plan.soc}%, already at or close to{" "}
            {input.stopSOC}%, so there&apos;s nothing to export.
          </p>
          {closeButton}
        </>
      );
    if (plan.kind === "tooLate")
      return (
        <>
          <p className="text-sm text-gray-300">
            It&apos;s too close to Growatt&apos;s {GROWATT_RESET} reset to start
            an export today.
          </p>
          {closeButton}
        </>
      );
    return (
      <>
        <p className="text-sm text-gray-300">
          Battery {plan.soc}% → {input.stopSOC}% at {input.powerRate}% discharge
          rate.
        </p>
        <p className="text-base font-semibold text-strong mt-1">
          Export {plan.start}–{plan.end}{" "}
          <span className="text-sm font-normal text-gray-400">
            ({formatDuration(plan.minutes)})
          </span>
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-400">
          {plan.capped && (
            <li>
              Cut short to end before Growatt&apos;s {GROWATT_RESET} reset.
            </li>
          )}
          <li>
            This removes your other export times for today, and turns export off
            when it ends.
          </li>
          {isEveryDay && (
            <li>
              Export every day puts your usual times back after {GROWATT_RESET}.
            </li>
          )}
        </ul>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => {
              setPreview(null);
            }}
            disabled={isApplying}
            className="py-2.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={isApplying || reader.isReading}
            className="py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isApplying ? "Setting…" : "Confirm"}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 sm:p-6">
      <div className="relative mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-strong">
            Export to grid until battery %
          </h2>
          <InfoTip label="Export until battery %">
            <p>
              A one-off export that starts now and ends when your battery
              reaches the level you pick, so your home doesn&apos;t use the grid
              for the rest of an export slot.
            </p>
            <ul>
              <li>
                <b>Work out times</b> reads your battery % and works out the end
                time from your battery size and max power in Settings. Nothing
                changes yet.
              </li>
              <li>
                It aims {MARGIN}% above your stop level, so it ends a few
                minutes early rather than late.
              </li>
              <li>
                <b>Confirm</b> sets this one export time in place of the ones on
                your inverter. We turn it off within 5 minutes of it ending.
              </li>
            </ul>
          </InfoTip>
          {isReading && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Spinner />
              Reading battery…
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          One export time, ending before the battery runs down
        </p>
      </div>

      {/* Unlike automatic charging, it doesn't lock the card: a one-off still
          running at that time just makes tonight's skip. */}
      {automatic?.enabled && (
        <p className="-mt-2 mb-4 text-xs text-amber-400">
          Automatic export runs this every evening at {automatic.at}:{" "}
          {automatic.powerRate}% discharge rate, stop at {automatic.stopSOC}%,
          if the battery is at least {automatic.minSOC}%. If an export you start
          here is still running then, that evening&apos;s is skipped.{" "}
          <Link to="/settings" className="text-violet-400 hover:underline">
            Change it in Settings
          </Link>
          .
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label
            htmlFor="export-until-rate"
            className="text-xs text-gray-400 block mb-1.5"
          >
            Discharge rate %
          </label>
          <select
            id="export-until-rate"
            value={powerRate}
            onChange={(e) => {
              setPowerRate(e.target.value);
              setPreview(null);
            }}
            disabled={isApplying}
            className={selectClass}
          >
            {RATE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="export-until-stop"
            className="text-xs text-gray-400 block mb-1.5"
          >
            Stop at battery %
          </label>
          <select
            id="export-until-stop"
            value={stopSOC}
            onChange={(e) => {
              setStopSOC(e.target.value);
              setPreview(null);
            }}
            disabled={isApplying}
            className={selectClass}
          >
            {SOC_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasBattery && settings && (
        <p className="mb-4 text-xs text-gray-500">
          Add your battery size and max power in{" "}
          <Link to="/settings" className="text-violet-400 hover:underline">
            Settings
          </Link>{" "}
          to use this.
        </p>
      )}

      {preview ? (
        <div
          role="status"
          className="rounded-xl border border-gray-700 bg-gray-800 p-4"
        >
          {renderPreview(preview)}
        </div>
      ) : (
        <div className="relative">
          <HoverTip tip={workOutTip}>
            {(describedBy) => (
              <button
                onClick={workOut}
                disabled={!!workOutTip || isReading}
                aria-describedby={describedBy}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isReading ? "Reading battery…" : "Work out times"}
              </button>
            )}
          </HoverTip>
        </div>
      )}
    </div>
  );
};

export default ExportUntilCard;
