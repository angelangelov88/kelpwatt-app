import type { SlotState } from "../types/Growatt";
import type {
  PowerDownSession,
  RawSavingSessions,
  SavingSessionsData,
  SessionStatus,
} from "../types/Octopus";
import { toUkMinutes } from "./chargePlan";
import { OctopusError, octopusRequest } from "./octopusApi";

// Octopus Saving Sessions, now branded "Power Down" (eventType TURN_DOWN).
// They are only available on Octopus's backend GraphQL API, which is undocumented
// (it's what their app and the Home Assistant integration use), so field names may
// change without notice. Kept free of React so the GitHub Action can reuse it.

const BACKEND_ENDPOINT = "https://api.backend.octopus.energy/v1/graphql/";

const QUERY = `query SavingSessions($account: String!) {
  savingSessions {
    events(includeDev: false) {
      id code rewardPerKwhInOctoPoints startAt endAt eventType
      targetRegion { regionId }
    }
    account(accountNumber: $account) {
      signedUpMeterPoint { regionId }
      joinedEvents { eventId startAt endAt rewardGivenInOctoPoints eventType }
    }
  }
}`;

const POWER_DOWN = "TURN_DOWN";

const fetchSavingSessions = async (
  token: string,
  account: string,
): Promise<SavingSessionsData> => {
  const { savingSessions: data } = await octopusRequest<RawSavingSessions>(
    QUERY,
    { account },
    { token, endpoint: BACKEND_ENDPOINT },
  );
  if (!data) throw new OctopusError("No Power Down data returned from Octopus");

  const joinedRaw = (data.account?.joinedEvents ?? []).filter(
    (e) => e.eventType === POWER_DOWN,
  );
  const joinedById = new Map(joinedRaw.map((e) => [String(e.eventId), e]));

  const events = (data.events ?? [])
    .filter((e) => e.eventType === POWER_DOWN)
    .map((e): PowerDownSession => {
      const joined = joinedById.get(String(e.id));
      return {
        id: String(e.id),
        code: e.code,
        startAt: new Date(e.startAt),
        endAt: new Date(e.endAt),
        rewardPerKwh: e.rewardPerKwhInOctoPoints,
        regions: (e.targetRegion ?? []).map((r) => r.regionId),
        joined: !!joined,
        pointsAwarded: joined?.rewardGivenInOctoPoints ?? null,
      };
    });
  const eventsById = new Map(events.map((e) => [e.id, e]));

  const joined = joinedRaw.map((e): PowerDownSession => {
    const event = eventsById.get(String(e.eventId));
    return {
      id: String(e.eventId),
      code: event?.code ?? null,
      startAt: new Date(e.startAt),
      endAt: new Date(e.endAt),
      rewardPerKwh: event?.rewardPerKwh ?? null,
      regions: event?.regions ?? [],
      joined: true,
      pointsAwarded: e.rewardGivenInOctoPoints,
    };
  });

  return {
    region: data.account?.signedUpMeterPoint?.regionId ?? null,
    events,
    joined,
  };
};

const JOIN_MUTATION = `mutation JoinSavingSession($input: JoinSavingSessionsEventInput!) {
  joinSavingSessionsEvent(input: $input) { joinedEventCodes }
}`;

// Opts the account in to one Power Down session.
const joinSession = async (
  token: string,
  account: string,
  eventCode: string,
): Promise<void> => {
  await octopusRequest(
    JOIN_MUTATION,
    { input: { accountNumber: account, eventCode } },
    { token, endpoint: BACKEND_ENDPOINT },
  );
};

const ukDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });
const isSameUkDay = (a: Date, b: Date) => ukDate.format(a) === ukDate.format(b);

const byStartDesc = (a: PowerDownSession, b: PowerDownSession) =>
  b.startAt.getTime() - a.startAt.getTime();

// All Power Down sessions today (UK) in your region, joined or not, soonest first.
const sessionsToday = (data: SavingSessionsData, now = new Date()) =>
  data.events
    .filter((s) => isSameUkDay(s.startAt, now))
    .filter(
      (s) =>
        !s.regions.length ||
        data.region === null ||
        s.regions.includes(data.region),
    )
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

// Sessions you joined that ended within the last `days` days, newest first.
const joinedInLastDays = (
  data: SavingSessionsData,
  days: number,
  now = new Date(),
) => {
  const from = now.getTime() - days * 24 * 60 * 60 * 1000;
  return data.joined
    .filter((s) => s.startAt.getTime() >= from && s.endAt <= now)
    .sort(byStartDesc);
};

const sessionStatus = (
  s: Pick<PowerDownSession, "startAt" | "endAt">,
  now = new Date(),
): SessionStatus =>
  now < s.startAt ? "upcoming" : now < s.endAt ? "in progress" : "ended";

const pad = (n: number) => String(n).padStart(2, "0");

// The session window as an inverter slot, in UK time.
const sessionToSlot = (s: PowerDownSession): SlotState => {
  const start = toUkMinutes(s.startAt);
  const end = toUkMinutes(s.endAt);
  return {
    startHour: pad(Math.floor(start / 60)),
    startMin: pad(start % 60),
    endHour: pad(Math.floor(end / 60)),
    endMin: pad(end % 60),
  };
};

export {
  fetchSavingSessions,
  joinSession,
  sessionsToday,
  joinedInLastDays,
  sessionStatus,
  sessionToSlot,
};
