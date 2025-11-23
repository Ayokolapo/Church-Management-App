import {
  members,
  firstTimers,
  attendance,
  type Member,
  type InsertMember,
  type FirstTimer,
  type InsertFirstTimer,
  type Attendance,
  type InsertAttendance,
  type MemberWithAttendanceStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Members
  getMembers(filters?: { status?: string; gender?: string; occupation?: string; cluster?: string }): Promise<MemberWithAttendanceStats[]>;
  getMemberById(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, member: Partial<InsertMember>): Promise<Member>;
  deleteMember(id: string): Promise<void>;

  // First Timers
  getFirstTimers(): Promise<FirstTimer[]>;
  getFirstTimerById(id: string): Promise<FirstTimer | undefined>;
  createFirstTimer(firstTimer: InsertFirstTimer): Promise<FirstTimer>;
  convertFirstTimerToMember(id: string): Promise<Member>;

  // Attendance
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
}

export class DatabaseStorage implements IStorage {
  async getMembers(filters?: {
    status?: string;
    gender?: string;
    occupation?: string;
    cluster?: string;
  }): Promise<MemberWithAttendanceStats[]> {
    const conditions = [];
    if (filters?.status) {
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
}

export const storage = new DatabaseStorage();
