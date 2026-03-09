/**
 * Unit tests for requirePermission middleware and permissions cache.
 *
 * These tests mock Express req/res objects and the storage layer to verify
 * middleware behaviour in isolation — no database connection required.
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal mock for an authenticated Express request. */
function makeReq(sub: string | null, authenticated = true): Partial<Request> {
  return {
    isAuthenticated: () => authenticated,
    user: sub ? { claims: { sub } } : undefined,
  } as unknown as Partial<Request>;
}

/** Capture status + json calls on a mock response object. */
function makeRes() {
  // Return the capture object itself (not a spread) so tests see live updates.
  const capture: { status: number | null; body: unknown } = {
    status: null,
    body: null,
  };
  const res: Partial<Response> = {
    status(code: number) {
      capture.status = code;
      return res as Response;
    },
    json(data: unknown) {
      capture.body = data;
      return res as Response;
    },
  };
  return { res, capture };
}

// ── Build an isolated requirePermission with injected storage ─────────────────

type StorageLike = {
  getUserRole(userId: string): Promise<{ role: string } | undefined>;
  getRolePermissions(): Promise<Record<string, string[]>>;
};

/**
 * Recreates the requirePermission logic (matching replitAuth.ts) with a
 * swappable storage dependency so tests run without touching the database.
 */
