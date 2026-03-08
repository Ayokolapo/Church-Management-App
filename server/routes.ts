import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemberSchema, insertFirstTimerSchema, insertAttendanceSchema, insertCommunicationSchema, insertFollowUpTaskSchema, insertClusterSchema, insertCellSchema, insertCellAttendanceSchema, insertBranchSchema, insertUserRoleSchema, signupSchema, insertOutreachSchema } from "@shared/schema";
import { ZodError } from "zod";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { setupAuth, registerAuthRoutes, isAuthenticated, requireRole } from "./replit_integrations/auth";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [hashed, salt] = hash.split(".");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Public signup endpoint (no authentication required)
  app.post("/api/signup", async (req, res) => {
    try {
      const validatedData = signupSchema.parse(req.body);

      // Normalize email to lowercase
      const normalizedEmail = validatedData.email.toLowerCase().trim();

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // Hash the password before storing
      const passwordHash = await hashPassword(validatedData.password);

      // Create user with signup data (normalized email)
      const user = await storage.createSignupUser({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        gender: validatedData.gender,
        address: validatedData.address,
        phoneNumber: validatedData.phoneNumber,
        email: normalizedEmail,
        branchId: validatedData.branchId,
        passwordHash,
      });
      res.status(201).json({ message: "Registration successful", user });
    } catch (error: any) {
      console.error("Error during signup:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      } else {
        res.status(500).json({ error: error.message || "Registration failed" });
      }
    }
  });

  // Public sign-in endpoint (email + password)
  app.post("/api/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const normalizedEmail = (email as string).toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Log the user in via passport session
      req.login({ claims: { sub: user.id, email: user.email }, expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, (err) => {
        if (err) return res.status(500).json({ error: "Login failed" });
        res.json({ message: "Login successful" });
      });
    } catch (error: any) {
      console.error("Error during signin:", error);
      res.status(500).json({ error: "Sign in failed" });
    }
  });

  // Public endpoint to get branches for signup form
  app.get("/api/public/branches", async (req, res) => {
    try {
      const branchList = await storage.getBranches();
      res.json(branchList);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/attendance-trends", async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const trends = await storage.getAttendanceTrends(days);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching attendance trends:", error);
      res.status(500).json({ error: "Failed to fetch attendance trends" });
    }
  });

  app.get("/api/analytics/status-distribution", async (req, res) => {
    try {
      const distribution = await storage.getMemberStatusDistribution();
      res.json(distribution);
    } catch (error) {
      console.error("Error fetching status distribution:", error);
      res.status(500).json({ error: "Failed to fetch status distribution" });
    }
  });

  app.get("/api/analytics/recent-activity", async (req, res) => {
    try {
      const activity = await storage.getRecentActivity();
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ error: "Failed to fetch recent activity" });
    }
  });

  // Communications endpoints
  app.post("/api/communications/send", async (req, res) => {
    try {
      const validatedData = insertCommunicationSchema.parse(req.body);
      const communication = await storage.sendBulkCommunication(validatedData);
      res.json(communication);
    } catch (error: any) {
      console.error("Error sending communication:", error);
      res.status(400).json({ error: error.message || "Failed to send communication" });
    }
  });

  app.get("/api/communications", async (req, res) => {
    try {
      const communications = await storage.getCommunications();
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  // Member duplicate detection and merge
  app.get("/api/members/duplicates", async (req, res) => {
    try {
      const groups = await storage.findDuplicates();
      console.log(`[duplicates] found ${groups.length} group(s):`, groups.map(g => `${g.reason} (${g.members.length})`));
      res.json(groups);
    } catch (error) {
      console.error("Error finding duplicates:", error);
      res.status(500).json({ error: "Failed to find duplicates" });
    }
  });

  app.post("/api/members/merge", async (req, res) => {
    try {
      const { primaryId, duplicateIds } = req.body;
      if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
        return res.status(400).json({ error: "primaryId and duplicateIds[] are required" });
      }
      const merged = await storage.mergeMembers(primaryId, duplicateIds);
      res.json(merged);
    } catch (error: any) {
      console.error("Error merging members:", error);
      res.status(500).json({ error: error.message || "Failed to merge members" });
    }
  });

  // Member routes
  app.get("/api/members", async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        gender: req.query.gender as string,
        occupation: req.query.occupation as string,
        cluster: req.query.cluster as string,
      };
      const members = await storage.getMembers(filters);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  // CSV routes must come before :id route to prevent "export", "template", "import" from being matched as IDs
  app.get("/api/members/export", async (req, res) => {
    try {
      const members = await storage.getMembers();
      const csvData = stringify(members, {
        header: true,
        columns: [
          { key: "firstName", header: "First Name" },
          { key: "lastName", header: "Last Name" },
          { key: "gender", header: "Gender" },
          { key: "mobilePhone", header: "Mobile Phone" },
          { key: "email", header: "Email" },
          { key: "address", header: "Address" },
          { key: "occupation", header: "Occupation" },
          { key: "joinDate", header: "Join Date" },
          { key: "cluster", header: "Cluster" },
          { key: "followUpWorker", header: "Follow Up Worker" },
          { key: "cell", header: "Cell" },
          { key: "status", header: "Status" },
          { key: "dateOfBirth", header: "Date of Birth" },
          { key: "followUpType", header: "Follow Up Type" },
          { key: "archive", header: "Archive" },
          { key: "summaryNotes", header: "Summary Notes" },
        ],
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=members.csv");
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting members:", error);
      res.status(500).json({ error: "Failed to export members" });
    }
  });

  app.get("/api/members/template", async (req, res) => {
    try {
      const template = stringify(
        [
          {
            "First Name": "John",
            "Last Name": "Doe",
            "Gender": "Male",
            "Mobile Phone": "+1234567890",
            "Email": "john@example.com",
            "Address": "123 Main St",
            "Occupation": "Workers",
            "Join Date": "2024-01-01",
            "Cluster": "Lekki",
            "Follow Up Worker": "Jane Smith",
            "Cell": "Cell A",
            "Status": "Crowd",
            "Date of Birth": "1990-01-01",
            "Follow Up Type": "General",
            "Archive": "",
            "Summary Notes": "Sample notes",
          },
        ],
        { header: true }
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=members-template.csv");
      res.send(template);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  app.post("/api/members/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const branchId = req.body.branchId;
      if (!branchId || !branchId.trim()) {
        return res.status(400).json({ error: "Branch is required" });
      }

      const csvData = req.file.buffer.toString("utf-8");
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
      }) as Record<string, string>[];

      const failures: { row: number; field: string; reason: string }[] = [];

      const REQUIRED_FIELDS = [
        { csvCol: "First Name", label: "First Name" },
        { csvCol: "Last Name", label: "Last Name" },
        { csvCol: "Gender", label: "Gender" },
        { csvCol: "Mobile Phone", label: "Mobile Phone" },
        { csvCol: "Occupation", label: "Occupation" },
        { csvCol: "Join Date", label: "Join Date" },
        { csvCol: "Cluster", label: "Cluster" },
        { csvCol: "Status", label: "Status" },
      ];

      const ENUM_FIELDS = [
        { csvCol: "Gender", label: "Gender", allowed: ["Male", "Female"] },
        { csvCol: "Occupation", label: "Occupation", allowed: ["Students", "Workers", "Unemployed", "Self-Employed"] },
        { csvCol: "Status", label: "Status", allowed: ["Crowd", "Potential", "Committed", "Worker", "Leader"] },
        { csvCol: "Archive", label: "Archive", allowed: ["Active", "Relocated", "Has a church", "Wrong number", "Unreachable", "Not interested"] },
      ];

      const fieldNameMap: Record<string, string> = {
        firstName: "First Name", lastName: "Last Name", gender: "Gender",
        mobilePhone: "Mobile Phone", email: "Email", address: "Address",
        occupation: "Occupation", joinDate: "Join Date", cluster: "Cluster",
        followUpWorker: "Follow Up Worker", cell: "Cell", status: "Status",
        dateOfBirth: "Date of Birth", followUpType: "Follow Up Type",
        archive: "Archive", summaryNotes: "Summary Notes", branchId: "Branch",
      };

      let imported = 0;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNum = i + 2; // row 1 is header
        const failuresBefore = failures.length;

        for (const { csvCol, label } of REQUIRED_FIELDS) {
          const val = record[csvCol];
          if (!val || val.trim() === "") {
            failures.push({ row: rowNum, field: label, reason: "Required field is blank" });
          }
        }

        for (const { csvCol, label, allowed } of ENUM_FIELDS) {
          const val = record[csvCol];
          if (val && val.trim() !== "" && !allowed.includes(val.trim())) {
            failures.push({ row: rowNum, field: label, reason: `Invalid value "${val.trim()}". Must be one of: ${allowed.join(", ")}` });
          }
        }

        if (failures.length > failuresBefore) continue;

        try {
          const memberData = {
            firstName: record["First Name"] || record.firstName,
            lastName: record["Last Name"] || record.lastName,
            gender: record["Gender"] || record.gender,
            mobilePhone: record["Mobile Phone"] || record.mobilePhone,
            email: record["Email"] || record.email || "",
            address: record["Address"] || record.address || "",
            occupation: record["Occupation"] || record.occupation,
            joinDate: record["Join Date"] || record.joinDate,
            cluster: record["Cluster"] || record.cluster,
            followUpWorker: record["Follow Up Worker"] || record.followUpWorker || "",
            cell: record["Cell"] || record.cell || "",
            status: record["Status"] || record.status,
            dateOfBirth: record["Date of Birth"] || record.dateOfBirth || "",
            followUpType: record["Follow Up Type"] || record.followUpType || "General",
            archive: record["Archive"] || record.archive || undefined,
            summaryNotes: record["Summary Notes"] || record.summaryNotes || "",
            branchId,
          };

          const validatedData = insertMemberSchema.parse(memberData);
          await storage.createMember(validatedData);
          imported++;
        } catch (err) {
          if (err instanceof ZodError) {
            for (const issue of err.issues) {
              const rawField = String(issue.path[0] ?? "Unknown");
              failures.push({ row: rowNum, field: fieldNameMap[rawField] ?? rawField, reason: issue.message });
            }
          } else {
            failures.push({ row: rowNum, field: "Unknown", reason: "Unexpected error during import" });
            console.error("Error importing member record:", err);
          }
        }
      }

      res.json({ imported, total: records.length, failures });
    } catch (error) {
      console.error("Error importing members:", error);
      res.status(500).json({ error: "Failed to import members" });
    }
  });

  // Parameterized routes must come after specific routes
  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getMemberById(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ error: "Failed to fetch member" });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const validatedData = insertMemberSchema.parse(req.body);
      const member = await storage.createMember(validatedData);
      res.json(member);
    } catch (error: any) {
      console.error("Error creating member:", error);
      res.status(400).json({ error: error.message || "Failed to create member" });
    }
  });

  app.patch("/api/members/:id", async (req, res) => {
    try {
      const validatedData = insertMemberSchema.partial().parse(req.body);
      const member = await storage.updateMember(req.params.id, validatedData);
      res.json(member);
    } catch (error: any) {
      console.error("Error updating member:", error);
      res.status(400).json({ error: error.message || "Failed to update member" });
    }
  });

  app.delete("/api/members/:id", async (req, res) => {
    try {
      await storage.deleteMember(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting member:", error);
      res.status(500).json({ error: "Failed to delete member" });
    }
  });

  // First Timer routes
  app.get("/api/first-timers", async (req, res) => {
    try {
      const firstTimers = await storage.getFirstTimers();
      res.json(firstTimers);
    } catch (error) {
      console.error("Error fetching first timers:", error);
      res.status(500).json({ error: "Failed to fetch first timers" });
    }
  });

  app.post("/api/first-timers", async (req, res) => {
    try {
      console.log("First timer submission received:", req.body);
      const validatedData = insertFirstTimerSchema.parse(req.body);
      console.log("Validation successful, creating first timer");
      const firstTimer = await storage.createFirstTimer(validatedData);
      console.log("First timer created:", firstTimer.id);
      res.json(firstTimer);
    } catch (error: any) {
      console.error("Error creating first timer:", error);
      console.error("Error details:", error.issues || error.message);
      res.status(400).json({ error: error.message || "Failed to create first timer" });
    }
  });

  app.post("/api/first-timers/:id/convert", async (req, res) => {
    try {
      const member = await storage.convertFirstTimerToMember(req.params.id);
      res.json(member);
    } catch (error: any) {
      console.error("Error converting first timer:", error);
      res.status(400).json({ error: error.message || "Failed to convert first timer" });
    }
  });

  app.get("/api/first-timers/export", async (req, res) => {
    try {
      const firstTimers = await storage.getFirstTimers();
      const csvData = stringify(firstTimers, {
        header: true,
        columns: [
          { key: "firstName", header: "First Name" },
          { key: "lastName", header: "Last Name" },
          { key: "gender", header: "Gender" },
          { key: "mobilePhone", header: "Mobile Phone" },
          { key: "email", header: "Email" },
          { key: "address", header: "Address" },
          { key: "dateOfBirth", header: "Date of Birth" },
          { key: "closestAxis", header: "Closest Axis" },
          { key: "basedInCity", header: "Based In City" },
          { key: "seeingAgain", header: "Seeing Again" },
          { key: "enjoyedAboutService", header: "Enjoyed About Service" },
          { key: "howHeardAbout", header: "How Heard About" },
          { key: "whoInvited", header: "Who Invited" },
          { key: "feedback", header: "Feedback" },
        ],
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=first-timers.csv");
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting first timers:", error);
      res.status(500).json({ error: "Failed to export first timers" });
    }
  });

  app.get("/api/first-timers/template", async (req, res) => {
    try {
      const template = stringify(
        [
          {
            firstName: "Jane",
            lastName: "Smith",
            gender: "Female",
            mobilePhone: "+1234567890",
            email: "jane@example.com",
            address: "456 Oak Ave",
            dateOfBirth: "1995-05-15",
            closestAxis: "Victoria Island",
            basedInCity: "Yes",
            seeingAgain: "Yes",
            enjoyedAboutService: "Sermon,Prayer",
            howHeardAbout: "Oikia member",
            whoInvited: "John Doe",
            feedback: "Great service!",
          },
        ],
        { header: true }
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=first-timers-template.csv");
      res.send(template);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  app.post("/api/first-timers/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const csvData = req.file.buffer.toString("utf-8");
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
      });

      let imported = 0;
      for (const record of records as Record<string, string>[]) {
        try {
          const enjoyedArray = (record["Enjoyed About Service"] || record.enjoyedAboutService || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);

          const firstTimerData = {
            firstName: record["First Name"] || record.firstName,
            lastName: record["Last Name"] || record.lastName,
            gender: record["Gender"] || record.gender,
            mobilePhone: record["Mobile Phone"] || record.mobilePhone,
            email: record["Email"] || record.email || "",
            address: record["Address"] || record.address || "",
            dateOfBirth: record["Date of Birth"] || record.dateOfBirth || "",
            closestAxis: record["Closest Axis"] || record.closestAxis,
            basedInCity: record["Based In City"] || record.basedInCity,
            seeingAgain: record["Seeing Again"] || record.seeingAgain,
            enjoyedAboutService: enjoyedArray,
            howHeardAbout: record["How Heard About"] || record.howHeardAbout,
            whoInvited: record["Who Invited"] || record.whoInvited || "",
            feedback: record["Feedback"] || record.feedback || "",
          };

          const validatedData = insertFirstTimerSchema.parse(firstTimerData);
          await storage.createFirstTimer(validatedData);
          imported++;
        } catch (error) {
          console.error("Error importing first timer:", error);
        }
      }

      res.json({ success: true, imported });
    } catch (error) {
      console.error("Error importing first timers:", error);
      res.status(500).json({ error: "Failed to import first timers" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", async (req, res) => {
    try {
      const serviceDate = req.query.serviceDate as string;
      if (!serviceDate) {
        return res.status(400).json({ error: "Service date is required" });
      }
      const attendance = await storage.getAttendanceByDate(serviceDate);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance/toggle", async (req, res) => {
    try {
      const { memberId, serviceDate, status } = req.body;
      const validatedData = insertAttendanceSchema.parse({ memberId, serviceDate, status });
      const attendance = await storage.toggleAttendance(
        validatedData.memberId,
        validatedData.serviceDate,
        validatedData.status
      );
      res.json(attendance);
    } catch (error: any) {
      console.error("Error toggling attendance:", error);
      res.status(400).json({ error: error.message || "Failed to toggle attendance" });
    }
  });

  app.post("/api/attendance/mark-all-present", async (req, res) => {
    try {
      const { serviceDate, status } = req.body;
      if (!serviceDate || !status) {
        return res.status(400).json({ error: "Service date and status are required" });
      }
      await storage.markAllPresentByStatus(serviceDate, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all present:", error);
      res.status(500).json({ error: "Failed to mark all present" });
    }
  });

  app.get("/api/attendance/template", async (req, res) => {
    try {
      const template = stringify(
        [
          {
            firstName: "John",
            lastName: "Doe",
            mobilePhone: "+1234567890",
            serviceDate: "2024-01-07",
            status: "Present",
          },
        ],
        { header: true }
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=attendance-template.csv");
      res.send(template);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  app.post("/api/attendance/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const csvData = req.file.buffer.toString("utf-8");
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
      });

      let imported = 0;
      for (const record of records as Record<string, string>[]) {
        try {
          const firstName = record["First Name"] || record.firstName;
          const lastName = record["Last Name"] || record.lastName;
          const mobilePhone = record["Mobile Phone"] || record.mobilePhone;
          const serviceDate = record["Service Date"] || record.serviceDate;
          const status = record["Status"] || record.status || "Present";

          // Find member by name and phone
          const members = await storage.getMembers();
          const member = members.find(
            (m) =>
              m.firstName === firstName &&
              m.lastName === lastName &&
              m.mobilePhone === mobilePhone
          );

          if (member) {
            await storage.toggleAttendance(member.id, serviceDate, status);
            imported++;
          }
        } catch (error) {
          console.error("Error importing attendance record:", error);
        }
      }

      res.json({ success: true, imported });
    } catch (error) {
      console.error("Error importing attendance:", error);
      res.status(500).json({ error: "Failed to import attendance" });
    }
  });

  // Follow-up Tasks endpoints
  app.get("/api/follow-up-tasks", async (req, res) => {
    try {
      const { assignedTo, status, memberId } = req.query;
      const tasks = await storage.getFollowUpTasks({
        assignedTo: assignedTo as string,
        status: status as string,
        memberId: memberId as string,
      });
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching follow-up tasks:", error);
      res.status(500).json({ error: "Failed to fetch follow-up tasks" });
    }
  });

  app.get("/api/follow-up-tasks/:id", async (req, res) => {
    try {
      const task = await storage.getFollowUpTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching follow-up task:", error);
      res.status(500).json({ error: "Failed to fetch follow-up task" });
    }
  });

  app.post("/api/follow-up-tasks", async (req, res) => {
    try {
      const validatedData = insertFollowUpTaskSchema.parse(req.body);
      const task = await storage.createFollowUpTask(validatedData);
      res.json(task);
    } catch (error: any) {
      console.error("Error creating follow-up task:", error);
      res.status(400).json({ error: error.message || "Failed to create follow-up task" });
    }
  });

  app.patch("/api/follow-up-tasks/:id", async (req, res) => {
    try {
      const validatedData = insertFollowUpTaskSchema.partial().parse(req.body);
      const task = await storage.updateFollowUpTask(req.params.id, validatedData);
      res.json(task);
    } catch (error: any) {
      console.error("Error updating follow-up task:", error);
      res.status(400).json({ error: error.message || "Failed to update follow-up task" });
    }
  });

  app.delete("/api/follow-up-tasks/:id", async (req, res) => {
    try {
      await storage.deleteFollowUpTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting follow-up task:", error);
      res.status(500).json({ error: "Failed to delete follow-up task" });
    }
  });

  app.post("/api/follow-up-tasks/:id/complete", async (req, res) => {
    try {
      const task = await storage.completeFollowUpTask(req.params.id);
      res.json(task);
    } catch (error) {
      console.error("Error completing follow-up task:", error);
      res.status(500).json({ error: "Failed to complete follow-up task" });
    }
  });

  // Cluster routes (before cell routes to avoid id conflicts)
  app.get("/api/clusters", isAuthenticated, async (req, res) => {
    try {
      const branchId = req.query.branchId as string | undefined;
      const clusterList = await storage.getClusters(branchId);
      res.json(clusterList);
    } catch (error) {
      console.error("Error fetching clusters:", error);
      res.status(500).json({ error: "Failed to fetch clusters" });
    }
  });

  app.get("/api/clusters/:id", isAuthenticated, async (req, res) => {
    try {
      const cluster = await storage.getClusterById(req.params.id);
      if (!cluster) {
        return res.status(404).json({ error: "Cluster not found" });
      }
      res.json(cluster);
    } catch (error) {
      console.error("Error fetching cluster:", error);
      res.status(500).json({ error: "Failed to fetch cluster" });
    }
  });

  app.post("/api/clusters", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertClusterSchema.parse(req.body);
      const cluster = await storage.createCluster(validatedData);
      res.json(cluster);
    } catch (error: any) {
      console.error("Error creating cluster:", error);
      res.status(400).json({ error: error.message || "Failed to create cluster" });
    }
  });

  app.patch("/api/clusters/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertClusterSchema.partial().parse(req.body);
      const cluster = await storage.updateCluster(req.params.id, validatedData);
      res.json(cluster);
    } catch (error: any) {
      console.error("Error updating cluster:", error);
      res.status(400).json({ error: error.message || "Failed to update cluster" });
    }
  });

  app.delete("/api/clusters/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      await storage.deleteCluster(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting cluster:", error);
      res.status(400).json({ error: error.message || "Failed to delete cluster" });
    }
  });

  // Cell routes
  app.get("/api/cells", async (req, res) => {
    try {
      const clusterId = req.query.clusterId as string | undefined;
      const cells = await storage.getCells(clusterId);
      res.json(cells);
    } catch (error) {
      console.error("Error fetching cells:", error);
      res.status(500).json({ error: "Failed to fetch cells" });
    }
  });

  app.get("/api/cells/:id", async (req, res) => {
    try {
      const cell = await storage.getCellById(req.params.id);
      if (!cell) {
        return res.status(404).json({ error: "Cell not found" });
      }
      res.json(cell);
    } catch (error) {
      console.error("Error fetching cell:", error);
      res.status(500).json({ error: "Failed to fetch cell" });
    }
  });

  app.post("/api/cells", async (req, res) => {
    try {
      const validatedData = insertCellSchema.parse(req.body);
      const cell = await storage.createCell(validatedData);
      res.json(cell);
    } catch (error: any) {
      console.error("Error creating cell:", error);
      res.status(400).json({ error: error.message || "Failed to create cell" });
    }
  });

  app.patch("/api/cells/:id", async (req, res) => {
    try {
      const validatedData = insertCellSchema.partial().parse(req.body);
      const cell = await storage.updateCell(req.params.id, validatedData);
      res.json(cell);
    } catch (error: any) {
      console.error("Error updating cell:", error);
      res.status(400).json({ error: error.message || "Failed to update cell" });
    }
  });

  app.delete("/api/cells/:id", async (req, res) => {
    try {
      await storage.deleteCell(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting cell:", error);
      res.status(500).json({ error: "Failed to delete cell" });
    }
  });

  // Cell attendance routes
  app.get("/api/cells/:id/attendance", async (req, res) => {
    try {
      const meetingDate = req.query.meetingDate as string | undefined;
      const attendance = await storage.getCellAttendance(req.params.id, meetingDate);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching cell attendance:", error);
      res.status(500).json({ error: "Failed to fetch cell attendance" });
    }
  });

  app.post("/api/cells/:id/attendance", async (req, res) => {
    try {
      const validatedData = insertCellAttendanceSchema.parse({
        ...req.body,
        cellId: req.params.id,
      });
      const record = await storage.recordCellAttendance(validatedData);
      res.json(record);
    } catch (error: any) {
      console.error("Error recording cell attendance:", error);
      res.status(400).json({ error: error.message || "Failed to record cell attendance" });
    }
  });

  app.get("/api/cells/:id/meeting-dates", async (req, res) => {
    try {
      const dates = await storage.getCellMeetingDates(req.params.id);
      res.json(dates);
    } catch (error) {
      console.error("Error fetching meeting dates:", error);
      res.status(500).json({ error: "Failed to fetch meeting dates" });
    }
  });

  app.delete("/api/cell-attendance/:id", async (req, res) => {
    try {
      await storage.deleteCellAttendance(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting cell attendance:", error);
      res.status(500).json({ error: "Failed to delete cell attendance" });
    }
  });

  // Branch routes (protected - requires authentication, mutations require super_admin)
  app.get("/api/branches", isAuthenticated, async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  app.get("/api/branches/:id", isAuthenticated, async (req, res) => {
    try {
      const branch = await storage.getBranchById(req.params.id);
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });

  app.post("/api/branches", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(validatedData);
      res.json(branch);
    } catch (error: any) {
      console.error("Error creating branch:", error);
      res.status(400).json({ error: error.message || "Failed to create branch" });
    }
  });

  app.patch("/api/branches/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertBranchSchema.partial().parse(req.body);
      const branch = await storage.updateBranch(req.params.id, validatedData);
      res.json(branch);
    } catch (error: any) {
      console.error("Error updating branch:", error);
      res.status(400).json({ error: error.message || "Failed to update branch" });
    }
  });

  app.delete("/api/branches/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      await storage.deleteBranch(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ error: "Failed to delete branch" });
    }
  });

  // User management routes (protected - requires authentication, mutations require super_admin)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserWithRole(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/users/:id/role", isAuthenticated, async (req, res) => {
    try {
      const role = await storage.getUserRole(req.params.id);
      res.json(role || null);
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ error: "Failed to fetch user role" });
    }
  });

  app.post("/api/user-roles", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertUserRoleSchema.parse(req.body);
      const role = await storage.assignUserRole(validatedData);
      res.json(role);
    } catch (error: any) {
      console.error("Error assigning user role:", error);
      res.status(400).json({ error: error.message || "Failed to assign user role" });
    }
  });

  app.patch("/api/user-roles/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertUserRoleSchema.partial().parse(req.body);
      const role = await storage.updateUserRole(req.params.id, validatedData);
      res.json(role);
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(400).json({ error: error.message || "Failed to update user role" });
    }
  });

  app.delete("/api/user-roles/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      await storage.deleteUserRole(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user role:", error);
      res.status(500).json({ error: "Failed to delete user role" });
    }
  });

  // Get current user's role and permissions (protected)
  app.get("/api/me/role", isAuthenticated, async (req: any, res) => {
    try {
      const userWithRole = await storage.getUserWithRole(req.user.claims.sub);
      res.json(userWithRole || null);
    } catch (error) {
      console.error("Error fetching current user role:", error);
      res.status(500).json({ error: "Failed to fetch current user role" });
    }
  });

  // ==================== REPORTING API ENDPOINTS ====================
  // These endpoints are designed for third-party reporting tools
  // All endpoints require super_admin role for full data access
  // POST endpoints allow creating members and first-timers

  // GET all members (for reporting)
  app.get("/api/reporting/members", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const members = await storage.getMembers({});
      res.json(members);
    } catch (error) {
      console.error("Error fetching members for reporting:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  // POST create member (for reporting/external systems)
  app.post("/api/reporting/members", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertMemberSchema.parse(req.body);
      const member = await storage.createMember(validatedData);
      res.status(201).json(member);
    } catch (error: any) {
      console.error("Error creating member via reporting API:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      } else {
        res.status(500).json({ error: error.message || "Failed to create member" });
      }
    }
  });

  // GET all first-timers (for reporting)
  app.get("/api/reporting/first-timers", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const firstTimers = await storage.getFirstTimers();
      res.json(firstTimers);
    } catch (error) {
      console.error("Error fetching first-timers for reporting:", error);
      res.status(500).json({ error: "Failed to fetch first-timers" });
    }
  });

  // POST create first-timer (for reporting/external systems)
  app.post("/api/reporting/first-timers", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertFirstTimerSchema.parse(req.body);
      const firstTimer = await storage.createFirstTimer(validatedData);
      res.status(201).json(firstTimer);
    } catch (error: any) {
      console.error("Error creating first-timer via reporting API:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      } else {
        res.status(500).json({ error: error.message || "Failed to create first-timer" });
      }
    }
  });

  // GET all attendance records (for reporting)
  app.get("/api/reporting/attendance", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const attendance = await storage.getAttendance({});
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance for reporting:", error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  // GET all communications (for reporting)
  app.get("/api/reporting/communications", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const communications = await storage.getCommunications();
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications for reporting:", error);
      res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  // GET all follow-up tasks (for reporting)
  app.get("/api/reporting/follow-up-tasks", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const tasks = await storage.getFollowUpTasks({});
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching follow-up tasks for reporting:", error);
      res.status(500).json({ error: "Failed to fetch follow-up tasks" });
    }
  });

  // GET all cells (for reporting)
  app.get("/api/reporting/cells", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const cells = await storage.getCells();
      res.json(cells);
    } catch (error) {
      console.error("Error fetching cells for reporting:", error);
      res.status(500).json({ error: "Failed to fetch cells" });
    }
  });

  // GET single cell by ID (for reporting)
  app.get("/api/reporting/cells/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const cell = await storage.getCellById(req.params.id);
      if (!cell) return res.status(404).json({ error: "Cell not found" });
      res.json(cell);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cell" });
    }
  });

  // POST create cell (for reporting/external systems)
  app.post("/api/reporting/cells", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertCellSchema.parse(req.body);
      const cell = await storage.createCell(validatedData);
      res.status(201).json(cell);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      res.status(500).json({ error: error.message || "Failed to create cell" });
    }
  });

  // PATCH update cell (for reporting/external systems)
  app.patch("/api/reporting/cells/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertCellSchema.partial().parse(req.body);
      const cell = await storage.updateCell(req.params.id, validatedData);
      res.json(cell);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      res.status(500).json({ error: error.message || "Failed to update cell" });
    }
  });

  // GET all cell attendance (for reporting)
  app.get("/api/reporting/cell-attendance", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const cellAttendance = await storage.getAllCellAttendance();
      res.json(cellAttendance);
    } catch (error) {
      console.error("Error fetching cell attendance for reporting:", error);
      res.status(500).json({ error: "Failed to fetch cell attendance" });
    }
  });

  // GET all branches (for reporting)
  app.get("/api/reporting/branches", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches for reporting:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  // GET single branch by ID (for reporting)
  app.get("/api/reporting/branches/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const branch = await storage.getBranchById(req.params.id);
      if (!branch) return res.status(404).json({ error: "Branch not found" });
      res.json(branch);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });

  // POST create branch (for reporting/external systems)
  app.post("/api/reporting/branches", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(validatedData);
      res.status(201).json(branch);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      res.status(500).json({ error: error.message || "Failed to create branch" });
    }
  });

  // PATCH update branch (for reporting/external systems)
  app.patch("/api/reporting/branches/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertBranchSchema.partial().parse(req.body);
      const branch = await storage.updateBranch(req.params.id, validatedData);
      res.json(branch);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      res.status(500).json({ error: error.message || "Failed to update branch" });
    }
  });

  // GET all users (for reporting)
  app.get("/api/reporting/users", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users for reporting:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // GET all clusters (for reporting)
  app.get("/api/reporting/clusters", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const clusterList = await storage.getClusters();
      res.json(clusterList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clusters" });
    }
  });

  // GET single cluster by ID (for reporting)
  app.get("/api/reporting/clusters/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const cluster = await storage.getClusterById(req.params.id);
      if (!cluster) return res.status(404).json({ error: "Cluster not found" });
      res.json(cluster);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cluster" });
    }
  });

  // POST create cluster (for reporting/external systems)
  app.post("/api/reporting/clusters", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertClusterSchema.parse(req.body);
      const cluster = await storage.createCluster(validatedData);
      res.status(201).json(cluster);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      res.status(500).json({ error: error.message || "Failed to create cluster" });
    }
  });

  // PATCH update cluster (for reporting/external systems)
  app.patch("/api/reporting/clusters/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertClusterSchema.partial().parse(req.body);
      const cluster = await storage.updateCluster(req.params.id, validatedData);
      res.json(cluster);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      res.status(500).json({ error: error.message || "Failed to update cluster" });
    }
  });

  // GET all user roles (for reporting)
  app.get("/api/reporting/user-roles", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const userRoles = await storage.getAllUserRoles();
      res.json(userRoles);
    } catch (error) {
      console.error("Error fetching user roles for reporting:", error);
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  // Role Permissions
  app.get("/api/role-permissions", isAuthenticated, async (req, res) => {
    try {
      const data = await storage.getRolePermissions();
      res.json(data);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  app.put("/api/role-permissions", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const data = req.body as Record<string, string[]>;
      await storage.setRolePermissions(data);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving role permissions:", error);
      res.status(500).json({ error: "Failed to save role permissions" });
    }
  });

  // Outreach routes
  app.get("/api/outreach", isAuthenticated, async (req, res) => {
    try {
      const branchId = req.query.branchId as string | undefined;
      const records = await storage.getOutreach(branchId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching outreach:", error);
      res.status(500).json({ error: "Failed to fetch outreach records" });
    }
  });

  app.post("/api/outreach", isAuthenticated, async (req, res) => {
    try {
      const data = insertOutreachSchema.parse(req.body);
      const record = await storage.createOutreach(data);
      res.status(201).json(record);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      } else {
        res.status(500).json({ error: "Failed to create outreach record" });
      }
    }
  });

  app.patch("/api/outreach/:id", isAuthenticated, async (req, res) => {
    try {
      const data = insertOutreachSchema.partial().parse(req.body);
      const record = await storage.updateOutreach(req.params.id, data);
      res.json(record);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid data" });
      } else {
        res.status(500).json({ error: "Failed to update outreach record" });
      }
    }
  });

  app.delete("/api/outreach/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteOutreach(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete outreach record" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
