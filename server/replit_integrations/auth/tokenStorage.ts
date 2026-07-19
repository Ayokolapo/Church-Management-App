import crypto from "crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import { apiTokens, type ApiToken } from "@shared/models/auth";
import { db } from "../../db";

// ---------------------------------------------------------------------------
// Opaque bearer-token support for external API integrations.
//
// Tokens are generated as 32 random bytes, hex-encoded, and prefixed so they
// are recognizable in logs/config without being guessable. Only the SHA-256
// hash of the raw token is ever persisted — the raw value is shown to the
// caller exactly once, at issuance time.
// ---------------------------------------------------------------------------

const TOKEN_PREFIX = "wpt_"; // "Waypoint token"

export const DEFAULT_TOKEN_TTL_SECONDS = (() => {
  const raw = process.env.API_TOKEN_TTL_SECONDS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 24; // 24h default
})();

export function generateRawToken(): string {
  return `${TOKEN_PREFIX}${crypto.randomBytes(32).toString("hex")}`;
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export type TokenLookupResult =
  | { outcome: "valid"; token: ApiToken }
  | { outcome: "expired" }
  | { outcome: "revoked" }
  | { outcome: "not_found" };

export interface IApiTokenStorage {
  issueToken(userId: string, ttlSeconds?: number): Promise<{ token: ApiToken; rawToken: string }>;
  lookupByRawToken(rawToken: string): Promise<TokenLookupResult>;
  touchLastUsed(tokenId: string): Promise<void>;
  revokeById(tokenId: string, userId: string): Promise<boolean>;
  revokeAllForUser(userId: string): Promise<number>;
}

class ApiTokenStorage implements IApiTokenStorage {
  async issueToken(userId: string, ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS): Promise<{ token: ApiToken; rawToken: string }> {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const [token] = await db
      .insert(apiTokens)
      .values({ userId, tokenHash, expiresAt })
      .returning();

    return { token, rawToken };
  }

  async lookupByRawToken(rawToken: string): Promise<TokenLookupResult> {
    const tokenHash = hashToken(rawToken);
    const [token] = await db.select().from(apiTokens).where(eq(apiTokens.tokenHash, tokenHash));

    if (!token) return { outcome: "not_found" };
    if (token.revokedAt) return { outcome: "revoked" };
    if (token.expiresAt.getTime() <= Date.now()) return { outcome: "expired" };
    return { outcome: "valid", token };
  }

  async touchLastUsed(tokenId: string): Promise<void> {
    await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, tokenId));
  }

  async revokeById(tokenId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(apiTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
      .returning({ id: apiTokens.id });
    return result.length > 0;
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await db
      .update(apiTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt), gt(apiTokens.expiresAt, new Date())))
      .returning({ id: apiTokens.id });
    return result.length;
  }
}

export const apiTokenStorage = new ApiTokenStorage();
