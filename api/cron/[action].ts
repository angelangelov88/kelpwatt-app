import { cronUpdateHandler } from "../_handlers/cron/update";
import { cronUserHandler } from "../_handlers/cron/user";
import { createRouter } from "../_lib/router";

// A check that writes the inverter takes 20–30s, mostly the inverter's gaps
// between commands.
export const config = { maxDuration: 60 };

// /api/cron/<action>, only for the schedule. The code is in api/_handlers/cron/.
export default createRouter({
  user: cronUserHandler,
  update: cronUpdateHandler,
});
