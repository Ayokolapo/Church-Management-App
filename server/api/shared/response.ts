import type { Response } from "express";
import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// Standardized response envelope for the /api/v1 surface.
//
// Success:  { success: true, data, meta? }
// Error:    { success: false, error, message, details? }
//
// Never put stack traces, raw DB errors, password hashes, tokens, or session
// ids in any of these bodies — see handleRouteError below, which is the only
// place unexpected errors should be funneled through.
// ---------------------------------------------------------------------------

export function sendSuccess(res: Response, data: unknown, meta?: Record<string, unknown>, status = 200) {
  const body: Record<string, unknown> = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

export interface PaginationInput {
  page: number;
  limit: number;
  total: number;
}

export function paginationMeta({ page, limit, total }: PaginationInput) {
  return {
    page,
    limit,
    total_records: total,
    total_pages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

export function sendPaginated(
  res: Response,
  data: unknown[],
  pagination: PaginationInput,
  extraMeta?: Record<string, unknown>
) {
  return sendSuccess(res, data, { ...paginationMeta(pagination), ...extraMeta });
}

export type ApiErrorCode =
  | "ValidationError"
  | "Unauthorized"
  | "Forbidden"
  | "NotFound"
  | "Conflict"
  | "InternalError";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  ValidationError: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  InternalError: 500,
};

export interface ErrorDetail {
  field?: string;
  message: string;
}

export function sendError(
  res: Response,
  error: ApiErrorCode,
  message: string,
  details?: ErrorDetail[]
) {
  const body: Record<string, unknown> = { success: false, error, message };
  if (details && details.length > 0) body.details = details;
  return res.status(STATUS_BY_CODE[error]).json(body);
}

function zodIssuesToDetails(err: ZodError): ErrorDetail[] {
  return err.issues.map((issue) => ({
    field: issue.path.join(".") || undefined,
    message: issue.message,
  }));
}

/**
 * Central catch-all for route try/catch blocks. Classifies known error shapes
 * (Zod validation, "X not found", "X already exists/converted" domain errors)
 * into the right envelope, and collapses everything else — DB errors,
 * unexpected exceptions — into a generic InternalError so internals never
 * leak to the client. The real error is always logged server-side first.
 */
export function handleRouteError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof ZodError) {
    return sendError(res, "ValidationError", "One or more fields are invalid.", zodIssuesToDetails(error));
  }

  const message = error instanceof Error ? error.message : undefined;
  if (message && /not found$/i.test(message)) {
    return sendError(res, "NotFound", message);
  }
  if (message && /already (exists|converted)/i.test(message)) {
    return sendError(res, "Conflict", message);
  }

  console.error(`[api/v1] ${fallbackMessage}:`, error);
  return sendError(res, "InternalError", fallbackMessage);
}
