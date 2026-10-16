import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  pushEndpointSchema,
  pushSubscriptionSchema,
} from "../src/lib/pushSchema";
import type { PushConfig } from "../src/types/Api";
import { checkOrigin } from "./_lib/csrf";
import { withUser } from "./_lib/db";
import { allowMethods, sendError } from "./_lib/http";
import { isPushConfigured, vapidPublicKey } from "./_lib/push";
import { rateLimit } from "./_lib/rateLimit";
import { requireUser } from "./_lib/session";

// Devices per user with notifications on. Turning on one more forgets the
// one turned on longest ago.
const MAX_DEVICES = 10;

// GET → PushConfig: the key a browser needs to subscribe.
// POST PushSubscriptionBody → 204. Turns notifications on for this device.
// DELETE PushEndpointBody → 204. Turns them off for this device.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (
    !allowMethods(req, res, ["GET", "POST", "DELETE"]) ||
    !checkOrigin(req, res)
  )
    return;
  const user = await requireUser(req, res);
  if (!user) return;
  const { userId } = user;

  if (!isPushConfigured()) {
    sendError(res, 503, "push_unavailable", "Notifications aren't set up yet");
    return;
  }

  if (req.method === "GET") {
    const body: PushConfig = { publicKey: vapidPublicKey() };
    res.json(body);
    return;
  }

  if (!(await rateLimit(res, "push", userId))) return;

  if (req.method === "DELETE") {
    const body = pushEndpointSchema.safeParse(req.body);
    if (!body.success) {
      sendError(res, 400, "invalid_input", "Invalid push subscription");
      return;
    }
    await withUser(
      userId,
      (tx) =>
        tx`delete from private.push_subscriptions
          where endpoint = ${body.data.endpoint}`,
    );
    res.status(204).end();
    return;
  }

  const body = pushSubscriptionSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid push subscription",
    );
    return;
  }
  const { endpoint, keys } = body.data;
  await withUser(userId, async (tx) => {
    await tx`select private.claim_push_endpoint(${endpoint})`;
    await tx`
      insert into private.push_subscriptions (user_id, endpoint, p256dh, auth)
      values (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
      on conflict (user_id, endpoint) do update set
        p256dh = excluded.p256dh, auth = excluded.auth`;
    await tx`
      delete from private.push_subscriptions where id in (
        select id from private.push_subscriptions
        order by created_at desc, id desc offset ${MAX_DEVICES})`;
  });
  res.status(204).end();
};

export default handler;
