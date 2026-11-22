import type {
  HappyHour,
  HappyHourCapacity,
  HappyHoursData,
  RawHappyHours,
} from "../types/Octopus";
import { octopusRequest, OctopusError } from "./octopusApi";
import { sessionStatus } from "./savingSessions";

// Octopus weekend happy hours (eventType WEEKEND_HAPPY_HOUR): free or cheap
// electricity you book in advance with tokens. Like Power Down, they are only on
// Octopus's undocumented backend GraphQL API, so field names may change without
// notice. A separate query from Power Down's, so if these fields change, only
// this card stops working. Kept free of React: the server uses it.

const BACKEND_ENDPOINT = "https://api.backend.octopus.energy/v1/graphql/";

const QUERY = `query HappyHours($account: String!) {
  savingSessions {
    events(includeDev: false) {
      id code startAt endAt eventType tokenCost capacityStatus
      targetRegion { regionId }
    }
    account(accountNumber: $account) {
      signedUpMeterPoint { regionId }
      tokenBalance
      joinedEvents { eventId eventType }
    }
  }
}`;

const HAPPY_HOUR = "WEEKEND_HAPPY_HOUR";

const CAPACITIES: readonly string[] = [
  "AVAILABLE",
  "LOW",
  "FULL",
] satisfies HappyHourCapacity[];

const isCapacity = (value: unknown): value is HappyHourCapacity =>
  typeof value === "string" && CAPACITIES.includes(value);

const fetchHappyHours = async (
  token: string,
  account: string,
): Promise<HappyHoursData> => {
  const { savingSessions: data } = await octopusRequest<RawHappyHours>(
    QUERY,
    { account },
    { token, endpoint: BACKEND_ENDPOINT },
  );
  if (!data) throw new OctopusError("No happy hour data returned from Octopus");

  const bookedIds = new Set(
    (data.account?.joinedEvents ?? [])
      .filter((e) => e.eventType === HAPPY_HOUR)
      .map((e) => String(e.eventId)),
  );

  const events = (data.events ?? [])
    .filter((e) => e.eventType === HAPPY_HOUR)
    .map(
      (e): HappyHour => ({
        id: String(e.id),
        code: e.code,
        startAt: new Date(e.startAt),
        endAt: new Date(e.endAt),
        tokenCost: e.tokenCost,
        capacity: isCapacity(e.capacityStatus) ? e.capacityStatus : null,
        regions: (e.targetRegion ?? []).map((r) => r.regionId),
        booked: bookedIds.has(String(e.id)),
      }),
    );

  return {
    region: data.account?.signedUpMeterPoint?.regionId ?? null,
    tokenBalance: data.account?.tokenBalance ?? null,
    events,
  };
};

const BOOK_MUTATION = `mutation BookHappyHour($input: BookSavingSessionsWeekendHappyHourEventInput!) {
  bookSavingSessionsWeekendHappyHourEvent(input: $input) { bookedEvent { eventId } }
}`;

// Books one happy hour for the account. Octopus takes the tokens.
const bookHappyHour = async (
  token: string,
  account: string,
  eventCode: string,
): Promise<void> => {
  await octopusRequest(
    BOOK_MUTATION,
    { input: { accountNumber: account, eventCode } },
    { token, endpoint: BACKEND_ENDPOINT },
  );
};

// Happy hours in your region that haven't ended, soonest first.
const upcomingHappyHours = (data: HappyHoursData, now = new Date()) =>
  data.events
    .filter((h) => h.endAt > now)
    .filter(
      (h) =>
        !h.regions.length ||
        data.region === null ||
        h.regions.includes(data.region),
    )
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

// Why a happy hour can't be booked, or null if it can. Booking needs it not to
// have started, a place left, and enough tokens. When Octopus doesn't say the
// cost, at least one token.
const cantBookReason = (
  h: HappyHour,
  tokenBalance: number | null,
  now = new Date(),
): string | null => {
  if (h.booked) return null;
  if (sessionStatus(h, now) !== "upcoming") return "Too late to book";
  if (h.capacity === "FULL") return "Full";
  if (tokenBalance === null || tokenBalance < (h.tokenCost ?? 1))
    return "Not enough tokens";
  return null;
};

export { fetchHappyHours, bookHappyHour, upcomingHappyHours, cantBookReason };
