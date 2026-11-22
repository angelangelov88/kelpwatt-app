import {
  canCancel,
  cancelHappyHour,
  fetchHappyHours,
} from "../../../src/lib/happyHours";
import { joinSchema } from "../../../src/lib/octopusSchemas";
import type { CancelResult } from "../../../src/types/Api";
import type { Handler } from "../../../src/types/Server";
import { audit } from "../../_lib/audit";
import { checkOrigin } from "../../_lib/csrf";
import { withUser } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { rateLimit } from "../../_lib/rateLimit";
import { requireUser } from "../../_lib/session";
import { connectOctopus, octopusMessage } from "./connect";

// The check again only starts this long into the request: it can take 15s,
// and the reply and audit row need to fit in the function's 60.
const RECHECK_UNTIL_MS = 35_000;

// POST JoinBody → CancelResult. Cancels one happy hour booking, only before it
// starts. Octopus's reply doesn't show the booking has gone, so the happy hours
// are loaded again afterwards to check. Shares Power Down joining's rate limit.
// Every cancel sent to Octopus is recorded in audit_log.
const handler: Handler = async (req, res) => {
  const startedAt = Date.now();
  if (!allowMethods(req, res, ["POST"]) || !checkOrigin(req, res)) return;
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await rateLimit(res, "octopusJoin", user.userId))) return;
  const body = joinSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  const { eventCode } = body.data;
  const octopus = await connectOctopus(user.userId, res);
  if (!octopus) return;

  // Check it's booked and hasn't started, from Octopus, not the browser.
  let before;
  try {
    before = await fetchHappyHours(octopus.token, octopus.account);
  } catch (err) {
    console.error("octopus happy hours failed:", octopusMessage(err));
    sendError(res, 502, "octopus_failed", octopusMessage(err));
    return;
  }
  const happyHour = before.events.find((h) => h.code === eventCode);
  if (!happyHour?.booked) {
    sendError(res, 409, "not_booked", "That happy hour isn't booked");
    return;
  }
  if (!canCancel(happyHour)) {
    sendError(
      res,
      409,
      "already_started",
      "That happy hour has started, so it can't be cancelled",
    );
    return;
  }

  let failure: unknown = null;
  try {
    await cancelHappyHour(octopus.token, octopus.account, eventCode);
  } catch (err) {
    failure = err ?? new Error("Cancel failed");
  }
  if (failure) {
    await withUser(user.userId, (tx) =>
      audit(tx, req, user.userId, "octopus_cancel_happy_hour", {
        eventCode,
        ok: false,
      }),
    );
    console.error("octopus happy hour cancel failed:", octopusMessage(failure));
    sendError(res, 502, "octopus_failed", octopusMessage(failure));
    return;
  }

  // Load again: the booking should be gone. null if the load failed, there
  // wasn't time, or Octopus didn't send the bookings.
  let after = null;
  if (Date.now() - startedAt < RECHECK_UNTIL_MS)
    try {
      const loaded = await fetchHappyHours(octopus.token, octopus.account);
      if (loaded.bookingsKnown) after = loaded;
    } catch (err) {
      console.error("octopus happy hours recheck failed:", octopusMessage(err));
    }
  const stillBooked =
    after?.events.some((h) => h.code === eventCode && h.booked) ?? false;
  await withUser(user.userId, (tx) =>
    audit(tx, req, user.userId, "octopus_cancel_happy_hour", {
      eventCode,
      ok: !stillBooked,
      confirmed: after !== null && !stillBooked,
    }),
  );
  if (stillBooked) {
    sendError(
      res,
      502,
      "still_booked",
      "Octopus accepted the cancellation, but still shows the happy hour as booked. Load the happy hours again in a minute to check",
    );
    return;
  }
  res.json({
    confirmed: after !== null,
    tokenBalance: after?.tokenBalance ?? null,
  } satisfies CancelResult);
};

export default handler;
