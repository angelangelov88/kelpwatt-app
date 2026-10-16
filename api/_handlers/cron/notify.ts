import { notificationFor } from "../../../src/lib/notifications";
import type {
  CronNotifySummary,
  Handler,
  PushRow,
  PushSubscriptionRow,
} from "../../../src/types/Server";
import { isCronRequest } from "../../_lib/cronAuth";
import { sql, withUser } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { sendPush } from "../../_lib/push";
import { readSettings } from "../../_lib/userData";

// Audit rows taken at a time, and how long to keep taking more. Anything left
// is sent on the next minute's run.
const BATCH_SIZE = 200;
const BUDGET_MS = 40_000;

// Sends one user's notifications to each of their devices, oldest first.
// Devices the push service says are gone are deleted.
const notifyUser = async (
  userId: string,
  rows: PushRow[],
  summary: CronNotifySummary,
) => {
  const { prefs, devices } = await withUser(userId, async (tx) => ({
    prefs: (await readSettings(tx)).notifications,
    devices: await tx<PushSubscriptionRow[]>`
      select id::text as id, endpoint, p256dh, auth
      from private.push_subscriptions order by id`,
  }));
  const payloads = rows.flatMap((row) => {
    const payload = notificationFor(
      {
        action: row.action,
        details: row.details,
        fromSchedule: row.from_schedule,
      },
      prefs,
    );
    return payload ? [payload] : [];
  });
  if (payloads.length === 0 || devices.length === 0) return;
  const sent: string[] = [];
  const gone: string[] = [];
  await Promise.all(
    devices.map(async (device) => {
      for (const payload of payloads) {
        const result = await sendPush(device, payload);
        if (result === "gone") {
          gone.push(device.id);
          return;
        }
        if (result === "sent") {
          summary.sent++;
          if (!sent.includes(device.id)) sent.push(device.id);
        } else summary.failed++;
      }
    }),
  );
  summary.removed += gone.length;
  if (sent.length === 0 && gone.length === 0) return;
  await withUser(userId, async (tx) => {
    if (sent.length > 0)
      await tx`update private.push_subscriptions set last_sent_at = now()
        where id in ${tx(sent)}`;
    if (gone.length > 0)
      await tx`delete from private.push_subscriptions where id in ${tx(gone)}`;
  });
};

// POST with Authorization: Bearer <CRON_SECRET> → CronNotifySummary. Sends
// push notifications for new activity entries. Supabase's pg_cron calls it
// once a minute, only when there's something to send (private.schedule_push).
const cronNotifyHandler: Handler = async (req, res) => {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!isCronRequest(req)) {
    sendError(res, 401, "unauthorized", "Unauthorized");
    return;
  }
  const started = Date.now();
  const summary: CronNotifySummary = {
    rows: 0,
    sent: 0,
    removed: 0,
    failed: 0,
  };
  while (Date.now() - started < BUDGET_MS) {
    const [{ pending }] = await sql<
      { pending: boolean }[]
    >`select private.push_pending() as pending`;
    if (!pending) break;
    // Taking the rows moves past them, so two runs at once can't both send
    // one, and one that keeps failing doesn't block the rest.
    const rows = await sql<PushRow[]>`
      select id::text as id, user_id, action, details, from_schedule
      from private.take_push_rows(${BATCH_SIZE})`;
    summary.rows += rows.length;
    const byUser = new Map<string, PushRow[]>();
    for (const row of rows)
      byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);
    for (const [userId, userRows] of byUser) {
      try {
        await notifyUser(userId, userRows, summary);
      } catch {
        summary.failed++;
        console.error(`push: user ${userId.slice(0, 8)} failed`);
      }
    }
  }
  res.json(summary);
};

export { cronNotifyHandler };
