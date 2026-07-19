import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "../../storage";
import { apiTokenStorage } from "../../replit_integrations/auth";
import { sendSuccess, sendError, handleRouteError } from "../shared/response";
import { validateBody, emailSchema } from "../shared/validation";
import { authenticateRequest } from "../shared/authenticate";

export const authV1Router = Router();

const tokenRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "password is required."),
});

// POST /api/v1/auth/token — exchange email+password for a bearer access token.
// Only accounts with a password set (i.e. signed up via /api/signup, or that
// had a password set through the reset flow) can obtain a token; OIDC-only
// accounts get a clear 401 telling them how to set one.
authV1Router.post("/token", validateBody(tokenRequestSchema), async (req, res) => {
  try {
    const { email, password } = (req as any).validatedBody as z.infer<typeof tokenRequestSchema>;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await storage.getUserByEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      return sendError(
        res,
        "Unauthorized",
        "No password is set for this account. Use the 'forgot password' flow to set one before requesting an API token."
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return sendError(res, "Unauthorized", "Invalid email or password.");
    }

    const { token, rawToken } = await apiTokenStorage.issueToken(user.id);
    storage.incrementLoginCount(user.id).catch((err) =>
      console.error("[api/v1] failed to increment login count:", err)
    );

    return sendSuccess(res, {
      access_token: rawToken,
      token_type: "Bearer",
      expires_in: Math.round((token.expiresAt.getTime() - token.createdAt.getTime()) / 1000),
      expires_at: token.expiresAt,
      user: { id: user.id, email: user.email },
    }, undefined, 201);
  } catch (error) {
    return handleRouteError(res, error, "Failed to issue access token.");
  }
});

const revokeRequestSchema = z.object({
  token_id: z.string().optional(),
  all: z.boolean().optional(),
});

// POST /api/v1/auth/revoke — revoke the calling token, an explicit token_id
// owned by the caller, or (all: true) every active token for the account.
authV1Router.post("/revoke", authenticateRequest, validateBody(revokeRequestSchema), async (req, res) => {
  try {
    const { token_id, all } = (req as any).validatedBody as z.infer<typeof revokeRequestSchema>;
    const apiUser = req.apiUser!;

    if (all) {
      const revokedCount = await apiTokenStorage.revokeAllForUser(apiUser.id);
      return sendSuccess(res, { revoked_count: revokedCount });
    }

    const targetId = token_id ?? apiUser.tokenId;
    if (!targetId) {
      return sendError(res, "ValidationError", "One or more fields are invalid.", [
        { field: "token_id", message: "Required when the caller is not authenticated via a bearer token." },
      ]);
    }

    const revoked = await apiTokenStorage.revokeById(targetId, apiUser.id);
    if (!revoked) {
      return sendError(res, "NotFound", "Token not found, not owned by this account, or already revoked.");
    }
    return sendSuccess(res, { revoked: true });
  } catch (error) {
    return handleRouteError(res, error, "Failed to revoke access token.");
  }
});

// GET /api/v1/auth/me — resolve the currently authenticated caller, whether
// authenticated via session cookie or bearer token. Useful for integrations
// to sanity-check a token before using it elsewhere.
authV1Router.get("/me", authenticateRequest, async (req, res) => {
  try {
    const apiUser = req.apiUser!;
    const userWithRole = await storage.getUserWithRole(apiUser.id);
    return sendSuccess(res, userWithRole ?? { id: apiUser.id, email: apiUser.email, role: null, branch: null });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch the current user.");
  }
});
