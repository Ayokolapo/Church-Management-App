# The Waypoint — API Documentation

This document covers the **`/api/v1`** surface: a standardized, versioned, integration-friendly API layer built alongside the existing web application's API. It is meant for external systems — Python scripts, Power BI, workflow tools (n8n/Zapier), mobile apps — that cannot rely on a browser session cookie.

## 1. Architecture at a glance

| | Legacy (`/api/*`, e.g. `/api/members`) | v1 (`/api/v1/*`, e.g. `/api/v1/members`) |
|---|---|---|
| Consumers | The React web app only | External integrations + anything new |
| Auth | Session cookie (`connect.sid`) only | Session cookie **or** `Authorization: Bearer` token |
| Response shape | Ad hoc — raw objects/arrays, `{message}`, `{error}` | Always `{ success, data, meta? }` / `{ success:false, error, message, details? }` |
| Status | Unchanged, still serves the web app | New, additive |

**Nothing about `/api/*` (legacy) was changed.** The web app's fetch/`useQuery` calls keep working exactly as before — same URLs, same response bodies. `/api/v1` is a new, parallel surface built on top of the same `storage.ts` data-access layer (no business logic duplicated), so both surfaces stay consistent with the database.

The only two changes that affect `/api/*` legacy behavior at all:
1. An unmatched `/api/*` path (a typo, a route that doesn't exist) now returns a JSON 404 instead of silently falling through to the SPA and returning `index.html`.
2. The global Express error handler no longer re-throws after sending a response (a latent bug that could crash the process on any unhandled route error) and now returns a generic JSON error for `/api` paths instead of occasionally leaking `err.message`.

### Why unknown `/api/*` paths were returning HTML

Route registration order was already correct — `registerRoutes(app)` fully runs (registering every `/api/*` route) before the Vite/static SPA catch-all is wired in (see `server/app.ts`'s `runApp()`). The bug was narrower: there was no explicit "you fell through every route" handler for the `/api` prefix, so an unmatched path (no route matched) continued past `registerRoutes` entirely and landed on the SPA's `app.get("*", ...)`. Fixed by adding `app.use("/api", apiNotFoundHandler)` right after every route registration (legacy and v1) and before the frontend takes over — see `server/api/notFound.ts`, wired in `server/routes.ts`.

## 2. Authentication

### 2.1 Browser session (unchanged)
The web app continues to use `/api/login`, `/api/signin`, `connect.sid`, exactly as before.

### 2.2 Bearer token (new, for external integrations)

**Issue a token** — `POST /api/v1/auth/token`

```json
// Request
{ "email": "user@example.com", "password": "password" }
```

```json
// 201 Response
{
  "success": true,
  "data": {
    "access_token": "wpt_9f2c...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "expires_at": "2026-07-20T09:15:40.475Z",
    "user": { "id": "123", "email": "user@example.com" }
  }
}
```

Only accounts with a password set (i.e. signed up via `/api/signup`, or that used the "forgot password" flow) can obtain a token. Accounts that only ever signed in via Replit OIDC get:

```json
{ "success": false, "error": "Unauthorized", "message": "No password is set for this account. Use the 'forgot password' flow to set one before requesting an API token." }
```

**Use the token** on any protected `/api/v1` route:

```
Authorization: Bearer wpt_9f2c...
```

No cookies, `Origin`, `Referer`, or browser-specific headers are required or checked for bearer-authenticated requests.

**Token lifetime & storage**: tokens are opaque (random, not a JWT), default **24h** lifetime (`API_TOKEN_TTL_SECONDS` env var to change), stored in the `api_tokens` table as a SHA-256 hash only — the raw value is returned exactly once, at issuance. `last_used_at` is updated on each use.

**Revoke a token** — `POST /api/v1/auth/revoke` (requires auth)
```json
{}                      // revokes the token used to authenticate this request
{ "token_id": "..." }   // revokes a specific token owned by the caller (e.g. when calling via session auth)
{ "all": true }         // revokes every active token for the account
```

**Who am I** — `GET /api/v1/auth/me` (session or bearer) → current user + role + branch.

### 2.3 Shared middleware

Every protected `/api/v1` route uses `authenticateRequest` (`server/api/shared/authenticate.ts`), which:
1. Checks for `Authorization: Bearer <token>` first — validates against `api_tokens`, distinguishing **not found** / **expired** / **revoked**.
2. Falls back to the existing Passport session (`connect.sid`) if no bearer header is present.
3. On success, attaches a consistent `req.apiUser = { id, email, authType: "session" | "token" }` regardless of which path was used — route handlers never need to know which auth method was used.
4. On failure (any reason), returns the same standardized body so callers can't enumerate account state from error shape:

```json
{ "success": false, "error": "Unauthorized", "message": "A valid authentication token is required." }
```

`requireApiRole(...roles)` and `requireApiPermission(permission)` layer on top, mirroring the legacy `requireRole`/`requirePermission` checks (403 Forbidden on failure), so v1 endpoints enforce the exact same authorization rules as their legacy counterparts.

## 3. Response envelope

**Success (single resource):**
```json
{ "success": true, "data": { "...": "..." } }
```

**Success (list):**
```json
{
  "success": true,
  "data": [ { "...": "..." } ],
  "meta": { "page": 1, "limit": 50, "total_records": 250, "total_pages": 5 }
}
```

**Error:**
```json
{ "success": false, "error": "ValidationError", "message": "One or more fields are invalid.", "details": [{ "field": "start_date", "message": "Must use YYYY-MM-DD format." }] }
```

`error` is always one of: `ValidationError` (400), `Unauthorized` (401), `Forbidden` (403), `NotFound` (404), `Conflict` (409), `InternalError` (500). `details` is only present for validation failures. Stack traces, raw DB errors, password hashes, tokens, and session ids are never included — unexpected exceptions are logged server-side and replaced with a generic `InternalError` message (`server/api/shared/response.ts`'s `handleRouteError`).

## 4. Query parameters (list endpoints)

| Param | Applies to | Notes |
|---|---|---|
| `page`, `limit` | all list endpoints | `limit` capped at 200 |
| `search` | members, first-timers, users | substring match on name/phone/email fields |
| `sort_by`, `sort_order` | members, first-timers, users | **allowlisted per endpoint** — see below, `sort_order` is `asc`/`desc` |
| `date` | members (`join_date`), first-timers (`created_at`), attendance (`service_date`) | single calendar day |
| `start_date`, `end_date` | same fields as `date` | range; mutually exclusive with `date` — using both returns a `ValidationError` |
| `status`, `gender`, `occupation`, `cluster` | members | exact match |
| `seeing_again` | first-timers | `Yes`/`No`/`Maybe` |
| `member_id`, `status` | attendance | exact match, `status` is `Present`/`Absent` |

Sort allowlists (arbitrary DB columns can never be requested):
- **members**: `firstName`, `lastName`, `joinDate`, `status`, `createdAt`, `updatedAt`
- **first-timers**: `firstName`, `lastName`, `createdAt`, `seeingAgain`
- **users**: `firstName`, `lastName`, `email`

Invalid values on any query parameter return `400 ValidationError` with a `details[]` entry naming the offending field — never silently ignored or coerced to a default.

## 5. Dates & timezones

- All **timestamp** fields in responses (`createdAt`, `updatedAt`, `expiresAt`, ...) are serialized as **UTC ISO 8601** (`2026-07-19T08:30:00.000Z`) — this is `Date`'s native `JSON.stringify` behavior, no extra conversion applied.
- All **date-only** filters (`date`, `start_date`, `end_date`) are interpreted as **calendar dates, no timezone conversion** — they're compared directly against SQL `date` columns (`join_date`, `service_date`) or, for first-timers, against `created_at` using UTC day boundaries. There is no "local timezone" concept anywhere in this API; treat every date as UTC.

## 6. Endpoint reference

Base URL: `/api/v1`

### Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/token` | none | issue access token |
| POST | `/auth/revoke` | session or bearer | revoke token(s) |
| GET | `/auth/me` | session or bearer | current user + role |

### Members (permission: `members.view`/`create`/`edit`/`delete`)
| Method | Path | Notes |
|---|---|---|
| GET | `/members` | paginated, search/sort/filter/date-range |
| GET | `/members/:id` | |
| POST | `/members` | body validated against the same schema as the web app |
| PATCH | `/members/:id` | partial update |
| DELETE | `/members/:id` | |

### First timers (permission: `first_timers.view`/`create`/`convert`)
| Method | Path | Notes |
|---|---|---|
| GET | `/first-timers` | paginated, search/sort/filter/date-range |
| GET | `/first-timers/:id` | |
| POST | `/first-timers` | |
| PATCH | `/first-timers/:id` | |
| POST | `/first-timers/:id/convert` | converts to a member |

### Attendance (permission: `attendance.view`/`edit`)
| Method | Path | Notes |
|---|---|---|
| GET | `/attendance` | paginated; filter by `member_id`, `status`, `date`/range |
| POST | `/attendance` | create/update one member's status for a service date |

### Users (permission: `users.manage` for the list)
| Method | Path | Notes |
|---|---|---|
| GET | `/users` | paginated (in-memory — small table), search/sort |
| GET | `/users/:id` | any authenticated caller — returns role + branch |

### Reports — for BI tools, `super_admin` only (mirrors legacy `/api/reporting/*`)
| Method | Path | Notes |
|---|---|---|
| GET | `/reports/members` | paginated |
| GET | `/reports/first-timers` | paginated, date-range |
| GET | `/reports/attendance` | paginated, date-range |
| GET | `/reports/follow-up-tasks` | paginated |
| GET | `/reports/cells` | unpaginated (small table) |
| GET | `/reports/branches` | unpaginated |
| GET | `/reports/clusters` | unpaginated |
| GET | `/reports/users` | unpaginated, passwords/reset tokens stripped |

## 7. What's still legacy-only (deprecation plan)

Per the brief, existing `/api/*` routes remain available for backward compatibility. The following resources have **not** been ported to `/api/v1` in this pass and still require the session cookie: follow-up-tasks (outside of `/reports`), clusters, cells, cell-attendance, branches (outside of `/reports`), outreach, communications, role-permissions, and the `/api/admin/*` SMTP/email-template/notification endpoints.

**Recommended plan**: port these in the same pattern established here (thin `server/api/v1/*.routes.ts` files reusing existing `storage.ts` methods, `authenticateRequest` + `requireApiPermission`/`requireApiRole`, `sendSuccess`/`sendPaginated`/`handleRouteError`) as they're needed by an integration. Once all resources have a v1 equivalent and integrations have migrated off legacy routes, the legacy routes can be removed — no forced timeline is set here since the web app itself still depends on them.

## 8. New environment variable

`API_TOKEN_TTL_SECONDS` (optional) — access token lifetime in seconds. Defaults to `86400` (24h) if unset or invalid.

## 9. Files added/changed

- `shared/models/auth.ts` — `api_tokens` table
- `server/replit_integrations/auth/tokenStorage.ts` — token generate/hash/lookup/revoke
- `server/api/shared/{response,validation,authenticate}.ts` — envelope helpers, zod validation, shared auth middleware
- `server/api/v1/{auth,members,firstTimers,attendance,users,reports}.routes.ts` + `index.ts`
- `server/api/notFound.ts` — JSON 404 for unmatched `/api/*` paths
- `server/routes.ts` — mounts `/api/v1` and the JSON 404 handler after all legacy routes
- `server/app.ts` — fixed the global error handler's dead `throw err` after response-sent, and made it return JSON (not leak `err.message`) for `/api` paths
- `server/storage.ts` — added `sortBy`/`sortOrder` (allowlisted) to `getMembers`/`getFirstTimers`, `joinDateFrom`/`joinDateTo` to `getMembers`, and a new `getAttendanceList` (paginated) — the pre-existing `getAttendance`/`getAttendanceByDate` used by legacy routes are untouched
