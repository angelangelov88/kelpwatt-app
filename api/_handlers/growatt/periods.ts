import { resetDay } from "../../../src/lib/dailyExport";
import { periodsSchema } from "../../../src/lib/growattSchemas";
import type { PeriodsBody } from "../../../src/types/Api";
import type { SlotParam } from "../../../src/types/Growatt";
import type { Handler, Tx } from "../../../src/types/Server";
import { audit } from "../../_lib/audit";
import { checkOrigin } from "../../_lib/csrf";
import { withUser } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { rateLimit } from "../../_lib/rateLimit";
import { requireUser } from "../../_lib/session";
import { loadGrowatt } from "../../_lib/userConfig";
import { recheckInverter } from "../../_lib/userData";

type Kind = "charge" | "discharge";

// Growatt's and our own error messages are fine to show; an HTML error page isn't.
const growattMessage = (err: unknown) => {
  const message = err instanceof Error ? err.message : "";
  return message && !message.startsWith("Unexpected response")
    ? message.slice(0, 200)
    : "The inverter didn't respond, try again";
};

// A timeout, network error or HTML error page, rather than a rejection.
const isOutage = (err: unknown) =>
  err instanceof TypeError ||
  (err instanceof Error &&
    (err.name === "TimeoutError" ||
      err.message.startsWith("Unexpected response")));

// Export every day: export times just written are the ones to put back after
// Growatt's nightly reset. They're on the inverter now, so the next restore is
// after tonight's.
const keepExportTimes = async (
  tx: Tx,
  kept: { powerRate: number; stopSOC: number; slots: string },
) => {
  const updated = await tx`
    update private.user_settings set keep_export_power = ${kept.powerRate},
      keep_export_stop = ${kept.stopSOC}, keep_export_slots = ${kept.slots}
    where keep_export`;
  if (updated.count > 0)
    await tx`
      update private.automation_state
      set export_restored_on = ${resetDay()}::date`;
};

type Slot = PeriodsBody["slots"][number];

// Export until battery %: remembered so the 5-minute check turns the slot off
// once it ends (today, UK time). It also marks Export every day's first check
// done, so that check can't keep the one-off as the times to put back.
const startOneOff = (tx: Tx, userId: string, { start, end }: Slot) => tx`
  insert into private.automation_state as s
    (user_id, one_off_until, one_off_slot, export_restored_on)
  values (${userId},
    ((now() at time zone 'Europe/London')::date + ${end}::time)
      at time zone 'Europe/London',
    ${`${start}-${end}`}, ${resetDay()}::date)
  on conflict (user_id) do update set
    one_off_until = excluded.one_off_until,
    one_off_slot = excluded.one_off_slot, one_off_failed = false,
    export_restored_on =
      coalesce(s.export_restored_on, excluded.export_restored_on)`;

// Other export times were applied, so there's no one-off to turn off.
const forgetOneOff = (tx: Tx) =>
  tx`update private.automation_state
    set one_off_until = null, one_off_slot = null, one_off_failed = false`;

const toSlotParam = ({ start, end }: Slot) => ({
  startHour: start.slice(0, 2),
  startMin: start.slice(3, 5),
  endHour: end.slice(0, 2),
  endMin: end.slice(3, 5),
});

// /api/growatt/charge (Battery First) and /api/growatt/discharge (Grid First).
// GET → ChargePeriods, read from the inverter (takes 5–15s).
// PUT PeriodsBody → 204. Writes them; every attempt is recorded in audit_log.
const periodsHandler =
  (kind: Kind): Handler =>
  async (req, res) => {
    if (!allowMethods(req, res, ["GET", "PUT"]) || !checkOrigin(req, res))
      return;
    const user = await requireUser(req, res);
    if (!user) return;
    const limit = req.method === "PUT" ? "growattWrite" : "growattRead";
    if (!(await rateLimit(res, limit, user.userId))) return;

    let body: PeriodsBody | null = null;
    if (req.method === "PUT") {
      const parsed = periodsSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(
          res,
          400,
          "invalid_input",
          parsed.error.issues[0]?.message ?? "Invalid input",
        );
        return;
      }
      body = parsed.data;
      if (body.oneOff && kind !== "discharge") {
        sendError(
          res,
          400,
          "invalid_input",
          "Only export times can be one-off",
        );
        return;
      }
    }

    const growatt = await loadGrowatt(user.userId);
    if (!growatt) {
      sendError(
        res,
        409,
        "growatt_not_set_up",
        "Add your Growatt details in Settings first",
      );
      return;
    }
    const { client, serial } = growatt;
    try {
      await client.login();
    } catch {
      sendError(
        res,
        502,
        "growatt_login_failed",
        "Couldn't log in to Growatt. If you changed your Growatt password, update it in Settings",
      );
      return;
    }

    if (!body) {
      try {
        res.json(
          kind === "charge"
            ? await client.fetchChargePeriods(serial)
            : await client.fetchDischargePeriods(serial),
        );
      } catch (err) {
        console.error(`growatt ${kind} read failed:`, growattMessage(err));
        sendError(res, 502, "growatt_failed", growattMessage(err));
      }
      return;
    }

    const { powerRate, stopSOC, slots, oneOff } = body;
    const p: SlotParam[] = Array.from({ length: 6 }, (_, i) => {
      const slot = slots.at(i);
      return slot ? toSlotParam(slot) : null;
    });
    const write =
      kind === "charge" ? client.setChargePeriods : client.setDischargePeriods;
    let failure: unknown = null;
    try {
      await write(
        serial,
        String(powerRate),
        String(stopSOC),
        p[0],
        p[1],
        p[2],
        p[3],
        p[4],
        p[5],
      );
    } catch (err) {
      failure = err ?? new Error("Write failed");
    }
    const slotsText = slots.map((s) => `${s.start}-${s.end}`).join(", ");
    await withUser(user.userId, async (tx) => {
      // Automatic charging no longer knows what the inverter holds.
      if (kind === "charge") await recheckInverter(tx);
      if (kind === "discharge" && !failure) {
        if (oneOff) await startOneOff(tx, user.userId, slots[0]);
        else {
          await keepExportTimes(tx, { powerRate, stopSOC, slots: slotsText });
          await forgetOneOff(tx);
        }
      }
      await audit(tx, req, user.userId, "growatt_write", {
        kind,
        ok: !failure,
        powerRate,
        stopSOC,
        slots: slotsText,
        ...(oneOff && { oneOff }),
      });
    });
    if (failure) {
      console.error(`growatt ${kind} write failed:`, growattMessage(failure));
      sendError(res, 502, "growatt_failed", growattMessage(failure));
      return;
    }
    res.status(204).end();
  };

export { growattMessage, isOutage, periodsHandler, startOneOff, toSlotParam };
