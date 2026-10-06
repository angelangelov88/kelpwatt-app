import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { describePlan } from "../../lib/chargePlan";
import type { AutomationStatus, CheckNowResult } from "../../types/Api";
import { CHARGE_KEY, toPeriods } from "../growatt/useGrowatt";

const AUTOMATION_KEY = ["automation"];

// Checks run every 5 minutes, so three missed in a row means they've stopped:
// the schedule isn't running, or every check is cut off before it can save
// anything.
const STALE_MS = 15 * 60 * 1000;

// What automatic charging last did, and the Sync now button. Only used while
// automation is on. onChecked runs after every Sync now that reached the
// server, e.g. to refresh the Octopus slots shown.
const useAutomation = ({ onChecked }: { onChecked: () => void }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // The schedule runs every 5 minutes, so a minute is fresh enough.
  const statusQuery = useQuery({
    queryKey: AUTOMATION_KEY,
    queryFn: () => apiRequest<AutomationStatus>("automation"),
    refetchInterval: 60_000,
  });

  const checkNow = useMutation({
    mutationFn: () =>
      apiRequest<CheckNowResult>("automation", { method: "POST" }),
    onSuccess: ({ result, plan, status }) => {
      queryClient.setQueryData(AUTOMATION_KEY, status);
      onChecked();
      if (result === "applied" && plan) {
        // Show the new charge periods on the Charge battery card straight away.
        queryClient.setQueryData(CHARGE_KEY, toPeriods(plan));
        showToast(
          `Inverter updated: ${describePlan(plan) || "no charge slots"}`,
          "success",
        );
      } else if (result === "unchanged")
        showToast("Synced: the inverter is already up to date", "success");
      else if (result === "busy")
        showToast("A sync is already running, try again in a minute", "info");
      else
        showToast(
          `Sync failed: ${status.error?.message ?? "something went wrong"}`,
          "error",
        );
    },
    onError: (error) => {
      showToast(`Sync failed: ${error.message}`, "error");
    },
  });

  // Measured from when the status was fetched (every minute), not from now,
  // so rendering stays pure.
  const checkedAt = statusQuery.data?.checkedAt;
  const isStale =
    !!checkedAt &&
    statusQuery.dataUpdatedAt - new Date(checkedAt).getTime() > STALE_MS;

  return {
    status: statusQuery.data,
    isStale,
    checkNow: () => {
      checkNow.mutate();
    },
    isChecking: checkNow.isPending,
  };
};

export default useAutomation;
