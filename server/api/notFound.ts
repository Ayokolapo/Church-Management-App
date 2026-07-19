import type { Request, Response } from "express";
import { sendError } from "./shared/response";

// Mounted as `app.use("/api", apiNotFoundHandler)` — after every real /api
// route (legacy and v1) and before the frontend's SPA catch-all — so any
// unmatched /api/* path returns standardized JSON instead of falling through
// to index.html.
export function apiNotFoundHandler(_req: Request, res: Response) {
  return sendError(res, "NotFound", "The requested API endpoint does not exist.");
}
