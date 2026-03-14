import {
  members,
  firstTimers,
  attendance,
  communications,
  followUpTasks,
  clusters,
  cells,
  cellAttendance,
  branches,
  userRoles,
  rolePermissions,
  users,
  outreach,
  type Member,
  type InsertMember,
  type FirstTimer,
  type InsertFirstTimer,
  type Attendance,
  type InsertAttendance,
  type Communication,
  type InsertCommunication,
  type FollowUpTask,
  type InsertFollowUpTask,
  type MemberWithAttendanceStats,
  type FollowUpTaskWithMember,
  type Cluster,
  type InsertCluster,
  type ClusterWithCells,
  type Cell,
  type InsertCell,
  type CellAttendance,
  type InsertCellAttendance,
  type CellWithMembers,
  type CellAttendanceWithMember,
  type Branch,
  type InsertBranch,
  type UserRole,
  type InsertUserRole,
  type UserWithRole,
  type User,
  type Outreach,
  type InsertOutreach,
  type OutreachWithMemberStatus,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

export interface IStorage {
  // Members
  getMembers(filters?: { status?: string; gender?: string; occupation?: string; cluster?: string }): Promise<MemberWithAttendanceStats[]>;
  getMemberById(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, member: Partial<InsertMember>): Promise<Member>;
  deleteMember(id: string): Promise<void>;
  findDuplicates(): Promise<{ reason: string; members: Member[] }[]>;
  mergeMembers(primaryId: string, duplicateIds: string[]): Promise<Member>;

  // First Timers
  getFirstTimers(): Promise<FirstTimer[]>;
  getFirstTimerById(id: string): Promise<FirstTimer | undefined>;
  createFirstTimer(firstTimer: InsertFirstTimer): Promise<FirstTimer>;
  convertFirstTimerToMember(id: string): Promise<Member>;

  // Attendance
  getAttendance(filters: { memberId?: string; serviceDate?: string }): Promise<Attendance[]>;
  getAttendanceByDate(serviceDate: string): Promise<Record<string, string>>;
  toggleAttendance(memberId: string, serviceDate: string, status: string): Promise<Attendance>;
  markAllPresentByStatus(serviceDate: string, status: string): Promise<void>;

  // Stats
  getStats(): Promise<{
    totalMembers: number;
    totalFirstTimers: number;
    recentAttendance: number;
    newMembersThisMonth: number;
  }>;
  
  // Analytics
  getAttendanceTrends(days?: number): Promise<{ date: string; present: number; total: number }[]>;
  getMemberStatusDistribution(): Promise<{ status: string; count: number }[]>;
  getRecentActivity(): Promise<{
    recentMembers: Member[];
    recentFirstTimers: FirstTimer[];
  }>;
  
  // Communications
  sendBulkCommunication(communication: InsertCommunication): Promise<Communication>;
  getCommunications(): Promise<Communication[]>;
  
  // Follow-up Tasks
  getFollowUpTasks(filters?: { assignedTo?: string; status?: string; memberId?: string }): Promise<FollowUpTaskWithMember[]>;
  getFollowUpTaskById(id: string): Promise<FollowUpTaskWithMember | undefined>;
  createFollowUpTask(task: InsertFollowUpTask): Promise<FollowUpTask>;
  updateFollowUpTask(id: string, task: Partial<InsertFollowUpTask>): Promise<FollowUpTask>;
  deleteFollowUpTask(id: string): Promise<void>;
  completeFollowUpTask(id: string): Promise<FollowUpTask>;
  
  // Clusters
  getClusters(branchId?: string): Promise<ClusterWithCells[]>;
  getClusterById(id: string): Promise<Cluster | undefined>;
  createCluster(cluster: InsertCluster): Promise<Cluster>;
  updateCluster(id: string, cluster: Partial<InsertCluster>): Promise<Cluster>;
  deleteCluster(id: string): Promise<void>;

  // Cells
  getCells(clusterId?: string): Promise<CellWithMembers[]>;
  getCellById(id: string): Promise<CellWithMembers | undefined>;
  createCell(cell: InsertCell): Promise<Cell>;
  updateCell(id: string, cell: Partial<InsertCell>): Promise<Cell>;
  deleteCell(id: string): Promise<void>;
  
  // Cell Attendance
  getCellAttendance(cellId: string, meetingDate?: string): Promise<CellAttendanceWithMember[]>;
  getAllCellAttendance(): Promise<CellAttendance[]>;
  recordCellAttendance(data: InsertCellAttendance): Promise<CellAttendance>;
  deleteCellAttendance(id: string): Promise<void>;
  getCellMeetingDates(cellId: string): Promise<string[]>;
  
  // Branches
  getBranches(): Promise<Branch[]>;
  getBranchById(id: string): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch>;
  deleteBranch(id: string): Promise<void>;
  
  // Users
  getUsers(): Promise<User[]>;
  
  // User Roles
  getAllUsers(): Promise<UserWithRole[]>;
  getAllUserRoles(): Promise<UserRole[]>;
  getUserWithRole(userId: string): Promise<UserWithRole | undefined>;
  getUserRole(userId: string): Promise<UserRole | undefined>;
  assignUserRole(data: InsertUserRole): Promise<UserRole>;
  updateUserRole(id: string, data: Partial<InsertUserRole>): Promise<UserRole>;
  deleteUserRole(id: string): Promise<void>;
  
  // Outreach
  getOutreach(branchId?: string): Promise<OutreachWithMemberStatus[]>;
  getOutreachById(id: string): Promise<Outreach | undefined>;
  createOutreach(data: InsertOutreach): Promise<Outreach>;
  updateOutreach(id: string, data: Partial<InsertOutreach>): Promise<Outreach>;
  deleteOutreach(id: string): Promise<void>;

  // User signup
  getUserByEmail(email: string): Promise<User | undefined>;
  createSignupUser(data: { firstName: string; lastName: string; gender: string; address: string; phoneNumber: string; email: string; branchId: string; passwordHash: string }): Promise<User>;

  // Role Permissions
  getRolePermissions(): Promise<Record<string, string[]>>;
  setRolePermissions(data: Record<string, string[]>): Promise<void>;
}

const ALL_PERMISSIONS = [
  "members.view", "members.create", "members.edit", "members.delete", "members.import",
  "first_timers.view", "first_timers.create", "first_timers.convert",
  "attendance.view", "attendance.edit",
  "cells.view", "cells.manage",
  "communications.send",
  "follow_up_tasks.view", "follow_up_tasks.manage",
  "branches.manage", "users.manage", "roles.manage",
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [...ALL_PERMISSIONS],
  branch_admin: ALL_PERMISSIONS.filter(p => p !== "roles.manage"),
  group_admin: [
    "members.view", "first_timers.view", "first_timers.create",
    "attendance.view", "attendance.edit", "cells.view", "cells.manage",
    "follow_up_tasks.view", "follow_up_tasks.manage",
  ],
  cell_leader: ["members.view", "attendance.view", "cells.view", "follow_up_tasks.view"],
  branch_rep: [
    "members.view", "members.create", "members.edit",
    "first_timers.view", "first_timers.create", "first_timers.convert",
    "attendance.view", "attendance.edit",
  ],
};

export class DatabaseStorage implements IStorage {
  async getMembers(filters?: {
    status?: string;
    statuses?: string[];
    gender?: string;
    occupation?: string;
    cluster?: string;
  }): Promise<MemberWithAttendanceStats[]> {
    const conditions = [];
    if (filters?.statuses && filters.statuses.length > 0) {
      conditions.push(inArray(members.status, filters.statuses));
    } else if (filters?.status) {
      conditions.push(eq(members.status, filters.status));
    }
    if (filters?.gender) {
      conditions.push(eq(members.gender, filters.gender));
    }
    if (filters?.occupation) {
      conditions.push(eq(members.occupation, filters.occupation));
    }
    if (filters?.cluster) {
      conditions.push(eq(members.cluster, filters.cluster));
    }

    let query = db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        gender: members.gender,
        mobilePhone: members.mobilePhone,
        email: members.email,
        address: members.address,
        occupation: members.occupation,
        joinDate: members.joinDate,
        cluster: members.cluster,
        followUpWorker: members.followUpWorker,
        cell: members.cell,
        status: members.status,
        dateOfBirth: members.dateOfBirth,
        followUpType: members.followUpType,
        archive: members.archive,
        summaryNotes: members.summaryNotes,
        branchId: members.branchId,
        createdAt: members.createdAt,
        updatedAt: members.updatedAt,
        lastAttended: sql<string | null>`(
          SELECT MAX(service_date)::text 
          FROM ${attendance} 
          WHERE ${attendance.memberId} = ${members.id} 
          AND ${attendance.status} = 'Present'
        )`,
        timesAttended: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${attendance} 
          WHERE ${attendance.memberId} = ${members.id} 
          AND ${attendance.status} = 'Present'
        )`,
        timeSinceAttended: sql<number | null>`(
          SELECT EXTRACT(DAY FROM NOW() - MAX(service_date))::int 
          FROM ${attendance} 
          WHERE ${attendance.memberId} = ${members.id} 
          AND ${attendance.status} = 'Present'
        )`,
      })
      .from(members);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query;
  }

  async getMemberById(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member || undefined;
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const [member] = await db.insert(members).values(insertMember).returning();
    return member;
  }

  async updateMember(id: string, updateData: Partial<InsertMember>): Promise<Member> {
    const [member] = await db
      .update(members)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning();
    return member;
  }

  async deleteMember(id: string): Promise<void> {
    await db.delete(members).where(eq(members.id, id));
  }

  async findDuplicates(): Promise<{ reason: string; members: Member[] }[]> {
    const allMembers = await db.select().from(members);
    const groups: { reason: string; members: Member[] }[] = [];
    const seenKeys = new Set<string>();

    // Normalize phone to last 10 digits so "08012345678" and "+2348012345678" match
    const normalizePhone = (phone: string) => {
      const d = phone.replace(/\D/g, "");
      return d.length >= 10 ? d.slice(-10) : d;
    };

    const bucket: Record<string, Member[]> = {};

    // Bucket by phone
    for (const m of allMembers) {
      const k = "phone:" + normalizePhone(m.mobilePhone);
      if (!bucket[k]) bucket[k] = [];
      bucket[k].push(m);
    }

    // Bucket by name (first + last, case-insensitive)
    for (const m of allMembers) {
      const k = "name:" + m.firstName.trim().toLowerCase() + "|" + m.lastName.trim().toLowerCase();
      if (!bucket[k]) bucket[k] = [];
      bucket[k].push(m);
    }

    // Bucket by email (skip empty)
    for (const m of allMembers) {
      const email = (m.email ?? "").trim().toLowerCase();
      if (!email) continue;
      const k = "email:" + email;
      if (!bucket[k]) bucket[k] = [];
      bucket[k].push(m);
    }

    for (const key of Object.keys(bucket)) {
      const grp = bucket[key];
      if (grp.length < 2) continue;
      const groupKey = grp.map(m => m.id).sort().join(",");
      if (seenKeys.has(groupKey)) continue;
      seenKeys.add(groupKey);
      const [type, value] = key.split(":");
      const reason =
        type === "phone" ? "Same phone number" :
        type === "name"  ? `Same name (${grp[0].firstName} ${grp[0].lastName})` :
                           `Same email (${value})`;
      groups.push({ reason, members: grp });
    }

    return groups;
  }

  async mergeMembers(primaryId: string, duplicateIds: string[]): Promise<Member> {
    const primary = await this.getMemberById(primaryId);
    if (!primary) throw new Error("Primary member not found");

    const duplicates = (await Promise.all(duplicateIds.map(id => this.getMemberById(id)))).filter(Boolean) as Member[];

    // Fill empty fields on primary from duplicates (first non-empty value wins)
    const mergeableFields: (keyof Member)[] = [
      "email", "address", "dateOfBirth", "followUpWorker", "cell",
      "followUpType", "archive", "branchId",
    ];
    const updates: Partial<InsertMember> = {};
    for (const field of mergeableFields) {
      if (!primary[field]) {
        for (const dup of duplicates) {
          if (dup[field]) {
            (updates as any)[field] = dup[field];
            break;
          }
        }
      }
    }

    // Append merge audit note
    const mergeNote = `Merged from: ${duplicates.map(d => `${d.firstName} ${d.lastName}`).join(", ")} on ${new Date().toLocaleDateString()}`;
    updates.summaryNotes = [primary.summaryNotes, mergeNote].filter(Boolean).join("\n");

    // Re-assign related records for each duplicate
    for (const dupId of duplicateIds) {
      // Attendance: avoid date conflicts
      const primaryAttendance = await db.select({ serviceDate: attendance.serviceDate, status: attendance.status })
        .from(attendance).where(eq(attendance.memberId, primaryId));
      const primaryDateSet = new Set(primaryAttendance.map(a => a.serviceDate));

      const dupAttendance = await db.select().from(attendance).where(eq(attendance.memberId, dupId));
      for (const a of dupAttendance) {
        if (primaryDateSet.has(a.serviceDate)) {
          await db.delete(attendance).where(eq(attendance.id, a.id));
        } else {
          await db.update(attendance).set({ memberId: primaryId }).where(eq(attendance.id, a.id));
          primaryDateSet.add(a.serviceDate);
        }
      }

      // Follow-up tasks
      await db.update(followUpTasks).set({ memberId: primaryId }).where(eq(followUpTasks.memberId, dupId));

      // Cell attendance: avoid same-date conflicts
      const primaryCellAtt = await db.select({ meetingDate: cellAttendance.meetingDate, cellId: cellAttendance.cellId })
        .from(cellAttendance).where(eq(cellAttendance.memberId, primaryId));
      const primaryCellDateSet = new Set(primaryCellAtt.map(a => `${a.cellId}:${a.meetingDate}`));

      const dupCellAtt = await db.select().from(cellAttendance).where(eq(cellAttendance.memberId, dupId));
      for (const a of dupCellAtt) {
        const key = `${a.cellId}:${a.meetingDate}`;
        if (primaryCellDateSet.has(key)) {
          await db.delete(cellAttendance).where(eq(cellAttendance.id, a.id));
        } else {
          await db.update(cellAttendance).set({ memberId: primaryId }).where(eq(cellAttendance.id, a.id));
          primaryCellDateSet.add(key);
        }
      }

      await this.deleteMember(dupId);
    }

    return await this.updateMember(primaryId, updates);
  }

  async getFirstTimers(): Promise<FirstTimer[]> {
    return await db.select().from(firstTimers).orderBy(desc(firstTimers.createdAt));
  }

  async getFirstTimerById(id: string): Promise<FirstTimer | undefined> {
    const [firstTimer] = await db.select().from(firstTimers).where(eq(firstTimers.id, id));
    return firstTimer || undefined;
  }

  async createFirstTimer(insertFirstTimer: InsertFirstTimer): Promise<FirstTimer> {
    const [firstTimer] = await db.insert(firstTimers).values(insertFirstTimer).returning();
    return firstTimer;
  }

  async convertFirstTimerToMember(id: string): Promise<Member> {
    const firstTimer = await this.getFirstTimerById(id);
    if (!firstTimer) {
      throw new Error("First timer not found");
    }

    if (firstTimer.convertedToMember) {
      throw new Error("First timer already converted");
    }

    // Build summary notes from all first-timer data
    const enjoyedServices = firstTimer.enjoyedAboutService?.join(", ") || "N/A";
    const summaryParts = [
      `Converted from first timer on ${new Date().toLocaleDateString()}.`,
      `Based in city: ${firstTimer.basedInCity}.`,
      `Seeing again: ${firstTimer.seeingAgain}.`,
      `Enjoyed: ${enjoyedServices}.`,
      `Heard about us via: ${firstTimer.howHeardAbout}.`,
      `Invited by: ${firstTimer.whoInvited || "N/A"}.`,
    ];
    
    if (firstTimer.feedback) {
      summaryParts.push(`Feedback: ${firstTimer.feedback}`);
    }

    const newMember = await this.createMember({
      firstName: firstTimer.firstName,
      lastName: firstTimer.lastName,
      gender: firstTimer.gender as "Male" | "Female",
      mobilePhone: firstTimer.mobilePhone,
      email: firstTimer.email || "",
      address: firstTimer.address || "",
      occupation: "Workers",
      joinDate: new Date().toISOString().split("T")[0],
      cluster: firstTimer.closestAxis,
      followUpWorker: "",
      cell: "",
      status: "Crowd",
      dateOfBirth: firstTimer.dateOfBirth || "",
      followUpType: "General",
      archive: undefined,
      summaryNotes: summaryParts.join(" "),
      branchId: firstTimer.branchId ?? undefined,
    });

    await db
      .update(firstTimers)
      .set({
        convertedToMember: new Date(),
        memberId: newMember.id,
      })
      .where(eq(firstTimers.id, id));

    return newMember;
  }

  async getAttendance(filters: { memberId?: string; serviceDate?: string }): Promise<Attendance[]> {
    const conditions = [];
    if (filters.memberId) {
      conditions.push(eq(attendance.memberId, filters.memberId));
    }
    if (filters.serviceDate) {
      conditions.push(eq(attendance.serviceDate, filters.serviceDate));
    }
    
    const query = db.select().from(attendance).orderBy(desc(attendance.serviceDate));
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  async getAttendanceByDate(serviceDate: string): Promise<Record<string, string>> {
    const records = await db
      .select()
      .from(attendance)
      .where(eq(attendance.serviceDate, serviceDate));

    const result: Record<string, string> = {};
    for (const record of records) {
      result[record.memberId] = record.status;
    }
    return result;
  }

  async toggleAttendance(
    memberId: string,
    serviceDate: string,
    status: string
  ): Promise<Attendance> {
    const existing = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.memberId, memberId), eq(attendance.serviceDate, serviceDate)));

    if (existing.length > 0) {
      const [updated] = await db
        .update(attendance)
        .set({ status })
        .where(eq(attendance.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(attendance)
        .values({ memberId, serviceDate, status })
        .returning();
      return created;
    }
  }

  async markAllPresentByStatus(serviceDate: string, status: string): Promise<void> {
    const membersList = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.status, status));

    for (const member of membersList) {
      await this.toggleAttendance(member.id, serviceDate, "Present");
    }
  }

  async getStats(): Promise<{
    totalMembers: number;
    totalFirstTimers: number;
    recentAttendance: number;
    newMembersThisMonth: number;
  }> {
    const [totalMembers] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(members);

    const [totalFirstTimers] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(firstTimers)
      .where(sql`${firstTimers.convertedToMember} IS NULL`);

    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());
    const lastSundayStr = lastSunday.toISOString().split("T")[0];

    const [recentAttendance] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(attendance)
      .where(
        and(eq(attendance.serviceDate, lastSundayStr), eq(attendance.status, "Present"))
      );

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const [newMembers] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(members)
      .where(sql`${members.joinDate} >= ${firstDayOfMonth}`);

    return {
      totalMembers: totalMembers.count,
      totalFirstTimers: totalFirstTimers.count,
      recentAttendance: recentAttendance.count,
      newMembersThisMonth: newMembers.count,
    };
  }

  async getAttendanceTrends(days: number = 30): Promise<{ date: string; present: number; total: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const trends = await db
      .select({
        date: attendance.serviceDate,
        present: sql<number>`COUNT(CASE WHEN ${attendance.status} = 'Present' THEN 1 END)::int`,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(attendance)
      .where(
        and(
          sql`${attendance.serviceDate} >= ${startDateStr}`,
          sql`${attendance.serviceDate} <= ${endDateStr}`
        )
      )
      .groupBy(attendance.serviceDate)
      .orderBy(attendance.serviceDate);

    return trends;
  }

  async getMemberStatusDistribution(): Promise<{ status: string; count: number }[]> {
    const distribution = await db
      .select({
        status: members.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(members)
      .groupBy(members.status);

    return distribution;
  }

  async getRecentActivity(): Promise<{
    recentMembers: Member[];
    recentFirstTimers: FirstTimer[];
  }> {
    const recentMembers = await db
      .select()
      .from(members)
      .orderBy(desc(members.createdAt))
      .limit(5);

    const recentFirstTimers = await db
      .select()
      .from(firstTimers)
      .where(sql`${firstTimers.convertedToMember} IS NULL`)
      .orderBy(desc(firstTimers.createdAt))
      .limit(5);

    return { recentMembers, recentFirstTimers };
  }

  async sendBulkCommunication(communication: InsertCommunication): Promise<Communication> {
    // Note: This stores the communication record but doesn't actually send SMS/Email
    // In production, this would integrate with Twilio (SMS) or SendGrid (Email)
    // For now, we just log and save the history
    console.log(`[SIMULATED] Sending ${communication.type} to ${communication.recipientCount} recipients`);
    console.log(`Message: ${communication.message}`);
    
    const [record] = await db.insert(communications).values(communication).returning();
    return record;
  }

  async getCommunications(): Promise<Communication[]> {
    const comms = await db
      .select()
      .from(communications)
      .orderBy(desc(communications.createdAt))
      .limit(50);
    
    return comms;
  }

  async getFollowUpTasks(filters?: {
    assignedTo?: string;
    status?: string;
    memberId?: string;
  }): Promise<FollowUpTaskWithMember[]> {
    const conditions = [];
    if (filters?.assignedTo) {
      conditions.push(eq(followUpTasks.assignedTo, filters.assignedTo));
    }
    if (filters?.status) {
      conditions.push(eq(followUpTasks.status, filters.status));
    }
    if (filters?.memberId) {
      conditions.push(eq(followUpTasks.memberId, filters.memberId));
    }

    let query = db
      .select({
        id: followUpTasks.id,
        memberId: followUpTasks.memberId,
        title: followUpTasks.title,
        description: followUpTasks.description,
        assignedTo: followUpTasks.assignedTo,
        dueDate: followUpTasks.dueDate,
        status: followUpTasks.status,
        priority: followUpTasks.priority,
        completedAt: followUpTasks.completedAt,
        createdAt: followUpTasks.createdAt,
        updatedAt: followUpTasks.updatedAt,
        member: members,
      })
      .from(followUpTasks)
      .innerJoin(members, eq(followUpTasks.memberId, members.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(followUpTasks.dueDate) as any;

    const results = await query;
    return results;
  }

  async getFollowUpTaskById(id: string): Promise<FollowUpTaskWithMember | undefined> {
    const [result] = await db
      .select({
        id: followUpTasks.id,
        memberId: followUpTasks.memberId,
        title: followUpTasks.title,
        description: followUpTasks.description,
        assignedTo: followUpTasks.assignedTo,
        dueDate: followUpTasks.dueDate,
        status: followUpTasks.status,
        priority: followUpTasks.priority,
        completedAt: followUpTasks.completedAt,
        createdAt: followUpTasks.createdAt,
        updatedAt: followUpTasks.updatedAt,
        member: members,
      })
      .from(followUpTasks)
      .innerJoin(members, eq(followUpTasks.memberId, members.id))
      .where(eq(followUpTasks.id, id))
      .limit(1);

    return result;
  }

  async createFollowUpTask(task: InsertFollowUpTask): Promise<FollowUpTask> {
    const [newTask] = await db.insert(followUpTasks).values(task).returning();
    return newTask;
  }

  async updateFollowUpTask(id: string, task: Partial<InsertFollowUpTask>): Promise<FollowUpTask> {
    const [updated] = await db
      .update(followUpTasks)
      .set({ ...task, updatedAt: sql`NOW()` })
      .where(eq(followUpTasks.id, id))
      .returning();

    return updated;
  }

  async deleteFollowUpTask(id: string): Promise<void> {
    await db.delete(followUpTasks).where(eq(followUpTasks.id, id));
  }

  async completeFollowUpTask(id: string): Promise<FollowUpTask> {
    const [completed] = await db
      .update(followUpTasks)
      .set({
        status: "Completed",
        completedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(followUpTasks.id, id))
      .returning();

    return completed;
  }

  // Cluster methods
  async getClusters(branchId?: string): Promise<ClusterWithCells[]> {
    const clusterList = await (branchId
      ? db.select().from(clusters).where(eq(clusters.branchId, branchId)).orderBy(clusters.name)
      : db.select().from(clusters).orderBy(clusters.name));

    return await Promise.all(
      clusterList.map(async (cluster) => {
        const clusterCells = await db.select().from(cells).where(eq(cells.clusterId, cluster.id));
        return { ...cluster, cells: clusterCells, cellCount: clusterCells.length };
      })
    );
  }

  async getClusterById(id: string): Promise<Cluster | undefined> {
    const [cluster] = await db.select().from(clusters).where(eq(clusters.id, id));
    return cluster || undefined;
  }

  async createCluster(cluster: InsertCluster): Promise<Cluster> {
    const [newCluster] = await db.insert(clusters).values(cluster).returning();
    return newCluster;
  }

  async updateCluster(id: string, cluster: Partial<InsertCluster>): Promise<Cluster> {
    const [updated] = await db
      .update(clusters)
      .set({ ...cluster, updatedAt: new Date() })
      .where(eq(clusters.id, id))
      .returning();
    return updated;
  }

  async deleteCluster(id: string): Promise<void> {
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(cells)
      .where(eq(cells.clusterId, id));
    if (count > 0) {
      throw new Error(`Cannot delete cluster with ${count} cell(s). Move or delete cells first.`);
    }
    await db.delete(clusters).where(eq(clusters.id, id));
  }

  async getCells(clusterId?: string): Promise<CellWithMembers[]> {
    const baseQuery = db
      .select({
        id: cells.id,
        name: cells.name,
        clusterId: cells.clusterId,
        leader: cells.leader,
        createdAt: cells.createdAt,
        updatedAt: cells.updatedAt,
        clusterName: clusters.name,
      })
      .from(cells)
      .leftJoin(clusters, eq(cells.clusterId, clusters.id));

    const cellList = await (clusterId
      ? baseQuery.where(eq(cells.clusterId, clusterId)).orderBy(clusters.name, cells.name)
      : baseQuery.orderBy(clusters.name, cells.name));

    return await Promise.all(
      cellList.map(async (cell) => {
        const cellMembers = await db
          .select()
          .from(members)
          .where(eq(members.cell, cell.name));
        return {
          ...cell,
          clusterName: cell.clusterName ?? undefined,
          members: cellMembers,
          memberCount: cellMembers.length,
        };
      })
    );
  }

  async getCellById(id: string): Promise<CellWithMembers | undefined> {
    const [cell] = await db
      .select({
        id: cells.id,
        name: cells.name,
        clusterId: cells.clusterId,
        leader: cells.leader,
        createdAt: cells.createdAt,
        updatedAt: cells.updatedAt,
        clusterName: clusters.name,
      })
      .from(cells)
      .leftJoin(clusters, eq(cells.clusterId, clusters.id))
      .where(eq(cells.id, id));
    if (!cell) return undefined;

    const cellMembers = await db
      .select()
      .from(members)
      .where(eq(members.cell, cell.name));

    return {
      ...cell,
      clusterName: cell.clusterName ?? undefined,
      members: cellMembers,
      memberCount: cellMembers.length,
    };
  }

  async createCell(cell: InsertCell): Promise<Cell> {
    const [newCell] = await db.insert(cells).values(cell).returning();
    return newCell;
  }

  async updateCell(id: string, cell: Partial<InsertCell>): Promise<Cell> {
    const [updated] = await db
      .update(cells)
      .set({ ...cell, updatedAt: new Date() })
      .where(eq(cells.id, id))
      .returning();
    return updated;
  }

  async deleteCell(id: string): Promise<void> {
    await db.delete(cells).where(eq(cells.id, id));
  }

  async getCellAttendance(cellId: string, meetingDate?: string): Promise<CellAttendanceWithMember[]> {
    const conditions = [eq(cellAttendance.cellId, cellId)];
    if (meetingDate) {
      conditions.push(eq(cellAttendance.meetingDate, meetingDate));
    }
    
    const records = await db
      .select({
        id: cellAttendance.id,
        cellId: cellAttendance.cellId,
        memberId: cellAttendance.memberId,
        meetingDate: cellAttendance.meetingDate,
        createdAt: cellAttendance.createdAt,
        member: members,
      })
      .from(cellAttendance)
      .innerJoin(members, eq(cellAttendance.memberId, members.id))
      .where(and(...conditions))
      .orderBy(desc(cellAttendance.meetingDate));
    
    return records;
  }

  async getAllCellAttendance(): Promise<CellAttendance[]> {
    return await db.select().from(cellAttendance).orderBy(desc(cellAttendance.meetingDate));
  }

  async recordCellAttendance(data: InsertCellAttendance): Promise<CellAttendance> {
    const existing = await db
      .select()
      .from(cellAttendance)
      .where(
        and(
          eq(cellAttendance.cellId, data.cellId),
          eq(cellAttendance.memberId, data.memberId),
          eq(cellAttendance.meetingDate, data.meetingDate)
        )
      );
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [record] = await db.insert(cellAttendance).values(data).returning();
    return record;
  }

  async deleteCellAttendance(id: string): Promise<void> {
    await db.delete(cellAttendance).where(eq(cellAttendance.id, id));
  }

  async getCellMeetingDates(cellId: string): Promise<string[]> {
    const dates = await db
      .select({ date: cellAttendance.meetingDate })
      .from(cellAttendance)
      .where(eq(cellAttendance.cellId, cellId))
      .groupBy(cellAttendance.meetingDate)
      .orderBy(desc(cellAttendance.meetingDate));
    
    return dates.map(d => d.date);
  }

  // Branch methods
  async getBranches(): Promise<Branch[]> {
    return await db.select().from(branches).orderBy(branches.name);
  }

  async getBranchById(id: string): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch || undefined;
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    const [newBranch] = await db.insert(branches).values(branch).returning();
    return newBranch;
  }

  async updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch> {
    const [updated] = await db
      .update(branches)
      .set({ ...branch, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    return updated;
  }

  async deleteBranch(id: string): Promise<void> {
    await db.delete(branches).where(eq(branches.id, id));
  }

  // User methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }

  // User Role methods
  async getAllUsers(): Promise<UserWithRole[]> {
    const allUsers = await db.select().from(users).orderBy(users.firstName, users.lastName);
    
    const usersWithRoles: UserWithRole[] = await Promise.all(
      allUsers.map(async (user) => {
        const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
        let branch: Branch | null = null;
        if (role?.branchId) {
          const [b] = await db.select().from(branches).where(eq(branches.id, role.branchId));
          branch = b || null;
        }
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          role: role || null,
          branch,
        };
      })
    );
    
    return usersWithRoles;
  }

  async getUserWithRole(userId: string): Promise<UserWithRole | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return undefined;
    
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    let branch: Branch | null = null;
    if (role?.branchId) {
      const [b] = await db.select().from(branches).where(eq(branches.id, role.branchId));
      branch = b || null;
    }
    
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: role || null,
      branch,
    };
  }

  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    return role || undefined;
  }

  async getAllUserRoles(): Promise<UserRole[]> {
    return await db.select().from(userRoles).orderBy(desc(userRoles.createdAt));
  }

  async assignUserRole(data: InsertUserRole): Promise<UserRole> {
    // Check if user already has a role, if so update it
    const existing = await this.getUserRole(data.userId);
    if (existing) {
      return this.updateUserRole(existing.id, data);
    }
    
    const [role] = await db.insert(userRoles).values(data).returning();
    return role;
  }

  async updateUserRole(id: string, data: Partial<InsertUserRole>): Promise<UserRole> {
    const [updated] = await db
      .update(userRoles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userRoles.id, id))
      .returning();
    return updated;
  }

  async deleteUserRole(id: string): Promise<void> {
    await db.delete(userRoles).where(eq(userRoles.id, id));
  }

  async getOutreach(branchId?: string): Promise<OutreachWithMemberStatus[]> {
    const records = await (branchId
      ? db.select().from(outreach).where(eq(outreach.branchId, branchId)).orderBy(desc(outreach.createdAt))
      : db.select().from(outreach).orderBy(desc(outreach.createdAt)));

    const allMembers = await db.select({ mobilePhone: members.mobilePhone }).from(members);
    const memberPhones = new Set(allMembers.map((m) => m.mobilePhone.replace(/\s+/g, "")));

    const allClusters = await db.select({ id: clusters.id, name: clusters.name }).from(clusters);
    const clusterMap = new Map(allClusters.map((c) => [c.id, c.name]));

    return records.map((r) => ({
      ...r,
      isMember: memberPhones.has(r.phoneNumber.replace(/\s+/g, "")),
      clusterName: r.clusterId ? clusterMap.get(r.clusterId) ?? null : null,
    }));
  }

  async getOutreachById(id: string): Promise<Outreach | undefined> {
    const [record] = await db.select().from(outreach).where(eq(outreach.id, id));
    return record;
  }

  async createOutreach(data: InsertOutreach): Promise<Outreach> {
    const [record] = await db.insert(outreach).values(data).returning();
    return record;
  }

  async updateOutreach(id: string, data: Partial<InsertOutreach>): Promise<Outreach> {
    const [record] = await db
      .update(outreach)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(outreach.id, id))
      .returning();
    return record;
  }

  async deleteOutreach(id: string): Promise<void> {
    await db.delete(outreach).where(eq(outreach.id, id));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createSignupUser(data: { firstName: string; lastName: string; gender: string; address: string; phoneNumber: string; email: string; branchId: string; passwordHash: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      address: data.address,
      phoneNumber: data.phoneNumber,
      email: data.email,
      branchId: data.branchId,
      passwordHash: data.passwordHash,
    }).returning();
    return user;
  }

  async getRolePermissions(): Promise<Record<string, string[]>> {
    const rows = await db.select().from(rolePermissions);
    if (rows.length === 0) {
      // Return defaults on first access
      return DEFAULT_ROLE_PERMISSIONS;
    }
    const result: Record<string, string[]> = {};
    for (const row of rows) {
      if (!result[row.role]) result[row.role] = [];
      result[row.role].push(row.permission);
    }
    return result;
  }

  async setRolePermissions(data: Record<string, string[]>): Promise<void> {
    await db.delete(rolePermissions);
    const rows = Object.entries(data).flatMap(([role, perms]) =>
      perms.map(permission => ({ role, permission }))
    );
    if (rows.length > 0) {
      await db.insert(rolePermissions).values(rows);
    }
  }
}

export const storage = new DatabaseStorage();
