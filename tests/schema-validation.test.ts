import test from "node:test";
import assert from "node:assert/strict";

import {
  insertAttendanceSchema,
  insertCellAttendanceSchema,
  insertCommunicationSchema,
  insertFirstTimerSchema,
  insertFollowUpTaskSchema,
  insertMemberSchema,
  insertOutreachSchema,
  insertUserRoleSchema,
} from "../shared/schema.ts";
import { signupSchema } from "../shared/models/auth.ts";

test("signupSchema accepts a complete valid signup payload", () => {
  const result = signupSchema.parse({
    firstName: "Ada",
    lastName: "Okafor",
    gender: "Female",
    address: "12 Palm Street",
    phoneNumber: "08012345678",
    email: "ada@example.com",
    branchId: "branch-1",
    password: "strongpass",
  });

  assert.equal(result.firstName, "Ada");
  assert.equal(result.gender, "Female");
});

test("signupSchema rejects short passwords", () => {
  const result = signupSchema.safeParse({
    firstName: "Ada",
    lastName: "Okafor",
    gender: "Female",
    address: "12 Palm Street",
    phoneNumber: "08012345678",
    email: "ada@example.com",
    branchId: "branch-1",
    password: "short",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, "Password must be at least 8 characters");
  }
});

test("insertMemberSchema accepts a valid member payload", () => {
  const result = insertMemberSchema.parse({
    firstName: "John",
    lastName: "Doe",
    gender: "Male",
    mobilePhone: "08012345678",
    email: "john@example.com",
    address: "Lagos",
    occupation: "Workers",
    joinDate: "2026-03-01",
    cluster: "Faith Cluster",
    followUpWorker: "Grace",
    cell: "Cell A",
    status: "Committed",
    dateOfBirth: "1990-01-01",
    followUpType: "General",
    branchId: "branch-1",
  });

  assert.equal(result.status, "Committed");
  assert.equal(result.occupation, "Workers");
});

test("insertMemberSchema rejects invalid enum values", () => {
  const result = insertMemberSchema.safeParse({
    firstName: "John",
    lastName: "Doe",
    gender: "Other",
    mobilePhone: "08012345678",
    occupation: "Workers",
    joinDate: "2026-03-01",
    cluster: "Faith Cluster",
    status: "Committed",
  });

  assert.equal(result.success, false);
});

test("insertFirstTimerSchema accepts a valid first timer payload", () => {
  const result = insertFirstTimerSchema.parse({
    firstName: "Jane",
    lastName: "Doe",
    gender: "Female",
    mobilePhone: "08087654321",
    email: "jane@example.com",
    address: "Abuja",
    dateOfBirth: "1995-05-05",
    closestAxis: "Airport Road",
    basedInCity: "Yes",
    seeingAgain: "Maybe",
    enjoyedAboutService: ["Sermon", "Prayer"],
    howHeardAbout: "Social media",
    whoInvited: "Peace",
    feedback: "Warm welcome",
    branchId: "branch-2",
  });

  assert.deepEqual(result.enjoyedAboutService, ["Sermon", "Prayer"]);
});

test("insertFirstTimerSchema rejects unsupported discovery channels", () => {
  const result = insertFirstTimerSchema.safeParse({
    firstName: "Jane",
    lastName: "Doe",
    gender: "Female",
    mobilePhone: "08087654321",
    closestAxis: "Airport Road",
    basedInCity: "Yes",
    seeingAgain: "Maybe",
    enjoyedAboutService: ["Sermon"],
    howHeardAbout: "Friend",
  });

  assert.equal(result.success, false);
});

test("insertAttendanceSchema enforces attendance status values", () => {
  const valid = insertAttendanceSchema.safeParse({
    memberId: "member-1",
    serviceDate: "2026-03-08",
    status: "Present",
  });
  const invalid = insertAttendanceSchema.safeParse({
    memberId: "member-1",
    serviceDate: "2026-03-08",
    status: "Late",
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("insertCommunicationSchema requires at least one recipient", () => {
  const result = insertCommunicationSchema.safeParse({
    type: "SMS",
    message: "Prayer meeting tonight",
    recipientCount: 0,
    filters: JSON.stringify({ status: "Committed" }),
    sentBy: "admin",
  });

  assert.equal(result.success, false);
});

test("insertFollowUpTaskSchema rejects unsupported priority levels", () => {
  const valid = insertFollowUpTaskSchema.safeParse({
    memberId: "member-1",
    title: "Call first timer",
    description: "Check in after Sunday service",
    assignedTo: "leader-1",
    dueDate: "2026-03-10",
    status: "Pending",
    priority: "High",
  });
  const invalid = insertFollowUpTaskSchema.safeParse({
    memberId: "member-1",
    title: "Call first timer",
    assignedTo: "leader-1",
    dueDate: "2026-03-10",
    status: "Pending",
    priority: "Critical",
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("insertCellAttendanceSchema requires member and cell identifiers", () => {
  const result = insertCellAttendanceSchema.safeParse({
    cellId: "",
    memberId: "",
    meetingDate: "2026-03-07",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues.length >= 2, true);
  }
});

test("insertOutreachSchema accepts nullable optional fields", () => {
  const result = insertOutreachSchema.parse({
    name: "Samuel",
    phoneNumber: "08055550000",
    clusterId: null,
    address: null,
    notes: null,
    branchId: null,
  });

  assert.equal(result.clusterId, null);
  assert.equal(result.branchId, null);
});

test("insertUserRoleSchema restricts role values", () => {
  const valid = insertUserRoleSchema.safeParse({
    userId: "user-1",
    role: "branch_admin",
    branchId: "branch-1",
  });
  const invalid = insertUserRoleSchema.safeParse({
    userId: "user-1",
    role: "pastor",
    branchId: "branch-1",
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});
