import type {
  HappyHour,
  HappyHourBooking,
  HappyHourCapacity,
  HappyHoursData,
  HistoryDays,
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
      joinedEvents { eventId eventType startAt endAt energyUsedInKwh rewardGivenInPence }
    }
  }
}`;

const HAPPY_HOUR = "WEEKEND_HAPPY_HOUR";

// Octopus normally lets you book up to two happy hours a weekend. It sometimes
// doubles that on special weekends, which its API doesn't show, so on those
// weekends this stops you at two.
const MAX_BOOKINGS_PER_WEEKEND = 2;

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

  const booked = (data.account?.joinedEvents ?? []).filter(
    (e) => e.eventType === HAPPY_HOUR,
  );
  const bookedIds = new Set(booked.map((e) => String(e.eventId)));

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
    bookingsKnown: Array.isArray(data.account?.joinedEvents),
    region: data.account?.signedUpMeterPoint?.regionId ?? null,
    tokenBalance: data.account?.tokenBalance ?? null,
    events,
    bookings: booked.map(
      (e): HappyHourBooking => ({
        id: String(e.eventId),
        startAt: new Date(e.startAt),
        endAt: new Date(e.endAt),
        energyUsedKwh: e.energyUsedInKwh,
        creditPence: e.rewardGivenInPence,
      }),
    ),
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

const CANCEL_MUTATION = `mutation CancelHappyHour($input: CancelSavingSessionsWeekendHappyHourBookingInput!) {
  cancelSavingSessionsWeekendHappyHourBooking(input: $input) { accountNumber }
}`;

// Cancels one happy hour booking. Octopus only replies with the account number
// (or an error), so the caller loads the happy hours again to confirm it's gone.
const cancelHappyHour = async (
  token: string,
  account: string,
  eventCode: string,
): Promise<void> => {
  await octopusRequest(
    CANCEL_MUTATION,
    { input: { accountNumber: account, eventCode } },
    { token, endpoint: BACKEND_ENDPOINT },
  );
};

// A booking can be cancelled until the happy hour starts.
const canCancel = (h: HappyHour, now = new Date()) =>
  h.booked && sessionStatus(h, now) === "upcoming";

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
// cost, at least one token; when it doesn't say the balance, Octopus decides.
const cantBookReason = (
  h: HappyHour,
  tokenBalance: number | null,
  now = new Date(),
): string | null => {
  if (h.booked) return null;
  if (sessionStatus(h, now) !== "upcoming") return "Too late to book";
  if (h.capacity === "FULL") return "Full";
  if (tokenBalance !== null && tokenBalance < (h.tokenCost ?? 1))
    return "Not enough tokens";
  return null;
};

const ukDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });
const ukWeekday = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: "Europe/London",
});

// The weekend a time falls in, as its Saturday's UK date (YYYY-MM-DD). A Sunday
// belongs to the day before; any other day is its own.
const weekendOf = (d: Date) => {
  const date = ukDate.format(d);
  if (ukWeekday.format(d) !== "Sun") return date;
  const [y, m, day] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day - 1)).toISOString().slice(0, 10);
};

// True when you've already booked as many happy hours as Octopus allows in
// this one's weekend.
const weekendLimitReached = (h: HappyHour, data: HappyHoursData) => {
  const weekend = weekendOf(h.startAt);
  return (
    data.bookings.filter((b) => weekendOf(b.startAt) === weekend).length >=
    MAX_BOOKINGS_PER_WEEKEND
  );
};

// Bookings for happy hours that ended in the last `days` days, newest first.
const bookedInLastDays = (
  data: HappyHoursData,
  days: HistoryDays,
  now = new Date(),
) => {
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return data.bookings
    .filter((b) => b.startAt >= from && b.endAt <= now)
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
};

export {
  MAX_BOOKINGS_PER_WEEKEND,
  fetchHappyHours,
  bookHappyHour,
  cancelHappyHour,
  canCancel,
  upcomingHappyHours,
  cantBookReason,
  weekendLimitReached,
  bookedInLastDays,
};
