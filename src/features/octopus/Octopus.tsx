import { useEffect } from "react";
import { Link } from "react-router";
import useOctopus from "./useOctopus";
import useApplySlots from "./useApplySlots";
import CheckNow from "./CheckNow";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import useSettings from "../settings/useSettings";
import useToast from "../../contexts/useToast";
import { windowCover } from "../../lib/chargePlan";
import type { OctopusProps } from "../../types/Octopus";

// canApply: false until the user has saved their Growatt login. With automatic
// charging on, Sync now replaces the Apply button.
const Octopus = ({ canApply }: OctopusProps) => {
  const {
    slotsLoading,
    slotsError,
    slotsErrorUpdatedAt,
    slotsData,
    formatTime,
    formatDay,
    fetchSlots,
  } = useOctopus();
  const {
    applySlots,
    canBuildPlan,
    settingsError,
    planSummary,
    extraSlotsMessage,
    isPending,
  } = useApplySlots({ slotsData });
  const { data: settings } = useSettings();
  const { showToast } = useToast();
  const isAutomated = canApply && (settings?.automationEnabled ?? false);

  useEffect(() => {
    if (slotsError) showToast(`Octopus error: ${slotsError.message}`, "error");
  }, [slotsError, slotsErrorUpdatedAt, showToast]);

  useEffect(() => {
    if (settingsError)
      showToast(
        `Couldn't load your settings: ${settingsError.message}`,
        "error",
      );
  }, [settingsError, showToast]);

  useEffect(() => {
    if (extraSlotsMessage) showToast(extraSlotsMessage, "info");
  }, [extraSlotsMessage, showToast]);

  const slots = slotsData?.plannedDispatches ?? [];
  // How much of each slot the user's own window covers. Covered times aren't
  // written as separate slots, so the inverter can differ from this list.
  const covers = slots.map((s) =>
    settings ? windowCover(s, settings) : "none",
  );

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-strong">
            Octopus Dispatch Slots
          </h2>
          <InfoTip label="Octopus Dispatch Slots">
            {isAutomated ? (
              <>
                <p>
                  The cheap charging times Octopus has planned for your car. We
                  check them every 5 minutes and update your inverter for you.
                </p>
                <ul>
                  <li>
                    <b>Refresh</b> gets the latest times from Octopus.
                  </li>
                  <li>
                    <b>Sync now</b> does the same straight away, for example
                    just after you plug in your car.
                  </li>
                </ul>
              </>
            ) : (
              <>
                <p>
                  The cheap charging times Octopus has planned for your car.
                  Your home battery can charge at the same cheap rate.
                </p>
                <ul>
                  <li>
                    <b>Refresh</b> gets the latest times from Octopus. It
                    doesn&apos;t change your inverter.
                  </li>
                  <li>
                    <b>The green button</b> sets your battery to charge at these
                    times, plus your own night window if you have one. It uses
                    your battery charging settings from Settings.
                  </li>
                </ul>
              </>
            )}
          </InfoTip>
        </div>
        <button
          onClick={fetchSlots}
          disabled={slotsLoading}
          className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {slotsLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {!slotsData && (
        <p className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          {slotsLoading ? (
            <>
              <Spinner /> Loading slots from Octopus…
            </>
          ) : (
            "Couldn't load the slots. Press Refresh to try again."
          )}
        </p>
      )}

      {slotsData && slots.length === 0 && (
        <p className="text-sm text-gray-500 mb-3">
          {isAutomated
            ? "Octopus hasn't planned any slots yet. It can take a few minutes after you plug in. We'll keep checking every 5 minutes."
            : "No upcoming dispatch slots."}
        </p>
      )}

      {slots.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {slots.map((item, index) => (
            <div
              key={`${item.startDt}-${item.endDt}`}
              className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3"
            >
              <span className="text-xs text-gray-400 font-medium">
                Slot {index + 1}
                <span className="text-gray-500 font-normal">
                  {" · "}
                  {formatDay(item.startDt)}
                  {covers[index] === "all" && " · in your window"}
                  {covers[index] === "part" && " · partly in your window"}
                </span>
              </span>
              <span className="text-sm font-mono text-gray-100">
                {formatTime(item.startDt)}–{formatTime(item.endDt)}
              </span>
            </div>
          ))}
          {settings && covers.some((c) => c !== "none") && (
            <p className="text-xs text-gray-400">
              Times inside your charge window ({settings.chargeStart}–
              {settings.chargeEnd}) aren&apos;t added to your inverter as
              separate slots, because the window already charges your battery
              then. Only the rest of each slot is added.{" "}
              <Link to="/settings" className="underline hover:text-gray-200">
                Change the window in Settings
              </Link>
            </p>
          )}
        </div>
      )}

      {slotsData && !canApply && (
        <p className="text-xs text-gray-400">
          Add your Growatt login in Settings to apply these to your inverter.
        </p>
      )}

      {isAutomated && <CheckNow onChecked={fetchSlots} />}

      {slotsData && canApply && !isAutomated && (
        <>
          <p className="text-xs text-gray-400 mb-3">
            Will apply (UK time):{" "}
            <span className="font-mono text-gray-200">
              {planSummary === null ? "…" : planSummary || "no charge slots"}
            </span>
          </p>
          <button
            onClick={applySlots}
            disabled={isPending || !canBuildPlan}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? "Applying…"
              : slots.length > 0
                ? "Apply Slots to Growatt"
                : settings?.windowEnabled === false
                  ? "Clear Growatt Charge Slots"
                  : "Apply My Window to Growatt"}
          </button>
        </>
      )}
    </div>
  );
};

export default Octopus;
