/**
 * Extended edge-case tests for member, first-timer, attendance,
 * communication, follow-up task, and outreach schemas.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  insertMemberSchema,
  insertFirstTimerSchema,
  insertAttendanceSchema,
  insertCommunicationSchema,
  insertFollowUpTaskSchema,
  insertOutreachSchema,
} from "../shared/schema.ts";

// ── Member ────────────────────────────────────────────────────────────────────

const BASE_MEMBER = {
  firstName: "Chidi",
  lastName: "Okonkwo",
  gender: "Male",
  mobilePhone: "08012345678",
  occupation: "Workers",
  joinDate: "2026-01-10",
  cluster: "Unity Cluster",
  status: "Crowd",
};

test("insertMemberSchema accepts every valid status", () => {
  const statuses = ["Crowd", "Potential", "Committed", "Worker", "Leader"];
  for (const status of statuses) {
    const result = insertMemberSchema.safeParse({ ...BASE_MEMBER, status });
    assert.equal(result.success, true, `Expected success for status: ${status}`);
  }
});

test("insertMemberSchema accepts every valid occupation", () => {
  const occupations = ["Students", "Workers", "Unemployed", "Self-Employed"];
  for (const occupation of occupations) {
    const result = insertMemberSchema.safeParse({ ...BASE_MEMBER, occupation });
    assert.equal(result.success, true, `Expected success for occupation: ${occupation}`);
  }
});

test("insertMemberSchema accepts every valid archive value", () => {
  const archiveValues = [
    "Active",
    "Relocated",
    "Has a church",
    "Wrong number",
    "Unreachable",
    "Not interested",
  ];
  for (const archive of archiveValues) {
    const result = insertMemberSchema.safeParse({ ...BASE_MEMBER, archive });
    assert.equal(result.success, true, `Expected success for archive: ${archive}`);
  }
});

test("insertMemberSchema rejects invalid archive value", () => {
  const result = insertMemberSchema.safeParse({
    ...BASE_MEMBER,
    archive: "Deceased",
  });
  assert.equal(result.success, false);
});

test("insertMemberSchema accepts null archive (removal from archive)", () => {
  const result = insertMemberSchema.safeParse({ ...BASE_MEMBER, archive: null });
  assert.equal(result.success, true);
});

test("insertMemberSchema accepts both followUpType values", () => {
  for (const followUpType of ["General", "Adhoc"]) {
    const result = insertMemberSchema.safeParse({ ...BASE_MEMBER, followUpType });
    assert.equal(result.success, true, `Expected success for followUpType: ${followUpType}`);
  }
});

test("insertMemberSchema rejects invalid followUpType", () => {
  const result = insertMemberSchema.safeParse({
    ...BASE_MEMBER,
    followUpType: "Urgent",
  });
  assert.equal(result.success, false);
});

test("insertMemberSchema rejects empty mobile phone", () => {
  const result = insertMemberSchema.safeParse({ ...BASE_MEMBER, mobilePhone: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Mobile phone is required"),
    );
  }
});

test("insertMemberSchema rejects missing firstName", () => {
  const { firstName: _, ...rest } = BASE_MEMBER;
  const result = insertMemberSchema.safeParse(rest);
  assert.equal(result.success, false);
});

test("insertMemberSchema rejects malformed email", () => {
  const result = insertMemberSchema.safeParse({
    ...BASE_MEMBER,
    email: "not-an-email",
  });
  assert.equal(result.success, false);
});

test("insertMemberSchema accepts empty string email (field left blank)", () => {
  const result = insertMemberSchema.safeParse({ ...BASE_MEMBER, email: "" });
  assert.equal(result.success, true);
});

test("insertMemberSchema accepts Female gender", () => {
  const result = insertMemberSchema.safeParse({ ...BASE_MEMBER, gender: "Female" });
  assert.equal(result.success, true);
});

test("insertMemberSchema rejects non-binary gender", () => {
  const result = insertMemberSchema.safeParse({ ...BASE_MEMBER, gender: "Non-binary" });
  assert.equal(result.success, false);
});

// ── First Timer ───────────────────────────────────────────────────────────────

const BASE_FIRST_TIMER = {
  firstName: "Amaka",
  lastName: "Eze",
  gender: "Female",
  mobilePhone: "08099887766",
  closestAxis: "Lekki Phase 1",
  basedInCity: "Yes",
  seeingAgain: "Yes",
  enjoyedAboutService: ["Sermon"],
  howHeardAbout: "Oikia member",
};

test("insertFirstTimerSchema accepts all valid basedInCity values", () => {
  for (const basedInCity of ["Yes", "No"]) {
    const result = insertFirstTimerSchema.safeParse({ ...BASE_FIRST_TIMER, basedInCity });
    assert.equal(result.success, true, `Expected success for basedInCity: ${basedInCity}`);
  }
});

test("insertFirstTimerSchema accepts all valid seeingAgain values", () => {
  for (const seeingAgain of ["Yes", "No", "Maybe"]) {
    const result = insertFirstTimerSchema.safeParse({ ...BASE_FIRST_TIMER, seeingAgain });
    assert.equal(result.success, true, `Expected success for seeingAgain: ${seeingAgain}`);
  }
});

test("insertFirstTimerSchema accepts all valid howHeardAbout channels", () => {
  const channels = ["Oikia member", "Social media", "Billboard/Lamp post"];
  for (const howHeardAbout of channels) {
    const result = insertFirstTimerSchema.safeParse({ ...BASE_FIRST_TIMER, howHeardAbout });
    assert.equal(result.success, true, `Expected success for: ${howHeardAbout}`);
  }
});

test("insertFirstTimerSchema rejects unknown discovery channel", () => {
  const result = insertFirstTimerSchema.safeParse({
    ...BASE_FIRST_TIMER,
    howHeardAbout: "Word of mouth",
  });
  assert.equal(result.success, false);
});

test("insertFirstTimerSchema accepts all four enjoyedAboutService values", () => {
  const result = insertFirstTimerSchema.safeParse({
    ...BASE_FIRST_TIMER,
    enjoyedAboutService: ["Sermon", "Prayer", "Praise and worship", "Ambience"],
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.enjoyedAboutService.length, 4);
  }
});

test("insertFirstTimerSchema rejects invalid enjoyedAboutService entry", () => {
  const result = insertFirstTimerSchema.safeParse({
    ...BASE_FIRST_TIMER,
    enjoyedAboutService: ["Sermon", "Choir"],
  });
  assert.equal(result.success, false);
});

test("insertFirstTimerSchema accepts empty enjoyedAboutService array", () => {
  const result = insertFirstTimerSchema.safeParse({
    ...BASE_FIRST_TIMER,
    enjoyedAboutService: [],
  });
  assert.equal(result.success, true);
});

test("insertFirstTimerSchema rejects missing mobilePhone", () => {
  const { mobilePhone: _, ...rest } = BASE_FIRST_TIMER;
  const result = insertFirstTimerSchema.safeParse(rest);
  assert.equal(result.success, false);
});

test("insertFirstTimerSchema rejects invalid gender", () => {
  const result = insertFirstTimerSchema.safeParse({
    ...BASE_FIRST_TIMER,
    gender: "Other",
  });
  assert.equal(result.success, false);
});

// ── Attendance ────────────────────────────────────────────────────────────────

test("insertAttendanceSchema accepts Absent status", () => {
  const result = insertAttendanceSchema.safeParse({
    memberId: "member-1",
    serviceDate: "2026-03-08",
    status: "Absent",
  });
  assert.equal(result.success, true);
});

test("insertAttendanceSchema rejects missing memberId", () => {
  const result = insertAttendanceSchema.safeParse({
    serviceDate: "2026-03-08",
    status: "Present",
  });
  assert.equal(result.success, false);
});

test("insertAttendanceSchema rejects missing serviceDate", () => {
  const result = insertAttendanceSchema.safeParse({
    memberId: "member-1",
    status: "Present",
  });
  assert.equal(result.success, false);
});

// ── Communication ─────────────────────────────────────────────────────────────

test("insertCommunicationSchema accepts an Email type with subject", () => {
  const result = insertCommunicationSchema.safeParse({
    type: "Email",
    subject: "Sunday Reminder",
    message: "Service starts at 9am",
    recipientCount: 50,
    filters: "{}",
    sentBy: "admin-1",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.type, "Email");
    assert.equal(result.data.subject, "Sunday Reminder");
  }
});

test("insertCommunicationSchema accepts SMS type without subject", () => {
  const result = insertCommunicationSchema.safeParse({
    type: "SMS",
    message: "Service is at 9am",
    recipientCount: 10,
    filters: "{}",
    sentBy: "admin-1",
  });
  assert.equal(result.success, true);
});

test("insertCommunicationSchema rejects invalid type", () => {
  const result = insertCommunicationSchema.safeParse({
    type: "WhatsApp",
    message: "Hello!",
    recipientCount: 5,
    filters: "{}",
    sentBy: "admin-1",
  });
  assert.equal(result.success, false);
});

test("insertCommunicationSchema rejects empty message", () => {
  const result = insertCommunicationSchema.safeParse({
    type: "SMS",
    message: "",
    recipientCount: 10,
    filters: "{}",
    sentBy: "admin-1",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Message is required"),
    );
  }
});

test("insertCommunicationSchema rejects empty sentBy", () => {
  const result = insertCommunicationSchema.safeParse({
    type: "SMS",
    message: "Hello",
    recipientCount: 5,
    filters: "{}",
    sentBy: "",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Sender is required"),
    );
  }
});

// ── Follow-up Task ────────────────────────────────────────────────────────────

const BASE_TASK = {
  memberId: "member-1",
  title: "Call back first timer",
  assignedTo: "leader-1",
  dueDate: "2026-03-15",
  status: "Pending",
  priority: "Medium",
};

test("insertFollowUpTaskSchema accepts all valid status values", () => {
  const statuses = ["Pending", "In Progress", "Completed", "Cancelled"];
  for (const status of statuses) {
    const result = insertFollowUpTaskSchema.safeParse({ ...BASE_TASK, status });
    assert.equal(result.success, true, `Expected success for status: ${status}`);
  }
});

test("insertFollowUpTaskSchema accepts all valid priority values", () => {
  const priorities = ["Low", "Medium", "High", "Urgent"];
  for (const priority of priorities) {
    const result = insertFollowUpTaskSchema.safeParse({ ...BASE_TASK, priority });
    assert.equal(result.success, true, `Expected success for priority: ${priority}`);
  }
});

test("insertFollowUpTaskSchema rejects empty title", () => {
  const result = insertFollowUpTaskSchema.safeParse({ ...BASE_TASK, title: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Title is required"),
    );
  }
});

test("insertFollowUpTaskSchema rejects empty assignedTo", () => {
  const result = insertFollowUpTaskSchema.safeParse({ ...BASE_TASK, assignedTo: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Assigned to is required"),
    );
  }
});

test("insertFollowUpTaskSchema accepts optional description", () => {
  const result = insertFollowUpTaskSchema.parse({
    ...BASE_TASK,
    description: "Check in after Sunday service",
  });
  assert.equal(result.description, "Check in after Sunday service");
});

// ── Outreach ──────────────────────────────────────────────────────────────────

test("insertOutreachSchema accepts a minimal record", () => {
  const result = insertOutreachSchema.parse({
    name: "Emmanuel Bello",
    phoneNumber: "08011112222",
  });
  assert.equal(result.name, "Emmanuel Bello");
  assert.equal(result.clusterId, undefined);
});

test("insertOutreachSchema accepts a fully-populated record", () => {
  const result = insertOutreachSchema.parse({
    name: "Blessing Ojo",
    phoneNumber: "08033334444",
    clusterId: "cluster-001",
    address: "5 Grace Avenue",
    notes: "Met at crusade",
    branchId: "branch-001",
  });
  assert.equal(result.clusterId, "cluster-001");
  assert.equal(result.notes, "Met at crusade");
});

test("insertOutreachSchema rejects empty name", () => {
  const result = insertOutreachSchema.safeParse({
    name: "",
    phoneNumber: "08011112222",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Name is required"),
    );
  }
});

test("insertOutreachSchema rejects empty phoneNumber", () => {
  const result = insertOutreachSchema.safeParse({
    name: "Philip Eze",
    phoneNumber: "",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message === "Phone number is required"),
    );
  }
});

test("insertOutreachSchema allows null for optional fields", () => {
  const result = insertOutreachSchema.parse({
    name: "Mary Joseph",
    phoneNumber: "08066667777",
    clusterId: null,
    address: null,
    notes: null,
    branchId: null,
  });
  assert.equal(result.clusterId, null);
  assert.equal(result.address, null);
  assert.equal(result.notes, null);
  assert.equal(result.branchId, null);
});
