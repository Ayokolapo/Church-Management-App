/**
 * Tests for Branch, Cluster, Cell, and UserRole insert schemas.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  insertBranchSchema,
  insertClusterSchema,
  insertCellSchema,
  insertCellAttendanceSchema,
  insertUserRoleSchema,
  userRoleEnum,
} from "../shared/schema.ts";

// ── Branch ────────────────────────────────────────────────────────────────────

test("insertBranchSchema accepts a valid branch with all fields", () => {
  const result = insertBranchSchema.parse({
    name: "The Waypoint Lekki",
    address: "14 Admiralty Way",
    city: "Lagos",
    description: "Main campus",
  });
  assert.equal(result.name, "The Waypoint Lekki");
  assert.equal(result.city, "Lagos");
});

test("insertBranchSchema accepts a branch with only required name", () => {
  const result = insertBranchSchema.parse({ name: "Abuja Branch" });
  assert.equal(result.name, "Abuja Branch");
  assert.equal(result.address, undefined);
});

test("insertBranchSchema rejects an empty branch name", () => {
  const result = insertBranchSchema.safeParse({ name: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Branch name is required"),
    );
  }
});

test("insertBranchSchema rejects when name is missing entirely", () => {
  const result = insertBranchSchema.safeParse({ city: "Port Harcourt" });
  assert.equal(result.success, false);
});

// ── Cluster ───────────────────────────────────────────────────────────────────

test("insertClusterSchema accepts a valid cluster", () => {
  const result = insertClusterSchema.parse({
    name: "Faith Cluster",
    branchId: "branch-001",
    leader: "Pastor Eze",
  });
  assert.equal(result.name, "Faith Cluster");
  assert.equal(result.branchId, "branch-001");
});

test("insertClusterSchema accepts a cluster without a leader", () => {
  const result = insertClusterSchema.parse({
    name: "Grace Cluster",
    branchId: "branch-001",
  });
  assert.equal(result.leader, undefined);
});

test("insertClusterSchema rejects empty cluster name", () => {
  const result = insertClusterSchema.safeParse({
    name: "",
    branchId: "branch-001",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Cluster name is required"),
    );
  }
});

test("insertClusterSchema rejects missing branchId", () => {
  const result = insertClusterSchema.safeParse({ name: "Love Cluster" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Branch is required"),
    );
  }
});

test("insertClusterSchema rejects empty branchId", () => {
  const result = insertClusterSchema.safeParse({ name: "Hope Cluster", branchId: "" });
  assert.equal(result.success, false);
});

// ── Cell ──────────────────────────────────────────────────────────────────────

test("insertCellSchema accepts a valid cell with leader", () => {
  const result = insertCellSchema.parse({
    name: "Cell Alpha",
    clusterId: "cluster-001",
    leader: "Deacon Samuel",
  });
  assert.equal(result.name, "Cell Alpha");
  assert.equal(result.clusterId, "cluster-001");
});

test("insertCellSchema accepts a cell without a leader", () => {
  const result = insertCellSchema.parse({
    name: "Cell Beta",
    clusterId: "cluster-002",
  });
  assert.equal(result.leader, undefined);
});

test("insertCellSchema rejects empty cell name", () => {
  const result = insertCellSchema.safeParse({
    name: "",
    clusterId: "cluster-001",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Cell name is required"),
    );
  }
});

test("insertCellSchema rejects missing clusterId", () => {
  const result = insertCellSchema.safeParse({ name: "Cell Gamma" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Cluster is required"),
    );
  }
});

test("insertCellSchema rejects empty clusterId", () => {
  const result = insertCellSchema.safeParse({ name: "Cell Delta", clusterId: "" });
  assert.equal(result.success, false);
});

// ── Cell Attendance ───────────────────────────────────────────────────────────

test("insertCellAttendanceSchema accepts a valid record", () => {
  const result = insertCellAttendanceSchema.parse({
    cellId: "cell-001",
    memberId: "member-001",
    meetingDate: "2026-03-07",
  });
  assert.equal(result.cellId, "cell-001");
  assert.equal(result.memberId, "member-001");
});

test("insertCellAttendanceSchema rejects empty cellId", () => {
  const result = insertCellAttendanceSchema.safeParse({
    cellId: "",
    memberId: "member-001",
    meetingDate: "2026-03-07",
  });
  assert.equal(result.success, false);
});

test("insertCellAttendanceSchema rejects empty memberId", () => {
  const result = insertCellAttendanceSchema.safeParse({
    cellId: "cell-001",
    memberId: "",
    meetingDate: "2026-03-07",
  });
  assert.equal(result.success, false);
});

test("insertCellAttendanceSchema rejects missing meetingDate", () => {
  const result = insertCellAttendanceSchema.safeParse({
    cellId: "cell-001",
    memberId: "member-001",
  });
  assert.equal(result.success, false);
});

// ── UserRole ──────────────────────────────────────────────────────────────────

test("userRoleEnum contains all five expected roles", () => {
  const expected = [
    "super_admin",
    "branch_admin",
    "group_admin",
    "cell_leader",
    "branch_rep",
  ];
  assert.deepEqual([...userRoleEnum], expected);
});

test("insertUserRoleSchema accepts every valid role", () => {
  for (const role of userRoleEnum) {
    const result = insertUserRoleSchema.safeParse({
      userId: "user-abc",
      role,
    });
    assert.equal(result.success, true, `Expected success for role: ${role}`);
  }
});

test("insertUserRoleSchema accepts optional branchId and cellId scope", () => {
  const result = insertUserRoleSchema.parse({
    userId: "user-001",
    role: "cell_leader",
    branchId: "branch-001",
    cellId: "cell-001",
  });
  assert.equal(result.branchId, "branch-001");
  assert.equal(result.cellId, "cell-001");
});

test("insertUserRoleSchema accepts group_admin with clusterId", () => {
  const result = insertUserRoleSchema.parse({
    userId: "user-002",
    role: "group_admin",
    branchId: "branch-001",
    clusterId: "cluster-001",
  });
  assert.equal(result.clusterId, "cluster-001");
});

test("insertUserRoleSchema rejects empty userId", () => {
  const result = insertUserRoleSchema.safeParse({
    userId: "",
    role: "branch_admin",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "User is required"),
    );
  }
});

test("insertUserRoleSchema rejects unknown role", () => {
  const result = insertUserRoleSchema.safeParse({
    userId: "user-001",
    role: "deacon",
  });
  assert.equal(result.success, false);
});
