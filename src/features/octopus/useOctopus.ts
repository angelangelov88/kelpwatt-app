import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { OctopusSlots } from "../../types/Api";

const useOctopus = () => {
  // Loaded when the dashboard opens, then again with Refresh. Not on window
  // focus, so the plan doesn't change under the Apply button.
  const slotsQuery = useQuery({
    queryKey: ["octopus", "slots"],
    queryFn: () => apiRequest<OctopusSlots>("octopus/slots"),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // refetch never rejects; errors come through slotsError.
  const fetchSlots = () => {
    void slotsQuery.refetch({ cancelRefetch: false });
  };

  return {
    slotsLoading: slotsQuery.isFetching,
    // Queries have no onError, so the caller toasts these. errorUpdatedAt changes on
    // every failure, even when the error is the same.
    slotsError: slotsQuery.error,
    slotsErrorUpdatedAt: slotsQuery.errorUpdatedAt,
    slotsData: slotsQuery.data,
    fetchSlots,
    formatTime,
    formatDay,
  };
};

const UK = "Europe/London";

const ukDay = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: UK });

// "23:30", in UK time.
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: UK,
  });

// "Today", "Tomorrow", or "Wed 7 Oct", in UK time. Slots are always within the
// next 24 hours, so this is only a reference next to the times.
const formatDay = (iso: string, now = new Date()) => {
  const date = new Date(iso);
  if (ukDay(date) === ukDay(now)) return "Today";
  if (ukDay(date) === ukDay(new Date(now.getTime() + 24 * 60 * 60 * 1000)))
    return "Tomorrow";
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: UK,
  });
};

export default useOctopus;
