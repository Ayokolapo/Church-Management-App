/**
 * Tests for signup validation schema and auth utility edge cases.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { signupSchema } from "../shared/models/auth.ts";
import { isUnauthorizedError } from "../client/src/lib/auth-utils.ts";

const BASE_SIGNUP = {
  firstName: "Grace",
  lastName: "Adeyemi",
  gender: "Female",
  address: "22 Freedom Way, Lagos",
  phoneNumber: "08055556666",
  email: "grace@waypoint.org",
  branchId: "branch-lekki",
  password: "securepass123",
};

// ── signupSchema ──────────────────────────────────────────────────────────────

test("signupSchema accepts Male gender", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, gender: "Male" });
  assert.equal(result.success, true);
});

test("signupSchema accepts Female gender", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, gender: "Female" });
  assert.equal(result.success, true);
});

test("signupSchema rejects non-binary gender", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, gender: "Non-binary" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.path[0], "gender");
  }
});

test("signupSchema rejects missing firstName", () => {
  const { firstName: _, ...rest } = BASE_SIGNUP;
  const result = signupSchema.safeParse(rest);
  assert.equal(result.success, false);
});

test("signupSchema rejects empty firstName", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, firstName: "" });
  assert.equal(result.success, false);
});

test("signupSchema rejects missing lastName", () => {
  const { lastName: _, ...rest } = BASE_SIGNUP;
  const result = signupSchema.safeParse(rest);
  assert.equal(result.success, false);
});

test("signupSchema rejects malformed email", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, email: "not-an-email" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((i) => i.message === "Valid email is required"));
  }
});

test("signupSchema rejects empty address", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, address: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((i) => i.message === "Address is required"));
  }
});

test("signupSchema rejects empty phoneNumber", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, phoneNumber: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((i) => i.message === "Phone number is required"));
  }
});

test("signupSchema rejects empty branchId", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, branchId: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((i) => i.message === "Branch is required"));
  }
});

test("signupSchema rejects password of exactly 7 characters", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, password: "1234567" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Password must be at least 8 characters"),
    );
  }
});

test("signupSchema accepts password of exactly 8 characters", () => {
  const result = signupSchema.safeParse({ ...BASE_SIGNUP, password: "12345678" });
  assert.equal(result.success, true);
});

test("signupSchema returns parsed data with correct types", () => {
  const result = signupSchema.parse(BASE_SIGNUP);
  assert.equal(typeof result.firstName, "string");
  assert.equal(typeof result.password, "string");
  assert.equal(result.email, "grace@waypoint.org");
});

// ── isUnauthorizedError ───────────────────────────────────────────────────────

test("isUnauthorizedError matches exact 401: Unauthorized message", () => {
  assert.equal(isUnauthorizedError(new Error("401: Unauthorized")), true);
});

test("isUnauthorizedError matches 401 with extra text after Unauthorized", () => {
  assert.equal(isUnauthorizedError(new Error("401: Unauthorized access")), true);
});

test("isUnauthorizedError does not match 403 Forbidden", () => {
  assert.equal(isUnauthorizedError(new Error("403: Forbidden")), false);
});

test("isUnauthorizedError does not match 500 errors", () => {
  assert.equal(isUnauthorizedError(new Error("500: Internal Server Error")), false);
});

test("isUnauthorizedError does not match plain text errors", () => {
  assert.equal(isUnauthorizedError(new Error("Unauthorized")), false);
});

test("isUnauthorizedError does not match 401 without Unauthorized keyword", () => {
  assert.equal(isUnauthorizedError(new Error("401: Access denied")), false);
});

test("isUnauthorizedError does not match empty error message", () => {
  assert.equal(isUnauthorizedError(new Error("")), false);
});
