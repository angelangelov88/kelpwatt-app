import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useToast from "../../contexts/useToast";
import {
  CHARGE_KEY,
  chargePeriodsQueryOptions,
  putPeriods,
  toPeriods,
} from "../growatt/useGrowatt";
import useSettings from "../settings/useSettings";
import {
  buildChargePlan,
  describePlan,
  planMatches,
} from "../../lib/chargePlan";
import type { ChargePlan, SlotsData } from "../../types/Octopus";

const useApplySlots = ({ slotsData }: { slotsData: SlotsData }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (plan: ChargePlan) => putPeriods("charge", plan),
    onSuccess: (_, plan) => {
      // Show the new charge periods on the Charge battery card straight away, then
      // check them against the inverter in the background. query() is used because
      // refetchQueries skips queries with enabled: false.
      queryClient.setQueryData(CHARGE_KEY, toPeriods(plan));
      queryClient
        .query({ ...chargePeriodsQueryOptions, staleTime: 0 })
        .catch(() => undefined);
    },
    onError: (error) => {
      showToast(`Apply failed: ${error.message}`, "error");
    },
  });

  // The plan uses the saved window, power and stop level, like the scheduled job.
  const { data: settings, error: settingsError } = useSettings();
  const plan =
    slotsData && settings
      ? buildChargePlan(slotsData.plannedDispatches, settings)
      : null;

  const applySlots = () => {
    if (slotsData && settings)
      mutation.mutate(buildChargePlan(slotsData.plannedDispatches, settings));
  };

  // What the inverter has, if the dashboard has read it or just written it.
  // Never read from here: each read takes the inverter several seconds.
  const { data: current } = useQuery({
    ...chargePeriodsQueryOptions,
    enabled: false,
  });
  // True when the inverter already has this plan, so applying would change
  // nothing. Unknown (not read yet) counts as not applied.
  const isApplied =
    plan !== null && current !== undefined && planMatches(plan, current);

  const planSummary = plan ? describePlan(plan) : null;
  const extraSlotsMessage = plan?.skipped
    ? `${String(plan.skipped)} Octopus period(s) not applied — the inverter only has 6 slots`
    : null;

  return {
    applySlots,
    canBuildPlan: plan !== null,
    isApplied,
    settingsError,
    planSummary,
    extraSlotsMessage,
    isPending: mutation.isPending,
  };
};

export default useApplySlots;
