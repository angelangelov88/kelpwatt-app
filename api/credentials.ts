import { createHash } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  credentialsSchema,
  providerSchema,
} from "../src/lib/credentialSchemas";
import { OctopusError, checkAccount, obtainToken } from "../src/lib/octopusApi";
import type { CredentialsBody } from "../src/types/Api";
import type {
  CredentialProblem,
  CredentialStep,
  OutageKind,
  Tx,
} from "../src/types/Server";
import { isOutage } from "./_handlers/growatt/periods";
import { audit } from "./_lib/audit";
import { checkOrigin } from "./_lib/csrf";
import { withUser } from "./_lib/db";
import { allowMethods, sendError } from "./_lib/http";
import { rateLimit } from "./_lib/rateLimit";
import { requireUser } from "./_lib/session";
import { requireStepUp } from "./_lib/stepUp";
import { growattClientFor, sealSecret } from "./_lib/userConfig";
import { readStatus, recheckInverter } from "./_lib/userData";

// Failed checks allowed per user per hour, so this endpoint can't be used to
// guess other people's Growatt or Octopus logins.
const MAX_FAILED_CHECKS_PER_HOUR = 5;

const md5 = (text: string) => createHash("md5").update(text).digest("hex");

// Only the kind: an error's message can hold the service's raw reply.
const outageKind = (err: unknown): OutageKind => {
  if (!(err instanceof Error)) return "other";
  if (err.name === "TimeoutError" || err.name === "GrowattDeadlineError")
    return "timeout";
  if (err instanceof TypeError) return "network";
  if (
    err instanceof SyntaxError ||
    err.message.startsWith("Unexpected response")
  )
    return "unexpected_reply";
  return "other";
};

const growattUnavailable = (
  step: CredentialStep,
  err: unknown,
): CredentialProblem => ({
  code: "growatt_unavailable",
  message:
    step === "login"
      ? "Growatt didn't respond, try again"
      : "Logged in, but your inverter didn't respond. Check it's online in ShinePhone, then try again",
  step,
  outage: outageKind(err),
});

const octopusUnavailable = (
  step: CredentialStep,
  err: unknown,
): CredentialProblem => ({
  code: "octopus_unavailable",
  message: "Octopus didn't respond, try again",
  step,
  outage: outageKind(err),
});

// Tries the credentials for real (read-only). Returns what went wrong, or null.
const check = async (
  body: CredentialsBody,
): Promise<CredentialProblem | null> => {
  if (body.provider === "growatt") {
    const client = growattClientFor({
      user: body.user,
      passwordMd5: md5(body.password),
    });
    try {
      await client.login();
    } catch (err) {
      if (isOutage(err)) return growattUnavailable("login", err);
      return {
        code: "growatt_login_failed",
        message: "Growatt didn't accept that username and password",
        step: "login",
      };
    }
    try {
      await client.fetchChargePeriods(body.serial);
    } catch (err) {
      if (isOutage(err)) return growattUnavailable("inverter", err);
      return {
        code: "growatt_serial_failed",
        message: `Logged in, but couldn't read inverter ${body.serial}. Check the serial number and that the inverter is online`,
        step: "inverter",
      };
    }
    return null;
  }
  let token: string;
  try {
    token = await obtainToken(body.apiKey);
  } catch (err) {
    if (!(err instanceof OctopusError)) return octopusUnavailable("key", err);
    return {
      code: "octopus_key_failed",
      message: "Octopus didn't accept that API key",
      step: "key",
    };
  }
  try {
    await checkAccount(token, body.account);
  } catch (err) {
    if (!(err instanceof OctopusError))
      return octopusUnavailable("account", err);
    return {
      code: "octopus_account_failed",
      message: `That API key can't see account ${body.account}`,
      step: "account",
    };
  }
  return null;
};

