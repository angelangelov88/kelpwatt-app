import book from "../_handlers/octopus/book";
import cancel from "../_handlers/octopus/cancel";
import happyHours from "../_handlers/octopus/happyHours";
import join from "../_handlers/octopus/join";
import sessions from "../_handlers/octopus/sessions";
import slots from "../_handlers/octopus/slots";
import { createRouter } from "../_lib/router";

// Up to four Octopus calls of at most 15s each (cancel: token, check, cancel,
// check again).
export const config = { maxDuration: 60 };

// /api/octopus/<action>. The code is in api/_handlers/octopus/.
export default createRouter({
  book,
  cancel,
  happyHours,
  join,
  sessions,
  slots,
});
