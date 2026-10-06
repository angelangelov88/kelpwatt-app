import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { CheckNowResult } from "../src/types/Api";
import { checkUser } from "./_lib/automation";
import { checkOrigin } from "./_lib/csrf";
import { withUser } from "./_lib/db";
import { allowMethods, sendError } from "./_lib/http";
import { rateLimit } from "./_lib/rateLimit";
import { requireUser } from "./_lib/session";
import { readAutomationStatus } from "./_lib/userData";

// A check that writes the inverter takes 20–30s.
export const config = { maxDuration: 60 };

// GET → AutomationStatus: what automatic charging last did.
// POST → CheckNowResult. Sync now: the same check as the 5-minute schedule,
//   but it always reads the inverter, and runs even when paused.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"]) || !checkOrigin(req, res))
    return;
  const user = await requireUser(req, res);
  if (!user) return;
  const { userId } = user;

  if (req.method === "GET") {
    res.json(await withUser(userId, readAutomationStatus));
    return;
  }

  if (!(await rateLimit(res, "automationRun", userId))) return;
  const { result, plan } = await checkUser(userId, "check_now", req);
  if (result === "skipped" || result === "paused") {
    sendError(
      res,
      409,
      "automation_off",
      "Turn on automatic charging in Settings first",
    );
    return;
  }
  const body: CheckNowResult = {
    result,
    plan,
    status: await withUser(userId, readAutomationStatus),
  };
  res.json(body);
};

export default handler;
