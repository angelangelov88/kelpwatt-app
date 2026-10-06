import type { CronSummary, Handler } from "../../../src/types/Server";
import { checkUser } from "../../_lib/automation";
import { isCronRequest } from "../../_lib/cronAuth";
import { automationUserIds } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";

// Users run in parallel. Most checks stop after asking Octopus (1–2s); one
// that writes the inverter takes 20–30s.
const CONCURRENCY = 5;

// GET with Authorization: Bearer <CRON_SECRET> → CronSummary. One automation
// check for every user with automatic charging on. Only a manual backup (the
// GitHub workflow's Run workflow button): the schedule uses /api/cron/user.
const cronUpdateHandler: Handler = async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  if (!isCronRequest(req)) {
    sendError(res, 401, "unauthorized", "Unauthorized");
    return;
  }
  const userIds = await automationUserIds();
  const summary: CronSummary = {
    users: userIds.length,
    applied: 0,
    unchanged: 0,
    skipped: 0,
    busy: 0,
    paused: 0,
    failed: 0,
  };
  let next = 0;
  const worker = async () => {
    while (next < userIds.length) {
      const { result } = await checkUser(userIds[next++], "schedule");
      summary[result]++;
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, userIds.length) }, worker),
  );
  res.json(summary);
};

export { cronUpdateHandler };
