import { z } from "zod";

// Shared by /api/octopus/join, /api/octopus/book and their dashboard cards.
const joinSchema = z.object({
  // An event's code, as /api/octopus/sessions or /api/octopus/happyHours lists it.
  eventCode: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Unknown session"),
});

export { joinSchema };
