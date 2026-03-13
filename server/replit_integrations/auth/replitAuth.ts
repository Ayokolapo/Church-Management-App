import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { storage } from "../../storage";
import { pool } from "../../db";

type UserRoleType = "super_admin" | "branch_admin" | "group_admin" | "cell_leader" | "branch_rep";

const isLocalDev = !process.env.REPL_ID && process.env.NODE_ENV !== "production";
const isPasswordOnlyAuth = !process.env.REPL_ID && process.env.NODE_ENV === "production";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool as any,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isLocalDev,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

async function setupLocalDevAuth(app: Express) {
  const devEmail = process.env.DEV_USER_EMAIL ?? "admin@waypoint.local";
  const devUserId = "dev-local-user";

  // Ensure dev user exists in DB
  await authStorage.upsertUser({
    id: devUserId,
    email: devEmail,
    firstName: "Dev",
    lastName: "Admin",
  });

  // Ensure dev user has super_admin role
  try {
    const existingRole = await storage.getUserRole(devUserId);
    if (!existingRole) {
      await storage.assignUserRole({
        userId: devUserId,
        role: "super_admin",
      });
    }
  } catch (_) {
    // role may already exist — ignore
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Auto-login route for local dev
  app.get("/api/login", (req, res) => {
    const devUser = {
      claims: { sub: devUserId, email: devEmail },
      expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };
    req.login(devUser, (err) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      res.redirect("/");
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
  });

  console.log(`[dev] Local auth enabled. Auto-login as ${devEmail} at /api/login`);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (isLocalDev) {
    await setupLocalDevAuth(app);
    return;
  }

  if (isPasswordOnlyAuth) {
    // No Replit OIDC — auth is handled by /api/signin and /api/signup routes.
    // Just wire up passport session serialization and a logout route.
    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));
    app.get("/api/logout", (req, res) => {
      req.logout(() => res.redirect("/"));
    });
    console.log("[auth] Password-only auth mode (no Replit OIDC)");
    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (isLocalDev) {
    if (!req.isAuthenticated() || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return next();
  }

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const requireRole = (...allowedRoles: UserRoleType[]): RequestHandler => {
  return async (req, res, next) => {
    const user = req.user as any;

    if (!req.isAuthenticated() || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userRole = await storage.getUserRole(user.claims.sub);

      if (!userRole) {
        return res.status(403).json({ message: "Forbidden: No role assigned" });
      }

      if (!allowedRoles.includes(userRole.role as UserRoleType)) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      return next();
    } catch (error) {
      console.error("Error checking user role:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// In-memory cache for role permissions to avoid a DB hit on every request
let permissionsCache: { data: Record<string, string[]>; ts: number } | null = null;
const PERM_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function invalidatePermissionsCache() {
  permissionsCache = null;
}

async function getCachedPermissions(): Promise<Record<string, string[]>> {
  const now = Date.now();
  if (permissionsCache && now - permissionsCache.ts < PERM_CACHE_TTL) {
    return permissionsCache.data;
  }
  const data = await storage.getRolePermissions();
  permissionsCache = { data, ts: now };
  return data;
}

export const requirePermission = (permission: string): RequestHandler => {
  return async (req, res, next) => {
    const user = req.user as any;

    if (!req.isAuthenticated() || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userRole = await storage.getUserRole(user.claims.sub);

      if (!userRole) {
        return res.status(403).json({ message: "Forbidden: No role assigned" });
      }

      // super_admin always has full access
      if (userRole.role === "super_admin") {
        return next();
      }

      const rolePermissions = await getCachedPermissions();
      const rolePerms = rolePermissions[userRole.role] ?? [];

      if (!rolePerms.includes(permission)) {
        return res.status(403).json({ message: `Forbidden: Missing permission '${permission}'` });
      }

      return next();
    } catch (error) {
      console.error("Error checking permissions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};
