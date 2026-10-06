// Growatt inverter types. Kept free of React: the server imports them.

type SlotParam = {
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
} | null;

// Battery First or Grid First values to write, as the forms hold them. Empty
// slots are null. oneOff: an Export until battery % slot.
type PeriodsInput = {
  powerRate: string;
  stopSOC: string;
  slots: SlotParam[];
  oneOff?: true;
};

type ChargePeriod = { start: string; end: string; enabled: boolean };
type ChargePeriods = {
  powerRate: number;
  stopSOC: number;
  raw: string;
  period1: ChargePeriod;
  period2: ChargePeriod;
  period3: ChargePeriod;
  period4: ChargePeriod;
  period5: ChargePeriod;
  period6: ChargePeriod;
};
type DischargePeriods = ChargePeriods;

// The fields of a Growatt JSON reply that this client reads.
type GrowattResponse = {
  success?: boolean;
  msg?: string;
  result?: number;
};

type GrowattConfig = {
  user: string;
  // MD5 of the password, which is all Growatt's login sends.
  passwordMd5: string;
  buildUrl: (path: string) => string;
  // Log each reply (never the login one).
  debug?: boolean;
  // When to stop calling Growatt (epoch ms), so a check ends before its
  // function is stopped. No limit if left out.
  deadline?: number;
};

// A slot as edited in the form.
type SlotState = {
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
};

type Snapshot = { powerRate: string; stopSOC: string; slots: SlotState[] };

// What Export until battery % works from: the battery % now, the chosen rate
// and stop level, and the battery details from Settings.
type ExportUntilInput = {
  soc: number;
  powerRate: number;
  stopSOC: number;
  batteryKwh: number;
  maxDischargeKw: number;
};

// Its result. already: the battery is at or near the stop level, so there's
// nothing to export. tooLate: it's too close to Growatt's 23:30 reset.
// export: one slot, "HH:MM" UK time; capped: it was cut short to end by
// 23:29.
type ExportUntilPlan =
  | { kind: "already"; soc: number }
  | { kind: "tooLate"; soc: number }
  | {
      kind: "export";
      soc: number;
      start: string;
      end: string;
      minutes: number;
      capped: boolean;
    };

export type {
  SlotParam,
  PeriodsInput,
  ChargePeriod,
  ChargePeriods,
  DischargePeriods,
  GrowattResponse,
  GrowattConfig,
  SlotState,
  Snapshot,
  ExportUntilInput,
  ExportUntilPlan,
};
