import { z, ZodError, type ZodTypeAny } from "zod";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { sendError, type ErrorDetail } from "./response";

// ---------------------------------------------------------------------------
// Shared request validation building blocks for /api/v1.
//
// Dates & timezones: all date-only filters (?date=, ?start_date=, ?end_date=)
// are interpreted as calendar dates (YYYY-MM-DD, no timezone conversion —
// this matches how `service_date`/`join_date`/etc. are already stored as SQL
// `date` columns, not timestamps). All timestamp fields in responses
// (createdAt, updatedAt, expiresAt, ...) are serialized as UTC ISO 8601
// (e.g. 2026-07-19T08:30:00.000Z), which is what `JSON.stringify(Date)`
// already produces — no extra conversion needed.
// ---------------------------------------------------------------------------

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const dateOnlySchema = z
  .string()
  .regex(ISO_DATE_ONLY, "Must use YYYY-MM-DD format.");

export const idParamSchema = z
  .string()
  .min(1, "A valid id is required.");

export const emailSchema = z
  .string()
  .email("Must be a valid email address.");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int("page must be a whole number.").min(1, "page must be at least 1.").default(1),
  limit: z.coerce.number().int("limit must be a whole number.").min(1, "limit must be at least 1.").max(200, "limit cannot exceed 200.").default(50),
});

/**
 * Builds a { sort_by, sort_order } schema restricted to an explicit allowlist
 * of columns — callers can never sort by an arbitrary DB column.
 */
export function sortQuerySchema(allowedFields: readonly [string, ...string[]], defaultField?: string) {
  return z.object({
    sort_by: z.enum(allowedFields).default(defaultField ?? allowedFields[0]),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
  });
}

export const dateRangeQuerySchema = z.object({
  start_date: dateOnlySchema.optional(),
  end_date: dateOnlySchema.optional(),
}).refine(
  (val) => !val.start_date || !val.end_date || val.start_date <= val.end_date,
  { message: "start_date must be on or before end_date.", path: ["start_date"] }
);

/**
 * Shared field shape for endpoints that accept either a single ?date= or a
 * ?start_date=&end_date= range, but not both at once. Spread this into a
 * z.object(...) alongside other query fields, then wrap the result with
 * withDateOrRangeRefinement() to enforce the "not both" / ordering rules.
 * Pair with resolveDateRange() to turn the validated query into {from, to}.
 */
export const dateOrRangeShape = {
  date: dateOnlySchema.optional(),
  start_date: dateOnlySchema.optional(),
  end_date: dateOnlySchema.optional(),
};

export function withDateOrRangeRefinement<T extends ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (val: any) => !(val.date && (val.start_date || val.end_date)),
      { message: "Use either 'date' or 'start_date'/'end_date', not both.", path: ["date"] }
    )
    .refine(
      (val: any) => !val.start_date || !val.end_date || val.start_date <= val.end_date,
      { message: "start_date must be on or before end_date.", path: ["start_date"] }
    );
}

export const dateOrRangeQuerySchema = withDateOrRangeRefinement(z.object(dateOrRangeShape));

export function resolveDateRange(input: { date?: string; start_date?: string; end_date?: string }): { from?: string; to?: string } {
  if (input.date) return { from: input.date, to: input.date };
  return { from: input.start_date, to: input.end_date };
}

function issuesToDetails(err: ZodError): ErrorDetail[] {
  return err.issues.map((issue) => ({
    field: issue.path.join(".") || undefined,
    message: issue.message,
  }));
}

/**
 * Validates req.query against `schema`, sending a standardized 400
 * ValidationError on failure. On success, the coerced/defaulted result is
 * stashed on req.validatedQuery for the handler to read.
 */
export function validateQuery<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return sendError(res, "ValidationError", "One or more query parameters are invalid.", issuesToDetails(result.error));
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}

/**
 * Validates req.body against `schema`, sending a standardized 400
 * ValidationError on failure. On success, the parsed result is stashed on
 * req.validatedBody for the handler to read.
 */
export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, "ValidationError", "One or more fields are invalid.", issuesToDetails(result.error));
    }
    (req as any).validatedBody = result.data;
    next();
  };
}

export function validateParams<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return sendError(res, "ValidationError", "One or more route parameters are invalid.", issuesToDetails(result.error));
    }
    (req as any).validatedParams = result.data;
    next();
  };
}
