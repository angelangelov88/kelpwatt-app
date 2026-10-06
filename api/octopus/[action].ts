import join from "../_handlers/octopus/join";
import sessions from "../_handlers/octopus/sessions";
import slots from "../_handlers/octopus/slots";
import { createRouter } from "../_lib/router";

// Up to two Octopus calls of at most 15s each.
export const config = { maxDuration: 40 };

// /api/octopus/<action>. The code is in api/_handlers/octopus/.
export default createRouter({ join, sessions, slots });