// Encrypts and saves checked credentials, replacing any the user had.
const save = async (tx: Tx, userId: string, body: CredentialsBody) => {
  const [identifier, sealed] =
    body.provider === "growatt"
      ? [
          body.serial,
          sealSecret(userId, "growatt", {
            user: body.user,
            passwordMd5: md5(body.password),
          }),
        ]
      : [body.account, sealSecret(userId, "octopus", { apiKey: body.apiKey })];
  await tx`
    insert into private.user_credentials
      (user_id, provider, ciphertext, iv, auth_tag, key_version, identifier, verified_at)
    values (${userId}, ${body.provider}, ${Buffer.from(sealed.ciphertext)},
      ${Buffer.from(sealed.iv)}, ${Buffer.from(sealed.authTag)},
      ${sealed.keyVersion}, ${identifier}, now())
    on conflict (user_id, provider) do update set
      ciphertext = excluded.ciphertext, iv = excluded.iv,
      auth_tag = excluded.auth_tag, key_version = excluded.key_version,
      identifier = excluded.identifier, verified_at = excluded.verified_at`;
  return identifier;
};

// GET → Credentials.
// PUT CredentialsBody → Credentials. Needs a step-up (the MFA code, the
//   current password, or a recent login); checks the credentials with Growatt
//   or Octopus before saving them encrypted.
// DELETE ?provider=growatt|octopus → Credentials. Also turns automation off.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (
    !allowMethods(req, res, ["GET", "PUT", "DELETE"]) ||
    !checkOrigin(req, res)
  )
    return;
  const user = await requireUser(req, res);
  if (!user) return;
  const { userId } = user;

  if (req.method === "GET") {
    res.json(await withUser(userId, readStatus));
    return;
  }

  if (req.method === "DELETE") {
    const provider = providerSchema.safeParse(req.query.provider);
    if (!provider.success) {
      sendError(res, 400, "invalid_input", "Say which provider to remove");
      return;
    }
    const status = await withUser(userId, async (tx) => {
      const deleted = await tx`
        delete from private.user_credentials where provider = ${provider.data}`;
      if (deleted.count > 0) {
        // Automation and Automatic export need both, so they stop rather than
        // failing every run. Export every day needs Growatt.
        await tx`
          update private.user_settings set automation_enabled = false,
            automatic_export = false,
            keep_export = keep_export and ${provider.data !== "growatt"}`;
        await audit(tx, req, userId, "credentials_deleted", {
          provider: provider.data,
        });
      }
      return readStatus(tx);
    });
    res.json(status);
    return;
  }

  const body = credentialsSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  if (!(await rateLimit(res, "credentials", userId))) return;
  if (
    !(await requireStepUp(user, res, {
      currentPassword: body.data.currentPassword,
    }))
  )
    return;

  const [{ failures }] = await withUser(
    userId,
    (tx) => tx<{ failures: number }[]>`
      select count(*)::int as failures from private.audit_log
      where action = 'credentials_check_failed'
        and created_at > now() - interval '1 hour'`,
  );
  if (failures >= MAX_FAILED_CHECKS_PER_HOUR) {
    sendError(res, 429, "rate_limited", "Too many attempts, try again later");
    return;
  }

  const problem = await check(body.data);
  if (problem) {
    const { outage } = problem;
    // Codes only, never what was entered or the service's reply.
    console.error(
      "credentials check failed:",
      problem.code,
      problem.step,
      outage ?? "",
      `user ${userId.slice(0, 8)}`,
    );
    // Not answering is logged apart, so it doesn't count as a failed check.
    await withUser(userId, (tx) =>
      audit(
        tx,
        req,
        userId,
        outage ? "credentials_check_unavailable" : "credentials_check_failed",
        {
          provider: body.data.provider,
          reason: problem.code,
          step: problem.step,
          ...(outage && { outage }),
        },
      ),
    );
    sendError(res, outage ? 502 : 400, problem.code, problem.message);
    return;
  }

  const status = await withUser(userId, async (tx) => {
    const identifier = await save(tx, userId, body.data);
    // New details: a check paused by a refused login can try again.
    await recheckInverter(tx, { unpause: true });
    await audit(tx, req, userId, "credentials_saved", {
      provider: body.data.provider,
      identifier,
    });
    return readStatus(tx);
  });
  res.json(status);
};

export default handler;
