import { z } from "zod";

const SECTORS = ["hospital", "bank", "government"];
const STATUSES = ["waiting", "serving", "done"];

// Loose but sane phone validation: digits, spaces, +, -, parentheses only,
// 7-20 chars. Optional field, so empty string is allowed.
const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .regex(/^[0-9+\-() ]*$/, "Phone number contains invalid characters")
  .optional()
  .or(z.literal(""));

export const joinQueueSchema = z.object({
  userName: z.string().trim().min(1, "userName is required").max(80),
  phone: phoneSchema,
  sector: z.enum(SECTORS, {
    errorMap: () => ({ message: `sector must be one of: ${SECTORS.join(", ")}` })
  }),
  branchName: z.string().trim().min(1, "branchName is required").max(120)
  // NOTE: priority is intentionally NOT accepted here. It used to be a
  // public field, which meant anyone joining could self-assign priority
  // up to 5 and jump the entire queue once priority started actually
  // affecting ordering/wait estimates. Priority can only be set
  // afterwards via the admin-only PATCH /:id/priority route below.
});

export const prioritySchema = z.object({
  priority: z.coerce.number().int().min(0).max(5)
});

export const listQuerySchema = z.object({
  sector: z.enum(SECTORS).optional(),
  branchName: z.string().trim().max(120).optional(),
  status: z.enum(STATUSES).optional().default("waiting")
});

export const predictQuerySchema = z.object({
  sector: z.enum(SECTORS).optional().default("hospital"),
  branchName: z.string().trim().max(120).optional().default("City Center")
});

// Covers both real Mongo ObjectIds (24 hex chars) and the UUIDs used by the
// in-memory dev/demo store, without leaking which storage mode is active.
export const idParamSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9-]+$/, "Invalid id format")
});

/**
 * Express middleware factory: validates `req[source]` against `schema`
 * and replaces it with the parsed (and coerced/defaulted) result. Zod
 * errors are passed to next() so the shared error handler in app.js can
 * turn them into a consistent 400 response.
 */
export function validate(schema, source = "body") {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const error = new Error("Validation failed");
      error.statusCode = 400;
      error.details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }));
      return next(error);
    }
    req[source] = result.data;
    return next();
  };
}
