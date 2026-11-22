import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { HappyHourJson, HappyHours, JoinBody } from "../../types/Api";
import type { HappyHour, HappyHoursData } from "../../types/Octopus";

// The server sends the dates as ISO strings.
const toHappyHour = (h: HappyHourJson): HappyHour => ({
  ...h,
  startAt: new Date(h.startAt),
  endAt: new Date(h.endAt),
});

const fetchHappyHours = async (): Promise<HappyHoursData> => {
  const data = await apiRequest<HappyHours>("octopus/happyHours");
  return {
    region: data.region,
    tokenBalance: data.tokenBalance,
    events: data.events.map(toHappyHour),
    bookedStarts: data.bookedStarts.map((s) => new Date(s)),
  };
};

// Loaded on demand with refetch(), like the Power Down card.
const useHappyHours = () =>
  useQuery({
    queryKey: ["octopus", "happyHours"],
    queryFn: fetchHappyHours,
    enabled: false,
    retry: false,
    staleTime: Infinity,
  });

// The caller reloads the happy hours on success (refetchQueries skips disabled
// queries).
const useBookHappyHour = () =>
  useMutation({
    mutationFn: (eventCode: string) =>
      apiRequest("octopus/book", {
        method: "POST",
        body: { eventCode } satisfies JoinBody,
      }),
  });

export { useBookHappyHour };
export default useHappyHours;