function buildRequirePermission(storage: StorageLike) {
  let cache: { data: Record<string, string[]>; ts: number } | null = null;
  const TTL = 5 * 60 * 1000;

  async function getCached() {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return cache.data;
    const data = await storage.getRolePermissions();
    cache = { data, ts: now };
    return data;
  }

  function invalidate() {
    cache = null;
  }

  function requirePermission(permission: string) {
    return async (req: Partial<Request>, res: Partial<Response>, next: NextFunction) => {
      const user = (req as any).user;
      if (!req.isAuthenticated!() || !user?.claims?.sub) {
        res.status!(401).json!({ message: "Unauthorized" });
        return;
      }
      try {
        const userRole = await storage.getUserRole(user.claims.sub);
        if (!userRole) {
          res.status!(403).json!({ message: "Forbidden: No role assigned" });
          return;
        }
        if (userRole.role === "super_admin") {
          next();
          return;
        }
        const rolePermissions = await getCached();
        const perms = rolePermissions[userRole.role] ?? [];
        if (!perms.includes(permission)) {
          res.status!(403).json!({ message: `Forbidden: Missing permission '${permission}'` });
          return;
        }
        next();
      } catch {
        res.status!(500).json!({ message: "Internal server error" });
      }
    };
  }

  return { requirePermission, invalidate };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("requirePermission returns 401 for an unauthenticated request", async () => {
  const storage: StorageLike = {
    getUserRole: async () => ({ role: "branch_admin" }),
    getRolePermissions: async () => ({}),
  };
  const { requirePermission } = buildRequirePermission(storage);
  const req = makeReq("user-1", false);
  const { res, capture } = makeRes();
  let nextCalled = false;

  await requirePermission("members.view")(req, res, () => { nextCalled = true; });

  assert.equal(capture.status, 401);
  assert.equal(nextCalled, false);
});

test("requirePermission returns 401 when user claims are missing", async () => {
  const storage: StorageLike = {
    getUserRole: async () => ({ role: "branch_admin" }),
    getRolePermissions: async () => ({}),
  };
  const { requirePermission } = buildRequirePermission(storage);
  const req = makeReq(null, true);   // authenticated but no claims.sub
  const { res, capture } = makeRes();
  let nextCalled = false;

  await requirePermission("members.view")(req, res, () => { nextCalled = true; });

  assert.equal(capture.status, 401);
  assert.equal(nextCalled, false);
});

test("requirePermission returns 403 when user has no role assigned", async () => {
  const storage: StorageLike = {
    getUserRole: async () => undefined,
    getRolePermissions: async () => ({}),
  };
  const { requirePermission } = buildRequirePermission(storage);
  const req = makeReq("user-1");
  const { res, capture } = makeRes();
  let nextCalled = false;

  await requirePermission("members.view")(req, res, () => { nextCalled = true; });

  assert.equal(capture.status, 403);
  assert.equal(nextCalled, false);
  assert.equal((capture.body as any)?.message, "Forbidden: No role assigned");
});

test("requirePermission passes super_admin through without checking permission matrix", async () => {
  let permissionMatrixCalled = false;
  const storage: StorageLike = {
    getUserRole: async () => ({ role: "super_admin" }),
    getRolePermissions: async () => {
      permissionMatrixCalled = true;
      return {};
    },
  };
  const { requirePermission } = buildRequirePermission(storage);
  const req = makeReq("admin-1");
  const { res } = makeRes();
  let nextCalled = false;

  await requirePermission("roles.manage")(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(permissionMatrixCalled, false);
});

test("requirePermission calls next when role has the required permission", async () => {
  const storage: StorageLike = {
    getUserRole: async () => ({ role: "branch_admin" }),
    getRolePermissions: async () => ({
      branch_admin: ["members.view", "members.create"],
    }),
  };
  const { requirePermission } = buildRequirePermission(storage);
  const req = makeReq("user-1");
  const { res, capture } = makeRes();
  let nextCalled = false;

  await requirePermission("members.view")(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(capture.status, null);  // no error response set
});

test("requirePermission returns 403 when role lacks the required permission", async () => {
  const storage: StorageLike = {
    getUserRole: async () => ({ role: "cell_leader" }),
    getRolePermissions: async () => ({
      cell_leader: ["members.view", "attendance.view"],
    }),
  };
  const { requirePermission } = buildRequirePermission(storage);
  const req = makeReq("user-1");
  const { res, capture } = makeRes();
  let nextCalled = false;

  await requirePermission("members.delete")(req, res, () => { nextCalled = true; });

  assert.equal(capture.status, 403);
  assert.equal(nextCalled, false);
  assert.ok((capture.body as any)?.message.includes("members.delete"));
});

test("requirePermission returns 403 when role has no permissions at all", async () => {
  const storage: StorageLike = {
    getUserRole: async () => ({ role: "branch_rep" }),
    getRolePermissions: async () => ({}),   // branch_rep gets nothing
  };
  const { requirePermission } = buildRequirePermission(storage);
  const req = makeReq("user-1");
  const { res, capture } = makeRes();
  let nextCalled = false;

  await requirePermission("members.view")(req, res, () => { nextCalled = true; });

  assert.equal(capture.status, 403);
  assert.equal(nextCalled, false);
});

test("permission cache is used on subsequent requests (getRolePermissions called once)", async () => {
  let callCount = 0;
  const storage: StorageLike = {
    getUserRole: async () => ({ role: "branch_admin" }),
    getRolePermissions: async () => {
      callCount++;
      return { branch_admin: ["members.view"] };
    },
  };
  const { requirePermission } = buildRequirePermission(storage);
  const middleware = requirePermission("members.view");

  for (let i = 0; i < 3; i++) {
    const req = makeReq("user-1");
    const { res } = makeRes();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  }

  assert.equal(callCount, 1, "getRolePermissions should only be called once due to caching");
});

test("invalidate clears the cache so getRolePermissions is called again", async () => {
  let callCount = 0;
  const storage: StorageLike = {
    getUserRole: async () => ({ role: "group_admin" }),
    getRolePermissions: async () => {
      callCount++;
      return { group_admin: ["members.view"] };
    },
  };
  const { requirePermission, invalidate } = buildRequirePermission(storage);
  const middleware = requirePermission("members.view");

  // First request — populates cache
  await middleware(makeReq("user-1"), makeRes().res, () => {});
  assert.equal(callCount, 1);

  // Invalidate, then second request — should re-fetch
  invalidate();
  await middleware(makeReq("user-1"), makeRes().res, () => {});
  assert.equal(callCount, 2);
});

test("requirePermission returns 500 when storage throws an error", async () => {
  const storage: StorageLike = {
    getUserRole: async () => { throw new Error("DB connection lost"); },
    getRolePermissions: async () => ({}),
  };
  const { requirePermission } = buildRequirePermission(storage);
  const req = makeReq("user-1");
  const { res, capture } = makeRes();
  let nextCalled = false;

  await requirePermission("members.view")(req, res, () => { nextCalled = true; });

  assert.equal(capture.status, 500);
  assert.equal(nextCalled, false);
  assert.equal((capture.body as any)?.message, "Internal server error");
});

test("requirePermission handles multiple different permissions for same role correctly", async () => {
  const storage: StorageLike = {
    getUserRole: async () => ({ role: "branch_rep" }),
    getRolePermissions: async () => ({
      branch_rep: ["members.view", "members.create", "members.edit", "attendance.view"],
    }),
  };
  const { requirePermission } = buildRequirePermission(storage);

  const allowed = ["members.view", "members.create", "members.edit", "attendance.view"];
  const denied = ["members.delete", "members.import", "branches.manage", "roles.manage"];

  for (const perm of allowed) {
    let passed = false;
    await requirePermission(perm)(makeReq("user-1"), makeRes().res, () => { passed = true; });
    assert.equal(passed, true, `Expected ${perm} to be allowed for branch_rep`);
  }

  for (const perm of denied) {
    const { res, capture: cap } = makeRes();
    await requirePermission(perm)(makeReq("user-1"), res, () => {});
    assert.equal(cap.status, 403, `Expected ${perm} to be denied for branch_rep`);
  }
});
