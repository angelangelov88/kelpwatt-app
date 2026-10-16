import { z } from "zod";

// The browsers' push services. The server sends to whatever address a device
// gives it, so only these are accepted: anything else could point it at
// another server.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /\.push\.apple\.com$/,
  /\.notify\.windows\.com$/,
];

const isPushEndpoint = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      PUSH_HOSTS.some((host) => host.test(url.hostname))
    );
  } catch {
    return false;
  }
};

const endpointSchema = z
  .string()
  .max(1000, "Unsupported push service")
  .refine(isPushEndpoint, "Unsupported push service");

// Base64url keys from PushSubscription.toJSON(): p256dh is a 65-byte public
// key, auth a 16-byte secret.
const base64Url = (min: number, max: number) =>
  z
    .string()
    .min(min, "Invalid push subscription")
    .max(max, "Invalid push subscription")
    .regex(/^[A-Za-z0-9_-]+=*$/, "Invalid push subscription");

// POST /api/push: this device's push subscription.
const pushSubscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: base64Url(80, 100), auth: base64Url(16, 32) }),
});

// DELETE /api/push: the device to turn off.
const pushEndpointSchema = z.object({ endpoint: endpointSchema });

export { pushSubscriptionSchema, pushEndpointSchema };
