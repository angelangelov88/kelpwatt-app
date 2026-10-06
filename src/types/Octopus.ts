import type { AutomationStatus, Settings } from "./Api";
import type { SlotParam } from "./Growatt";

// Octopus types. Kept free of React: the server imports them.

type Dispatch = { startDt: string; endDt: string };

type Slots = [SlotParam, SlotParam, SlotParam, SlotParam, SlotParam, SlotParam];

// The saved settings the charge plan is built from.
type ChargeSettings = Pick<
  Settings,
  "windowEnabled" | "chargeStart" | "chargeEnd" | "powerRate" | "stopSOC"
>;

type ChargePlan = {
  powerRate: string;
  stopSOC: string;
  // The overnight window first (if the user has one), then Octopus periods,
  // padded with null.
  slots: Slots;
  // Octopus periods left out because the inverter only has 6 slots.
  skipped: number;
};

// A period in minutes past midnight, within a single day (0 to DAY).
// `firstStart` is the earliest real start time it came from, for "soonest first".
type Piece = { start: number; end: number; firstStart: number };

type SlotsData = { plannedDispatches: Dispatch[] } | undefined;

type PowerDownSession = {
  id: string;
  code: string | null;
  startAt: Date;
  endAt: Date;
  rewardPerKwh: number | null;
  // Empty means every region.
  regions: number[];
  joined: boolean;
  pointsAwarded: number | null;
};

type SavingSessionsData = {
  region: number | null;
  // Every Power Down event Octopus currently lists, with your joined status.
  events: PowerDownSession[];
  // Every Power Down event you joined, including older ones no longer listed.
  joined: PowerDownSession[];
};

type RawEvent = {
  id: string | number;
  code: string;
  rewardPerKwhInOctoPoints: number | null;
  startAt: string;
  endAt: string;
  eventType: string;
  targetRegion: { regionId: number }[] | null;
};

type RawJoined = {
  eventId: string | number;
  startAt: string;
  endAt: string;
  rewardGivenInOctoPoints: number | null;
  eventType: string;
};

type RawSavingSessions = {
  savingSessions: {
    events: RawEvent[] | null;
    account: {
      signedUpMeterPoint: { regionId: number } | null;
      joinedEvents: RawJoined[] | null;
    } | null;
  } | null;
};

type SessionStatus = "upcoming" | "in progress" | "ended";

type HistoryDays = 7 | 30 | 365;

type PowerDownSessionsProps = {
  // Adds the session window to Grid First with High Export settings.
  onExportDuringSession: (session: PowerDownSession) => void;
  exportDisabled: boolean;
};

type OctopusProps = { canApply: boolean };

// onChecked runs after each check, e.g. to refresh the slots shown.
type CheckNowProps = { onChecked: () => void };

// undefined while loading.
type AutomationStatusLineProps = {
  status: AutomationStatus | undefined;
  isStale: boolean;
};

type SectionHeadingProps = { children: string };

export type {
  Dispatch,
  Slots,
  ChargeSettings,
  ChargePlan,
  Piece,
  SlotsData,
  PowerDownSession,
  SavingSessionsData,
  RawEvent,
  RawJoined,
  RawSavingSessions,
  SessionStatus,
  HistoryDays,
  PowerDownSessionsProps,
  OctopusProps,
  CheckNowProps,
  AutomationStatusLineProps,
  SectionHeadingProps,
};
