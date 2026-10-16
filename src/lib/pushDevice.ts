import { apiRequest } from "./apiClient";
import type { PushConfig, PushEndpointBody } from "../types/Api";
import type { DeviceNotificationState } from "../types/Notifications";

// This device's push subscription, through public/sw.js. Browser only.

const isPushSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// iPhone and iPad only allow notifications in an app added to the Home Screen.
// iPads say they're Macs, but have a touch screen.
const isAppleMobile = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

// A phone's browser tab, not the installed app: notifications then show with
// the browser's icon and name.
const isPhoneBrowserTab = () =>
  window.matchMedia("(pointer: coarse)").matches &&
  !window.matchMedia("(display-mode: standalone)").matches;

// Registered on every load, so pushes can arrive while the app is closed.
const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Only notifications need it; the app works without.
  });
};

// null when there's none, or the service worker isn't registered (yet).
const currentSubscription = async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
};

const readDeviceState = async (): Promise<DeviceNotificationState> => {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const subscription = await currentSubscription();
  return subscription && Notification.permission === "granted" ? "on" : "off";
};

// The VAPID public key, base64url, as the bytes subscribe() wants.
const keyBytes = (base64Url: string) => {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

// Asks the browser for permission, subscribes and saves the subscription on
// the server. Throws an Error whose message is safe to show.
const subscribeDevice = async () => {
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked for this site in your browser settings"
        : "Allow notifications when your browser asks, to turn them on",
    );
  const { publicKey } = await apiRequest<PushConfig>("push");
  const registration = await navigator.serviceWorker.ready;
  const key = keyBytes(publicKey);
  let subscription: PushSubscription;
  try {
    // One made with an older key can't be sent to any more.
    const existing = await registration.pushManager.getSubscription();
    const existingKey = existing?.options.applicationServerKey;
    if (
      existing &&
      existingKey &&
      new Uint8Array(existingKey).join() !== key.join()
    )
      await existing.unsubscribe();
    subscription =
      (existing && (await registration.pushManager.getSubscription())) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      }));
  } catch {
    throw new Error("Your browser couldn't turn on notifications, try again");
  }
  try {
    await apiRequest("push", {
      method: "POST",
      // { endpoint, keys: { p256dh, auth } }, checked by the server.
      body: subscription.toJSON(),
    });
  } catch (error) {
    await subscription.unsubscribe().catch(() => false);
    throw error;
  }
};

// Stops notifications on this device: forgets it on the server, then in the
// browser. Never throws: if the server can't be reached, it drops the device
// the next time it sends to it, as the push service then says it's gone.
const unsubscribeDevice = async () => {
  if (!isPushSupported()) return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  await apiRequest("push", {
    method: "DELETE",
    body: { endpoint: subscription.endpoint } satisfies PushEndpointBody,
  }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => false);
};

export {
  isPushSupported,
  isAppleMobile,
  isPhoneBrowserTab,
  registerServiceWorker,
  readDeviceState,
  subscribeDevice,
  unsubscribeDevice,
};
