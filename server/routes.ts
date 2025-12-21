import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemberSchema, insertFirstTimerSchema, insertAttendanceSchema, insertCommunicationSchema, insertFollowUpTaskSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
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
            firstName: "John",
            lastName: "Doe",
            gender: "Male",
            mobilePhone: "+1234567890",
            email: "john@example.com",
            address: "123 Main St",
            occupation: "Workers",
            joinDate: "2024-01-01",
            cluster: "Lekki",
            followUpWorker: "Jane Smith",
            cell: "Cell A",
            status: "Crowd",
            dateOfBirth: "1990-01-01",
            followUpType: "General",
            archive: "",
            summaryNotes: "Sample notes",
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

      const csvData = req.file.buffer.toString("utf-8");
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
      });

      let imported = 0;
      for (const record of records) {
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
          };

          const validatedData = insertMemberSchema.parse(memberData);
          await storage.createMember(validatedData);
          imported++;
        } catch (err) {
          console.error("Error importing member record:", err);
        }
      }

      res.json({ imported, total: records.length });
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
      for (const record of records) {
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
      for (const record of records) {
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

  const httpServer = createServer(app);
  return httpServer;
}
