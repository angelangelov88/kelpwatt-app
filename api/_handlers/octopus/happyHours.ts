import { fetchHappyHours } from "../../../src/lib/happyHours";
import type { Handler } from "../../../src/types/Server";
import { allowMethods, sendError } from "../../_lib/http";
import { rateLimit } from "../../_lib/rateLimit";
import { requireUser } from "../../_lib/session";
import { connectOctopus, octopusMessage } from "./connect";

// GET → HappyHours: weekend happy hours, which ones the user booked, and their
// token balance.
const handler: Handler = async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await rateLimit(res, "octopusRead", user.userId))) return;
  const octopus = await connectOctopus(user.userId, res);
  if (!octopus) return;
  try {
    // Dates go out as ISO strings.
    res.json(await fetchHappyHours(octopus.token, octopus.account));
  } catch (err) {
    console.error("octopus happy hours failed:", octopusMessage(err));
    sendError(res, 502, "octopus_failed", octopusMessage(err));
  }
};

export default handler;
