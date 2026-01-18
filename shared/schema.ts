import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth schema
export * from "./models/auth";

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender").notNull(),
  mobilePhone: text("mobile_phone").notNull(),
  email: text("email"),
  address: text("address"),
  occupation: text("occupation").notNull(),
  joinDate: date("join_date").notNull(),
  cluster: text("cluster").notNull(),
  followUpWorker: text("follow_up_worker"),
  cell: text("cell"),
  status: text("status").notNull().default('Crowd'),
  dateOfBirth: date("date_of_birth"),
  followUpType: text("follow_up_type"),
  archive: text("archive"),
  summaryNotes: text("summary_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const firstTimers = pgTable("first_timers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender").notNull(),
  mobilePhone: text("mobile_phone").notNull(),
  email: text("email"),
  address: text("address"),
  dateOfBirth: date("date_of_birth"),
  closestAxis: text("closest_axis").notNull(),
  basedInCity: text("based_in_city").notNull(),
  seeingAgain: text("seeing_again").notNull(),
  enjoyedAboutService: text("enjoyed_about_service").array().notNull(),
  howHeardAbout: text("how_heard_about").notNull(),
  whoInvited: text("who_invited"),
  feedback: text("feedback"),
  convertedToMember: timestamp("converted_to_member"),
  memberId: varchar("member_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: 'cascade' }),
  serviceDate: date("service_date").notNull(),
  status: text("status").notNull().default('Absent'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communications = pgTable("communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'SMS' or 'Email'
  subject: text("subject"),
  message: text("message").notNull(),
  recipientCount: integer("recipient_count").notNull(),
  filters: text("filters").notNull(), // JSON string of applied filters
  sentBy: text("sent_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const followUpTasks = pgTable("follow_up_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: text("assigned_to").notNull(),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default('Pending'),
  priority: text("priority").notNull().default('Medium'),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cells = pgTable("cells", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cluster: text("cluster").notNull(),
  leader: text("leader"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cellAttendance = pgTable("cell_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cellId: varchar("cell_id").notNull().references(() => cells.id, { onDelete: 'cascade' }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: 'cascade' }),
  meetingDate: date("meeting_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Branches table - for different church locations
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User roles enum values
// super_admin: Senior Pastor & Global Head - full access to everything
// branch_admin: Resident Pastors - view all data for their branch
// group_admin: Cell Group/Cluster Leads - manage cell leaders, view assigned cells
// cell_leader: Cell Leaders - basic user, manage their cell only
// branch_rep: Branch Representatives - view/edit branch data, no role management
export const userRoleEnum = ['super_admin', 'branch_admin', 'group_admin', 'cell_leader', 'branch_rep'] as const;

// User roles table - assigns roles to users with optional branch/cell scope
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(), // one of userRoleEnum values
  branchId: varchar("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  clusterId: text("cluster_id"), // for group_admin - which cluster they manage
  cellId: varchar("cell_id").references(() => cells.id, { onDelete: 'cascade' }), // for cell_leader
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMemberSchema = createInsertSchema(members, {
  email: z.string().email().optional().or(z.literal('')),
  mobilePhone: z.string().min(1, "Mobile phone is required"),
  gender: z.enum(['Male', 'Female']),
  occupation: z.enum(['Students', 'Workers', 'Unemployed', 'Self-Employed']),
  status: z.enum(['Crowd', 'Potential', 'Committed', 'Worker', 'Leader']),
  followUpType: z.enum(['General', 'Adhoc']).optional(),
  archive: z.enum(['Relocated', 'Has a church', 'Wrong number', 'Unreachable', 'Not interested']).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFirstTimerSchema = createInsertSchema(firstTimers, {
  email: z.string().email().optional().or(z.literal('')),
  mobilePhone: z.string().min(1, "Mobile phone is required"),
  gender: z.enum(['Male', 'Female']),
  basedInCity: z.enum(['Yes', 'No']),
  seeingAgain: z.enum(['Yes', 'No', 'Maybe']),
  howHeardAbout: z.enum(['Oikia member', 'Social media', 'Billboard/Lamp post']),
  enjoyedAboutService: z.array(z.enum(['Sermon', 'Prayer', 'Praise and worship', 'Ambience'])),
}).omit({
  id: true,
  createdAt: true,
  convertedToMember: true,
  memberId: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance, {
  status: z.enum(['Present', 'Absent']),
}).omit({
  id: true,
  createdAt: true,
});

export const insertCommunicationSchema = createInsertSchema(communications, {
  type: z.enum(['SMS', 'Email']),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  recipientCount: z.number().min(1, "At least one recipient required"),
  filters: z.string(),
  sentBy: z.string().min(1, "Sender is required"),
}).omit({
  id: true,
  createdAt: true,
});

export const insertFollowUpTaskSchema = createInsertSchema(followUpTasks, {
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.string().min(1, "Assigned to is required"),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Cancelled']),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertCellSchema = createInsertSchema(cells, {
  name: z.string().min(1, "Cell name is required"),
  cluster: z.string().min(1, "Cluster is required"),
  leader: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCellAttendanceSchema = createInsertSchema(cellAttendance, {
  cellId: z.string().min(1, "Cell is required"),
  memberId: z.string().min(1, "Member is required"),
  meetingDate: z.string().min(1, "Meeting date is required"),
}).omit({
  id: true,
  createdAt: true,
});

export const insertBranchSchema = createInsertSchema(branches, {
  name: z.string().min(1, "Branch name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles, {
  userId: z.string().min(1, "User is required"),
  role: z.enum(userRoleEnum),
  branchId: z.string().optional(),
  clusterId: z.string().optional(),
  cellId: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type FirstTimer = typeof firstTimers.$inferSelect;
export type InsertFirstTimer = z.infer<typeof insertFirstTimerSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type FollowUpTask = typeof followUpTasks.$inferSelect;
export type InsertFollowUpTask = z.infer<typeof insertFollowUpTaskSchema>;

export type MemberWithAttendanceStats = Member & {
  lastAttended: string | null;
  timesAttended: number;
  timeSinceAttended: number | null;
};

export type FollowUpTaskWithMember = FollowUpTask & {
  member: Member;
};

export type Cell = typeof cells.$inferSelect;
export type InsertCell = z.infer<typeof insertCellSchema>;
export type CellAttendance = typeof cellAttendance.$inferSelect;
export type InsertCellAttendance = z.infer<typeof insertCellAttendanceSchema>;

export type CellWithMembers = Cell & {
  members: Member[];
  memberCount: number;
};

export type CellAttendanceWithMember = CellAttendance & {
  member: Member;
};

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRoleType = typeof userRoleEnum[number];

// User with role information
export type UserWithRole = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: UserRole | null;
  branch: Branch | null;
};
