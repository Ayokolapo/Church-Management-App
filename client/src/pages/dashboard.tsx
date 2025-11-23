import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, CalendarCheck, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import type { Member, FirstTimer } from "@shared/schema";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalMembers: number;
    totalFirstTimers: number;
    recentAttendance: number;
    newMembersThisMonth: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<{ date: string; present: number; total: number }[]>({
    queryKey: ["/api/analytics/attendance-trends"],
  });

  const { data: statusDistribution, isLoading: statusLoading } = useQuery<{ status: string; count: number }[]>({
    queryKey: ["/api/analytics/status-distribution"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<{
    recentMembers: Member[];
    recentFirstTimers: FirstTimer[];
  }>({
    queryKey: ["/api/analytics/recent-activity"],
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

  const attendanceRate = trends && trends.length > 0 
    ? Math.round((trends.reduce((sum, t) => sum + t.present, 0) / trends.reduce((sum, t) => sum + t.total, 0)) * 100)
    : 0;

  const formattedTrends = trends?.map(t => ({
    date: format(new Date(t.date), "MMM dd"),
    present: t.present,
    total: t.total,
    rate: t.total > 0 ? Math.round((t.present / t.total) * 100) : 0,
  })) || [];

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
              {statsLoading ? (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trends (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : !trends || trends.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No attendance data available yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formattedTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#3b82f6" name="Present" strokeWidth={2} />
                    <Line type="monotone" dataKey="total" stroke="#8b5cf6" name="Total" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 text-sm text-muted-foreground text-center">
                  Average attendance rate: {attendanceRate}%
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : !statusDistribution || statusDistribution.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No member data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <CardContent className="space-y-4">
            {activityLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : activity && (activity.recentMembers.length > 0 || activity.recentFirstTimers.length > 0) ? (
              <>
                {activity.recentMembers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">New Members</h3>
                    <div className="space-y-2">
                      {activity.recentMembers.slice(0, 3).map((member) => (
                        <div key={member.id} className="text-sm flex justify-between items-center">
                          <span className="font-medium">{member.firstName} {member.lastName}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(member.createdAt), "MMM dd, yyyy")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {activity.recentFirstTimers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recent First Timers</h3>
                    <div className="space-y-2">
                      {activity.recentFirstTimers.slice(0, 3).map((firstTimer) => (
                        <div key={firstTimer.id} className="text-sm flex justify-between items-center">
                          <span className="font-medium">{firstTimer.firstName} {firstTimer.lastName}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(firstTimer.createdAt), "MMM dd, yyyy")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                No recent activity to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
