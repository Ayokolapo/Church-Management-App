import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import type { UserRole } from "@shared/schema";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

interface UserWithRoleResponse {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole | null;
  branch?: { id: number; name: string; address?: string | null } | null;
}

async function fetchUserRole(): Promise<UserWithRoleResponse | null> {
  const response = await fetch("/api/me/role", {
    credentials: "include",
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: userWithRole, isLoading: isRoleLoading } = useQuery<UserWithRoleResponse | null>({
    queryKey: ["/api/me/role"],
    queryFn: fetchUserRole,
    retry: false,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.setQueryData(["/api/me/role"], null);
    },
  });

  const userRole = userWithRole?.role;
  const isSuperAdmin = userRole?.role === "super_admin";
  const isBranchAdmin = userRole?.role === "branch_admin";
  const isGroupAdmin = userRole?.role === "group_admin";
  const isCellLeader = userRole?.role === "cell_leader";
  const isBranchRep = userRole?.role === "branch_rep";

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    userRole,
    isRoleLoading,
    isSuperAdmin,
    isBranchAdmin,
    isGroupAdmin,
    isCellLeader,
    isBranchRep,
    hasAdminAccess: isSuperAdmin,
  };
}
