import { useCallback, useEffect, useRef } from "react";
import useGrowatt from "./useGrowatt";
import { useSlotForm } from "./useSlotForm";
import type { SlotState } from "../../types/Growatt";
import type { GrowattProps } from "../../types/GrowattForm";
import type { PowerDownSession } from "../../types/Octopus";
import useInverterRead from "./useInverterRead";
import InfoTip from "../../components/InfoTip";
import BatteryFirstCard from "./BatteryFirstCard";
import GridFirstCard from "./GridFirstCard";
import ExportUntilCard from "./ExportUntilCard";
import useExportPresets from "./useExportPresets";
import useToast from "../../contexts/useToast";
import PowerDownSessions from "../octopus/PowerDownSessions";
import useSavingSessions from "../octopus/useSavingSessions";
import HappyHours from "../octopus/HappyHours";
import useHappyHours from "../octopus/useHappyHours";
import { sessionToSlot } from "../../lib/savingSessions";

// A slot as [start, end) minutes, with end past midnight (above 1440) if it wraps.
const slotRange = (s: SlotState): [number, number] => {
  const start = Number(s.startHour) * 60 + Number(s.startMin);
  let end = Number(s.endHour) * 60 + Number(s.endMin);
  if (end <= start) end += 24 * 60;
  return [start, end];
};

const slotsOverlap = (a: SlotState, b: SlotState) => {
  const [aStart, aEnd] = slotRange(a);
  const [bStart, bEnd] = slotRange(b);
  // Also compare a day either side, for slots that wrap past midnight.
  return [-1440, 0, 1440].some(
    (shift) => aStart < bEnd + shift && bStart + shift < aEnd,
  );
};

const formatSlot = (s: SlotState) =>
  `${s.startHour}:${s.startMin}–${s.endHour}:${s.endMin}`;

// showSessions: false until the user has saved their Octopus details.
const Growatt = ({ showSessions }: GrowattProps) => {
  const {
    setChargePeriodsMutation,
    chargePeriodsQuery,
    dischargePeriodsQuery,
    setDischargeMutation,
  } = useGrowatt();

  const chargeForm = useSlotForm("35", "95");
  const chargeReader = useInverterRead(chargePeriodsQuery, chargeForm);
  const dischargeForm = useSlotForm("95", "20");
  const dischargeReader = useInverterRead(dischargePeriodsQuery, dischargeForm);
  // Same query as the Power Down card, so refetching here updates the card.
  const sessionsQuery = useSavingSessions();
  const happyHoursQuery = useHappyHours();

  const { showToast } = useToast();
  const { high } = useExportPresets();
  const gridFirstRef = useRef<HTMLDivElement>(null);
  // A session slot to add once Export to grid finishes loading. A ref, not state:
  // it doesn't affect rendering, it's just a pending action.
  const pendingSessionSlot = useRef<SlotState | null>(null);

  // Fills the Export to grid form only; the user reviews it and presses Apply.
  // Memoised because the pending-slot effect below depends on it.
  const addSessionSlot = useCallback(
    (slot: SlotState) => {
      const clash = dischargeForm.slots.find((s) => slotsOverlap(s, slot));
      if (clash) {
        showToast(
          `Export to grid already has ${formatSlot(clash)}, which overlaps this session`,
          "error",
        );
        return;
      }
      if (!dischargeForm.canAddSlot) {
        showToast(
          "Export to grid already has 6 slots — remove one first",
          "error",
        );
        return;
      }
      // The session's own times, with the first preset's power and stop.
      dischargeForm.appendSlot(
        String(high.powerRate),
        String(high.stopSOC),
        slot,
      );
      showToast(
        `Added ${formatSlot(slot)} to Export to grid with ${high.name}'s power and stop level — review it and press Apply`,
        "info",
      );
      gridFirstRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [dischargeForm, showToast, high],
  );

  const exportDuringSession = (session: PowerDownSession) => {
    const slot = sessionToSlot(session);
    if (dischargeForm.isLoaded) {
      addSessionSlot(slot);
      return;
    }
    pendingSessionSlot.current = slot;
    dischargeReader.read();
  };

  // Once Export to grid has loaded, add the waiting slot; drop it if the load failed
  // (the card already shows the read error). This runs after the render that
  // loaded the form, so the overlap check sees the loaded slots.
  useEffect(() => {
    const slot = pendingSessionSlot.current;
    if (!slot || dischargeReader.isReading) return;
    pendingSessionSlot.current = null;
    if (dischargeForm.isLoaded) addSessionSlot(slot);
  }, [dischargeForm.isLoaded, dischargeReader.isReading, addSessionSlot]);

  const isBusy =
    chargeReader.isReading ||
    dischargeReader.isReading ||
    setChargePeriodsMutation.isPending ||
    setDischargeMutation.isPending ||
    sessionsQuery.isFetching ||
    happyHoursQuery.isFetching;

  // Both inverter reads go through the queue in useGrowatt, so they run one after the
  // other. The Power Down sessions and happy hours come from Octopus, so they load
  // alongside them; each card toasts its own error.
  const readAll = () => {
    if (
      (chargeReader.hasUnsavedChanges || dischargeReader.hasUnsavedChanges) &&
      !window.confirm(
        "You have unsaved changes. Load the settings from your inverter and discard them?",
      )
    )
      return;
    chargeReader.read({ confirmed: true });
    dischargeReader.read({ confirmed: true });
    if (showSessions) {
      void sessionsQuery.refetch({ cancelRefetch: false });
      void happyHoursQuery.refetch({ cancelRefetch: false });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-400">Inverter settings</p>
          <InfoTip label="Load all">
            <p>
              <b>Load all</b> gets the current settings from your inverter for
              all the cards below
              {showSessions
                ? ", and today's Power Down sessions and upcoming happy hours"
                : ""}
              . Nothing is changed.
            </p>
          </InfoTip>
        </div>
        <button
          onClick={readAll}
          disabled={isBusy}
          className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Load all
        </button>
      </div>
      <BatteryFirstCard
        form={chargeForm}
        reader={chargeReader}
        setChargePeriodsMutation={setChargePeriodsMutation}
      />
      {showSessions && (
        <PowerDownSessions
          onExportDuringSession={exportDuringSession}
          exportDisabled={
            dischargeReader.isReading || setDischargeMutation.isPending
          }
        />
      )}
      {showSessions && <HappyHours />}
      <div ref={gridFirstRef} className="scroll-mt-4">
        <GridFirstCard
          form={dischargeForm}
          reader={dischargeReader}
          setDischargeMutation={setDischargeMutation}
        />
      </div>
      <ExportUntilCard
        reader={dischargeReader}
        setDischargeMutation={setDischargeMutation}
      />
    </div>
  );
};

export default Growatt;
