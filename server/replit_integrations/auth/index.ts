export { setupAuth, isAuthenticated, getSession, requireRole, requirePermission, invalidatePermissionsCache } from "./replitAuth";
export { authStorage, type IAuthStorage } from "./storage";
export { registerAuthRoutes } from "./routes";
