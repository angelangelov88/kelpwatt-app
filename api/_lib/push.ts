import webpush from "web-push";
import type { PushPayload } from "../../src/types/Notifications";
import type { PushSubscriptionRow } from "../../src/types/Server";

// A phone that's been off longer than this doesn't get old news when it's
// back on: the push service drops the message.
const PUSH_TTL_SECONDS = 12 * 60 * 60;
const PUSH_TIMEOUT_MS = 10_000;

// The VAPID keys, server-only (pnpm dlx web-push generate-vapid-keys). The
// public one is also handed to browsers by GET /api/push.
const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? "";

const vapidDetails = () => {
  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  return publicKey && privateKey && subject
    ? { publicKey, privateKey, subject }
    : null;
};

const isPushConfigured = () => vapidDetails() !== null;

// Sends one notification to one device. gone: the push service says the
// device unsubscribed or expired, so the row should be deleted. Only the
// status code is logged, never the address or the message.
const sendPush = async (
  { endpoint, p256dh, auth }: PushSubscriptionRow,
  payload: PushPayload,
): Promise<"sent" | "gone" | "failed"> => {
  const details = vapidDetails();
  if (!details) {
    console.error("push: not_configured");
    return "failed";
  }
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload),
      {
        vapidDetails: details,
        TTL: PUSH_TTL_SECONDS,
        timeout: PUSH_TIMEOUT_MS,
      },
    );
    return "sent";
  } catch (error) {
    const status =
      error instanceof webpush.WebPushError ? error.statusCode : undefined;
    if (status === 404 || status === 410) return "gone";
    console.error(`push: failed ${String(status ?? "network")}`);
    return "failed";
  }
};

export { vapidPublicKey, isPushConfigured, sendPush };
