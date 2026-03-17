import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceList } from "@/components/attendance-list";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MemberSlim } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";

export default function Attendance() {
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: members, isLoading } = useQuery<MemberSlim[]>({
    queryKey: ["/api/members/list"],
  });

  const { data: attendanceData } = useQuery<Record<string, string>>({
    queryKey: ["/api/attendance", serviceDate],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?serviceDate=${serviceDate}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });

  const toggleAttendanceMutation = useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: string }) => {
      return await apiRequest("POST", "/api/attendance/toggle", {
        memberId,
        serviceDate,
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", serviceDate] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update attendance",
        variant: "destructive",
      });
    },
  });

  const markAllPresentMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("POST", "/api/attendance/mark-all-present", {
        serviceDate,
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", serviceDate] });
      toast({
        title: "Success",
        description: "All members marked as present",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all as present",
        variant: "destructive",
      });
    },
  });

  const handleToggleAttendance = (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Present" ? "Absent" : "Present";
    toggleAttendanceMutation.mutate({ memberId, status: newStatus });
  };

  const handleMarkAllPresent = () => {
    if (statusFilter && statusFilter !== "all") {
      markAllPresentMutation.mutate(statusFilter);
    }
  };

  const filteredMembers = members?.filter((member) => {
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.mobilePhone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  }) || [];

  const statusCounts = {
    all: members?.length || 0,
    Crowd: members?.filter((m) => m.status === "Crowd").length || 0,
    Potential: members?.filter((m) => m.status === "Potential").length || 0,
    Committed: members?.filter((m) => m.status === "Committed").length || 0,
    Worker: members?.filter((m) => m.status === "Worker").length || 0,
    Leader: members?.filter((m) => m.status === "Leader").length || 0,
  };

  const presentCount = filteredMembers.filter(
    (m) => attendanceData?.[m.id] === "Present"
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Attendance</h1>
        <p className="text-muted-foreground">Mark Sunday service attendance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="service-date">Select Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="service-date"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="pl-10"
                  data-testid="input-service-date"
                />
              </div>
            </div>
            <div className="flex items-end">
              <div className="px-4 py-2 bg-muted rounded-md">
                <div className="text-sm text-muted-foreground">Present Today</div>
                <div className="text-2xl font-bold" data-testid="text-present-count">
                  {presentCount} / {filteredMembers.length}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          {statusFilter !== "all" && (
            <Button
              onClick={handleMarkAllPresent}
              disabled={markAllPresentMutation.isPending}
              data-testid="button-mark-all-present"
            >
              <Users className="w-4 h-4 mr-2" />
              Mark All {statusFilter} Present
            </Button>
          )}
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full justify-start flex-wrap h-auto gap-2">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({statusCounts.all})
            </TabsTrigger>
            <TabsTrigger value="Crowd" data-testid="tab-crowd">
              Crowd ({statusCounts.Crowd})
            </TabsTrigger>
            <TabsTrigger value="Potential" data-testid="tab-potential">
              Potential ({statusCounts.Potential})
            </TabsTrigger>
            <TabsTrigger value="Committed" data-testid="tab-committed">
              Committed ({statusCounts.Committed})
            </TabsTrigger>
            <TabsTrigger value="Worker" data-testid="tab-worker">
              Worker ({statusCounts.Worker})
            </TabsTrigger>
            <TabsTrigger value="Leader" data-testid="tab-leader">
              Leader ({statusCounts.Leader})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <AttendanceList
          members={filteredMembers}
          attendanceData={attendanceData || {}}
          onToggle={handleToggleAttendance}
          isUpdating={toggleAttendanceMutation.isPending}
        />
      )}
    </div>
  );
}
