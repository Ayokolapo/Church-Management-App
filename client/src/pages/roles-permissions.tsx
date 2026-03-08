import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ShieldCheck, Save, Lock } from "lucide-react";

const ROLES = [
  { key: "super_admin", label: "Super Admin" },
  { key: "branch_admin", label: "Branch Admin" },
  { key: "group_admin", label: "Group Admin" },
  { key: "cell_leader", label: "Cell Leader" },
  { key: "branch_rep", label: "Branch Rep" },
] as const;

const PERMISSION_CATEGORIES = [
  {
    label: "Members",
    permissions: [
      { key: "members.view", label: "View Members" },
      { key: "members.create", label: "Add Members" },
      { key: "members.edit", label: "Edit Members" },
      { key: "members.delete", label: "Delete Members" },
      { key: "members.import", label: "Import Members" },
    ],
  },
  {
    label: "First Timers",
    permissions: [
      { key: "first_timers.view", label: "View First Timers" },
      { key: "first_timers.create", label: "Record First Timers" },
      { key: "first_timers.convert", label: "Convert to Member" },
    ],
  },
  {
    label: "Attendance",
    permissions: [
      { key: "attendance.view", label: "View Attendance" },
      { key: "attendance.edit", label: "Mark Attendance" },
    ],
  },
  {
    label: "Cells",
    permissions: [
      { key: "cells.view", label: "View Cells" },
      { key: "cells.manage", label: "Manage Cells" },
    ],
  },
  {
    label: "Communications",
    permissions: [
      { key: "communications.send", label: "Send Communications" },
    ],
  },
  {
    label: "Follow-up Tasks",
    permissions: [
      { key: "follow_up_tasks.view", label: "View Tasks" },
      { key: "follow_up_tasks.manage", label: "Create & Manage Tasks" },
    ],
  },
  {
    label: "Administration",
    permissions: [
      { key: "branches.manage", label: "Manage Branches" },
      { key: "users.manage", label: "Manage Users" },
      { key: "roles.manage", label: "Manage Roles & Permissions" },
    ],
  },
];

export default function RolesPermissions() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isDirty, setIsDirty] = useState(false);

  const { data, isLoading } = useQuery<Record<string, string[]>>({
    queryKey: ["/api/role-permissions"],
  });

  useEffect(() => {
    if (data) {
      setPermissions(data);
      setIsDirty(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string[]>) => {
      await apiRequest("PUT", "/api/role-permissions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      setIsDirty(false);
      toast({ title: "Saved", description: "Role permissions updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save permissions.", variant: "destructive" });
    },
  });

  const toggle = (role: string, permission: string, checked: boolean) => {
    setPermissions(prev => {
      const current = prev[role] ?? [];
      const updated = checked
        ? [...current, permission]
        : current.filter(p => p !== permission);
      return { ...prev, [role]: updated };
    });
    setIsDirty(true);
  };

  const hasPermission = (role: string, permission: string) =>
    (permissions[role] ?? []).includes(permission);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            Roles &amp; Permissions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure what each role can access. Super Admin always has full access.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(permissions)}
          disabled={!isDirty || saveMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Permission Matrix</CardTitle>
          <CardDescription>Check the boxes to grant a role access to a feature.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 font-medium text-muted-foreground min-w-[200px]">
                    Permission
                  </th>
                  {ROLES.map(role => (
                    <th key={role.key} className="text-center py-3 px-4 font-medium min-w-[110px]">
                      <div className="flex flex-col items-center gap-1">
                        <span>{role.label}</span>
                        {role.key === "super_admin" && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Full Access
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_CATEGORIES.map((category) => (
                  <>
                    <tr key={`cat-${category.label}`} className="bg-muted/40">
                      <td
                        colSpan={ROLES.length + 1}
                        className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {category.label}
                      </td>
                    </tr>
                    {category.permissions.map(perm => (
                      <tr key={perm.key} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-3 pr-4 text-sm">{perm.label}</td>
                        {ROLES.map(role => (
                          <td key={role.key} className="py-3 px-4 text-center">
                            <Checkbox
                              checked={
                                role.key === "super_admin"
                                  ? true
                                  : hasPermission(role.key, perm.key)
                              }
                              disabled={role.key === "super_admin"}
                              onCheckedChange={(checked) =>
                                toggle(role.key, perm.key, !!checked)
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
