import { joinSchema } from "../../../src/lib/octopusSchemas";
import { bookHappyHour } from "../../../src/lib/happyHours";
import type { Handler } from "../../../src/types/Server";
import { audit } from "../../_lib/audit";
import { checkOrigin } from "../../_lib/csrf";
import { withUser } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { rateLimit } from "../../_lib/rateLimit";
import { requireUser } from "../../_lib/session";
import { connectOctopus, octopusMessage } from "./connect";

// POST JoinBody → 204. Books one weekend happy hour, which spends the user's
// Octopus tokens. Shares Power Down joining's rate limit. Every attempt is
// recorded in audit_log.
const handler: Handler = async (req, res) => {
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

  let failure: unknown = null;
  try {
    await bookHappyHour(octopus.token, octopus.account, eventCode);
  } catch (err) {
    failure = err ?? new Error("Booking failed");
  }
  await withUser(user.userId, (tx) =>
    audit(tx, req, user.userId, "octopus_book_happy_hour", {
      eventCode,
      ok: !failure,
    }),
  );
  if (failure) {
    console.error(
      "octopus happy hour booking failed:",
      octopusMessage(failure),
    );
    sendError(res, 502, "octopus_failed", octopusMessage(failure));
    return;
  }
  res.status(204).end();
};

export default handler;
