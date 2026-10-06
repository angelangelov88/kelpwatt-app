import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { deleteAccountSchema } from "../src/lib/authSchemas";
import type { AccountExport, ActivityPage } from "../src/types/Api";
import { audit } from "./_lib/audit";
import { checkOrigin } from "./_lib/csrf";
import { withUser } from "./_lib/db";
import { allowMethods, sendError } from "./_lib/http";
import { rateLimit } from "./_lib/rateLimit";
import { requireUser } from "./_lib/session";
import { requireStepUp } from "./_lib/stepUp";
import { supabaseAdmin } from "./_lib/supabase";
import {
  readAutomationStatus,
  readSettings,
  readStatus,
} from "./_lib/userData";

type AuditRow = {
  created_at: Date;
  action: string;
  details: unknown;
  ip: string | null;
};

// Activity entries per page.
const PAGE_SIZE = 50;

// An audit_log id to continue from: a bigint, sent as text.
const beforeSchema = z
  .string()
  .regex(/^\d{1,18}$/, "Invalid page")
  .optional();

// GET ?view=activity&before=<id> → ActivityPage: the activity log only, newest
//   first. Not recorded as a download.
// GET → AccountExport, as a download.
// DELETE DeleteAccountBody (optional) → 204. Deletes the user; their
//   credentials, settings, automation state and audit log go with them (on
//   delete cascade). Needs a step-up: the MFA code, the current password, or a
//   recent login. Clears the cookies.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "DELETE"]) || !checkOrigin(req, res))
    return;
  const user = await requireUser(req, res);
  if (!user) return;
  const { userId } = user;

  if (req.method === "GET" && req.query.view === "activity") {
    const before = beforeSchema.safeParse(req.query.before);
    if (!before.success) {
      sendError(res, 400, "invalid_input", "Invalid page");
      return;
    }
    if (!(await rateLimit(res, "activity", userId))) return;
    // One more than a page, to tell whether there's another.
    const rows = await withUser(
      userId,
      (tx) => tx<(AuditRow & { id: string })[]>`
        select id::text as id, created_at, action, details, host(ip) as ip
        from private.audit_log
        where ${before.data ?? null}::bigint is null
          or id < ${before.data ?? null}::bigint
        -- audit_log.id, not the text alias above: as text, "99" sorts before "118".
        order by audit_log.id desc
        limit ${PAGE_SIZE + 1}`,
    );
    const entries = rows.slice(0, PAGE_SIZE);
    const body: ActivityPage = {
      entries: entries.map((r) => ({
        id: r.id,
        at: r.created_at.toISOString(),
        action: r.action,
        details: r.details,
        ip: r.ip,
      })),
      nextBefore: rows.length > PAGE_SIZE ? (entries.at(-1)?.id ?? null) : null,
    };
    res.setHeader("Cache-Control", "private, no-store");
    res.json(body);
    return;
  }

  if (req.method === "GET") {
    if (!(await rateLimit(res, "export", userId))) return;
    // getUser asks Supabase, so it's current.
    const [{ data, error }, factors] = await Promise.all([
      user.supabase.auth.getUser(),
      user.supabase.auth.mfa.listFactors(),
    ]);
    if (error || factors.error) {
      sendError(res, 401, "unauthenticated", "Please log in");
      return;
    }
    const { settings, automation, credentials, rows } = await withUser(
      userId,
      async (tx) => {
        await audit(tx, req, userId, "account_exported");
        return {
          settings: await readSettings(tx),
          automation: await readAutomationStatus(tx),
          credentials: await readStatus(tx),
          rows: await tx<AuditRow[]>`
            select created_at, action, details, host(ip) as ip
            from private.audit_log order by id`,
        };
      },
    );
    const body: AccountExport = {
      exportedAt: new Date().toISOString(),
      account: {
        id: userId,
        email: data.user.email ?? null,
        createdAt: data.user.created_at,
        lastSignInAt: data.user.last_sign_in_at ?? null,
        signInMethods: (data.user.identities ?? []).map((i) => i.provider),
        mfaEnrolled: factors.data.totp.length > 0,
      },
      settings,
      automation,
      credentials,
      auditLog: rows.map((r) => ({
        at: r.created_at.toISOString(),
        action: r.action,
        details: r.details,
        ip: r.ip,
      })),
    };
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="growatt-app-data.json"',
    );
    res.json(body);
    return;
  }

  if (!(await rateLimit(res, "accountDelete", userId))) return;
  // The body is optional: without one, a recent login has to do.
  const body = deleteAccountSchema.safeParse(req.body ?? {});
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  if (
    !(await requireStepUp(user, res, {
      currentPassword: body.data.currentPassword,
    }))
  )
    return;
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("account delete failed:", error.code ?? error.name);
    sendError(res, 500, "server_error", "Couldn't delete your account");
    return;
  }
  // Nothing about the user is left to audit, so this log line is the only record.
  console.info("account deleted:", userId);
  // The session died with the user; this clears the cookies.
  await user.supabase.auth.signOut({ scope: "local" });
  res.status(204).end();
};

export default handler;
