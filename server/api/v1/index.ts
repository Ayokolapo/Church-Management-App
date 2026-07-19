import { Router } from "express";
import { authV1Router } from "./auth.routes";
import { membersV1Router } from "./members.routes";
import { firstTimersV1Router } from "./firstTimers.routes";
import { attendanceV1Router } from "./attendance.routes";
import { usersV1Router } from "./users.routes";
import { reportsV1Router } from "./reports.routes";

// Standardized, versioned API surface for external integrations (Python
// scripts, Power BI, workflow tools, mobile apps, ...). Every route here
// returns { success, data, meta? } / { success:false, error, message,
// details? } and accepts either the browser session cookie or a
// `Authorization: Bearer <token>` header — see server/api/shared/authenticate.ts.
//
// Legacy /api/* routes (server/routes.ts) are untouched and keep serving the
// existing web app with their original response shapes. New integrations
// should build against /api/v1 going forward; see API_DOCUMENTATION.md for
// the deprecation plan for the legacy surface.
export const apiV1Router = Router();

apiV1Router.use("/auth", authV1Router);
apiV1Router.use("/members", membersV1Router);
apiV1Router.use("/first-timers", firstTimersV1Router);
apiV1Router.use("/attendance", attendanceV1Router);
apiV1Router.use("/users", usersV1Router);
apiV1Router.use("/reports", reportsV1Router);
