import { createHash } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./db";
import { clientIp, sendError } from "./http";

// How many requests each limit allows per window. The counters live in
// Postgres (private.rate_limits), because function instances share nothing.
const LIMITS = {
  // By IP address, before anyone is logged in. Supabase's own limits only see
  // Vercel's addresses, since every call goes through this API. Everyone on
  // one home network shares an IP.
  login: { max: 20, windowSeconds: 5 * 60 },
  signup: { max: 5, windowSeconds: 60 * 60 },
  resetEmail: { max: 5, windowSeconds: 60 * 60 },
  google: { max: 20, windowSeconds: 5 * 60 },
  // The contact form: per IP, and for everyone together, so a flood can't
  // fill the inbox or use up Resend's daily allowance.
  contact: { max: 5, windowSeconds: 60 * 60 },
  contactAll: { max: 50, windowSeconds: 24 * 60 * 60 },
  // By user. MFA codes are only 6 digits, so guesses must stay few.
  mfa: { max: 10, windowSeconds: 5 * 60 },
  passwordChange: { max: 5, windowSeconds: 60 * 60 },
  credentials: { max: 20, windowSeconds: 60 * 60 },
  // Growatt may block Vercel's addresses (and so every user) if hammered.
  growattRead: { max: 60, windowSeconds: 10 * 60 },
  growattWrite: { max: 50, windowSeconds: 10 * 60 },
  octopusRead: { max: 60, windowSeconds: 10 * 60 },
  octopusJoin: { max: 10, windowSeconds: 60 * 60 },
  // Sync now can write the inverter.
  automationRun: { max: 10, windowSeconds: 10 * 60 },
  export: { max: 10, windowSeconds: 60 * 60 },
  // The activity page, 50 entries a request as the user scrolls.
  activity: { max: 60, windowSeconds: 10 * 60 },
  // Can check the current password, so guesses must stay few.
  accountDelete: { max: 5, windowSeconds: 60 * 60 },
} satisfies Record<string, { max: number; windowSeconds: number }>;

type LimitName = keyof typeof LIMITS;

// Counts one request against a limit for subject (a user id or IP address).
// Returns 0 to go ahead, otherwise the seconds until the limit resets.
const countHit = async (name: LimitName, subject: string) => {
  const { max, windowSeconds } = LIMITS[name];
  // Hashed, so the table never holds IP addresses.
  const hash = createHash("sha256").update(subject).digest("hex").slice(0, 32);
  const [{ wait }] = await sql<{ wait: number }[]>`
    select private.rate_limit_hit(${`${name}:${hash}`}, ${max}, ${windowSeconds}) as wait`;
  return wait;
};

// countHit for a JSON endpoint. Returns true to go ahead, or false after
// responding 429 with Retry-After.
const rateLimit = async (
  res: VercelResponse,
  name: LimitName,
  subject: string,
) => {
  const wait = await countHit(name, subject);
  if (wait === 0) return true;
  res.setHeader("Retry-After", String(wait));
  sendError(res, 429, "rate_limited", "Too many attempts, try again later");
  return false;
};

// For endpoints used before login. Vercel always sets the IP; "unknown" is
// only for local development.
const limitByIp = (req: VercelRequest, res: VercelResponse, name: LimitName) =>
  rateLimit(res, name, clientIp(req) ?? "unknown");

export { countHit, rateLimit, limitByIp };
