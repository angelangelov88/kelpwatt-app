import type { NotificationCategory, Settings } from "./Api";

// What a push carries, read by public/sw.js. tag: one per kind, so a new
// notification replaces the last one of the same kind on the device.
type PushPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
};

// An audit row, as much of it as the notification needs. fromSchedule: written
// by the background check, not a button the user pressed.
type PushEntry = {
  action: string;
  details: unknown;
  fromSchedule: boolean;
};

// Whether this device can get notifications, and whether it does.
// unsupported: no Push API (an iPhone browser tab, or an old browser);
// blocked: the user said no to the browser's prompt.
type DeviceNotificationState =
  | "loading"
  | "unsupported"
  | "blocked"
  | "off"
  | "on";

type NotificationsSwitchProps = {
  state: DeviceNotificationState;
  isPending: boolean;
  onChange: (on: boolean) => void;
};

type NotificationKindsProps = { saved: Settings };

type NotificationKind = {
  key: NotificationCategory;
  label: string;
  hint: string;
};

export type {
  PushPayload,
  PushEntry,
  DeviceNotificationState,
  NotificationsSwitchProps,
  NotificationKindsProps,
  NotificationKind,
};
