import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, CalendarCheck, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<{
    totalMembers: number;
    totalFirstTimers: number;
    recentAttendance: number;
    newMembersThisMonth: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const statCards = [
    {
      title: "Total Members",
      value: stats?.totalMembers || 0,
      icon: Users,
      description: "Active church members",
    },
    {
      title: "First Timers",
      value: stats?.totalFirstTimers || 0,
      icon: UserPlus,
      description: "Awaiting conversion",
    },
    {
      title: "Last Sunday",
      value: stats?.recentAttendance || 0,
      icon: CalendarCheck,
      description: "Members attended",
    },
    {
      title: "New This Month",
      value: stats?.newMembersThisMonth || 0,
      icon: TrendingUp,
      description: "Members joined",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your church management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/members"
              className="block p-4 rounded-md hover-elevate active-elevate-2 border"
              data-testid="link-quick-members"
            >
              <div className="font-medium">Manage Members</div>
              <div className="text-sm text-muted-foreground">View and edit member information</div>
            </a>
            <a
              href="/attendance"
              className="block p-4 rounded-md hover-elevate active-elevate-2 border"
              data-testid="link-quick-attendance"
            >
              <div className="font-medium">Mark Attendance</div>
              <div className="text-sm text-muted-foreground">Record Sunday service attendance</div>
            </a>
            <a
              href="/first-timers"
              className="block p-4 rounded-md hover-elevate active-elevate-2 border"
              data-testid="link-quick-first-timers"
            >
              <div className="font-medium">First Timers</div>
              <div className="text-sm text-muted-foreground">Review and convert first-time visitors</div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Activity tracking will be available once you start managing members and recording attendance.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
