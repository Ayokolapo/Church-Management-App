import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { sendSuccess, sendPaginated, sendError, handleRouteError } from "../shared/response";
import { validateQuery, validateParams, paginationQuerySchema, sortQuerySchema, idParamSchema } from "../shared/validation";
import { authenticateRequest, requireApiPermission } from "../shared/authenticate";

export const usersV1Router = Router();

usersV1Router.use(authenticateRequest);

const SORTABLE_FIELDS = ["firstName", "lastName", "email"] as const;

const listQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  ...sortQuerySchema(SORTABLE_FIELDS, "firstName").shape,
  search: z.string().optional(),
});

// GET /api/v1/users — paginated user list. The underlying users table is
// small (staff/admin accounts only) so pagination/search/sort are applied
// in-memory rather than pushed down to the DB.
usersV1Router.get(
  "/",
  requireApiPermission("users.manage"),
  validateQuery(listQuerySchema),
  async (req, res) => {
    try {
      const q = (req as any).validatedQuery as z.infer<typeof listQuerySchema>;
      let all = await storage.getAllUsers();

      if (q.search) {
        const term = q.search.toLowerCase();
        all = all.filter((u) =>
          [u.firstName, u.lastName, u.email].some((v) => v?.toLowerCase().includes(term))
        );
      }

      all = [...all].sort((a, b) => {
        const av = String((a as any)[q.sort_by] ?? "");
        const bv = String((b as any)[q.sort_by] ?? "");
        const cmp = av.localeCompare(bv);
        return q.sort_order === "asc" ? cmp : -cmp;
      });

      const total = all.length;
      const start = (q.page - 1) * q.limit;
      const pageData = all.slice(start, start + q.limit);

      return sendPaginated(res, pageData, { page: q.page, limit: q.limit, total });
    } catch (error) {
      return handleRouteError(res, error, "Failed to fetch users.");
    }
  }
);

usersV1Router.get(
  "/:id",
  validateParams(z.object({ id: idParamSchema })),
  async (req, res) => {
    try {
      const user = await storage.getUserWithRole(req.params.id);
      if (!user) return sendError(res, "NotFound", "User not found.");
      return sendSuccess(res, user);
    } catch (error) {
      return handleRouteError(res, error, "Failed to fetch user.");
    }
  }
);
