import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, Users, UserPlus, CheckSquare, BarChart2 } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const STATUS_COLORS: Record<string, string> = {
  Crowd: "#94a3b8",
  Potential: "#60a5fa",
  Committed: "#34d399",
  Volunteer: "#fbbf24",
  Worker: "#f97316",
  Leader: "#a78bfa",
};

const PALETTE = ["#f97316", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f43f5e", "#14b8a6"];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-3xl font-bold">{value}</div>
            {sub && (
              <p
                className={`text-xs mt-1 flex items-center gap-1 ${
                  trend === "up"
                    ? "text-emerald-600"
                    : trend === "down"
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {trend === "up" && <TrendingUp className="h-3 w-3" />}
                {trend === "down" && <TrendingDown className="h-3 w-3" />}
                {sub}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <Skeleton className="w-full rounded-md" style={{ height }} />;
}

// ---------------------------------------------------------------------------
// Executive Summary
// ---------------------------------------------------------------------------

function ExecutiveSummary() {
  const { data, isLoading } = useQuery<{
    membersByStatus: { status: string; count: number }[];
    memberGrowth: { month: string; count: number }[];
    attendanceTrend: { date: string; present: number; total: number }[];
    firstTimerStats: { total: number; converted: number; pending: number };
    followUpStats: { total: number; completed: number; pending: number };
    occupationDistribution: { occupation: string; count: number }[];
    genderDistribution: { gender: string; count: number }[];
    clusterAttendance: { clusterName: string; totalAttendance: number }[];
  }>({
    queryKey: ["/api/analytics/executive-summary"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const totalMembers = data?.membersByStatus.reduce((s, r) => s + r.count, 0) ?? 0;

  const formattedTrend = (data?.attendanceTrend ?? []).map((r) => ({
    ...r,
    date: (() => {
      try {
        return format(new Date(r.date), "dd MMM");
      } catch {
        return r.date;
      }
    })(),
  }));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value={isLoading ? "—" : totalMembers.toLocaleString()}
          sub="active congregation"
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="First Timers (pending)"
          value={isLoading ? "—" : data?.firstTimerStats.pending ?? "—"}
          sub={`${data?.firstTimerStats.converted ?? 0} converted`}
          icon={UserPlus}
          trend="up"
          loading={isLoading}
        />
        <StatCard
          title="Follow-up Tasks"
          value={isLoading ? "—" : data?.followUpStats.total ?? "—"}
          sub={`${data?.followUpStats.completed ?? 0} completed`}
          icon={CheckSquare}
          loading={isLoading}
        />
        <StatCard
          title="Clusters w/ Cell Attendance"
          value={isLoading ? "—" : data?.clusterAttendance.length ?? "—"}
          sub="last 90 days"
          icon={BarChart2}
          loading={isLoading}
        />
      </div>

      {/* Attendance trend + Status distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sunday Attendance Trend</CardTitle>
            <CardDescription>Present vs total recorded — last 8 services</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : formattedTrend.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={formattedTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#f97316" strokeWidth={2} dot={false} name="Present" />
                  <Line type="monotone" dataKey="total" stroke="#94a3b8" strokeWidth={2} dot={false} name="Total" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Status Distribution</CardTitle>
            <CardDescription>Congregation engagement breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : !data?.membersByStatus.length ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.membersByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    label={({ status, percent }) =>
                      percent > 0.04 ? `${status} ${(percent * 100).toFixed(0)}%` : ""
                    }
                    labelLine={false}
                  >
                    {data.membersByStatus.map((entry, i) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? PALETTE[i % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member growth + Cluster cell attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Member Growth</CardTitle>
            <CardDescription>New members by month — last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : !data?.memberGrowth.length ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.memberGrowth} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="New Members" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cell Attendance by Cluster</CardTitle>
            <CardDescription>Total cell meeting attendance last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : !data?.clusterAttendance.length ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={data.clusterAttendance}
                  layout="vertical"
                  barSize={18}
                  margin={{ left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="clusterName" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="totalAttendance" fill="#60a5fa" radius={[0, 4, 4, 0]} name="Attendance" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Occupation + Gender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Occupation Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={200} />
            ) : !data?.occupationDistribution.length ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.occupationDistribution} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="occupation" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} name="Members" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={200} />
            ) : !data?.genderDistribution.length ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.genderDistribution}
                    dataKey="count"
                    nameKey="gender"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ gender, percent }) => `${gender} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.genderDistribution.map((entry, i) => (
                      <Cell key={entry.gender} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// First Timer Analysis
// ---------------------------------------------------------------------------

function FirstTimerAnalysis() {
  const { data, isLoading } = useQuery<{
    conversionStats: {
      convertedThisQuarter: number;
      totalThisQuarter: number;
      stillAttending: number;
      stillAttendingPct: number;
      avgServicesAttended: number;
      droppedOff: number;
      droppedOffPct: number;
    };
    attendanceFrequency: { bucket: string; label: string; count: number }[];
    retentionBySeeingAgain: { intent: string; retained: number; droppedOff: number }[];
    howHeardAbout: { source: string; count: number }[];
    enjoyedAboutService: { aspect: string; count: number }[];
  }>({
    queryKey: ["/api/analytics/first-timer-analysis"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const cs = data?.conversionStats;

  const retentionData = (data?.retentionBySeeingAgain ?? []).map((r) => ({
    intent: `Said "${r.intent}"`,
    Retained: r.retained,
    "Dropped off": r.droppedOff,
  }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Converted this quarter</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold">{cs?.convertedThisQuarter ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">from {cs?.totalThisQuarter ?? 0} first timers</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Still attending (4+ services)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold text-emerald-600">{cs?.stillAttendingPct ?? 0}%</div>
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {cs?.stillAttending ?? 0} members retained
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg services attended</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold">{cs?.avgServicesAttended ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">post-conversion</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dropped off (0–1 visits)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold text-red-500">{cs?.droppedOffPct ?? 0}%</div>
                <p className="text-xs text-red-500 mt-1">high-risk segment</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance frequency after conversion */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance frequency after conversion</CardTitle>
          <CardDescription>How many services converted members have attended since joining</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <ChartSkeleton height={300} /> : !data?.attendanceFrequency.length ? <EmptyState /> : (
            <>
              {/* Mini count badges */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {data.attendanceFrequency.map((b, i) => (
                  <div key={b.bucket} className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold" style={{ color: PALETTE[i] }}>{b.count}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-1">{b.label.replace("\\n", "\n")}</div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.attendanceFrequency} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: "Members", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => [v, "Members"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Members">
                    {data.attendanceFrequency.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Retention by seeing-again + How heard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Retention by seeing-again intent</CardTitle>
            <CardDescription>Did their first-visit intent predict whether they stuck around?</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : !retentionData.length ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={retentionData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="intent" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, "dataMax"]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Retained" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Dropped off" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How they heard about us</CardTitle>
            <CardDescription>Discovery channel distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : !data?.howHeardAbout.length ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.howHeardAbout}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ source, percent }) =>
                      percent > 0.04 ? `${source} ${(percent * 100).toFixed(0)}%` : ""
                    }
                  >
                    {data.howHeardAbout.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enjoyed about service */}
      <Card>
        <CardHeader>
          <CardTitle>What first timers enjoyed about the service</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <ChartSkeleton height={180} /> : !data?.enjoyedAboutService.length ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.enjoyedAboutService} layout="vertical" barSize={20} margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="aspect" width={130} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]} name="Responses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell Attendance Analysis
// ---------------------------------------------------------------------------

function CellAttendanceAnalysis() {
  const { data, isLoading } = useQuery<{
    attendanceTrend: { date: string; count: number }[];
    topCells: { cellName: string; clusterName: string; totalAttendance: number; avgPerMeeting: number }[];
    clusterComparison: { clusterName: string; totalAttendance: number; cellCount: number; avgPerMeeting: number }[];
    recentMeetings: { cellName: string; clusterName: string; meetingDate: string; attendees: number }[];
  }>({
    queryKey: ["/api/analytics/cell-attendance-analysis"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const formattedTrend = (data?.attendanceTrend ?? []).map((r) => ({
    count: r.count,
    date: (() => {
      try {
        return format(new Date(r.date), "dd MMM");
      } catch {
        return r.date;
      }
    })(),
  }));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cell Meetings"
          value={isLoading ? "—" : (data?.recentMeetings.length ?? "—")}
          sub="recent records"
          icon={BarChart2}
          loading={isLoading}
        />
        <StatCard
          title="Cells Tracked"
          value={isLoading ? "—" : (data?.topCells.filter(c => c.totalAttendance > 0).length ?? "—")}
          sub="with attendance records"
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Clusters Active"
          value={isLoading ? "—" : (data?.clusterComparison.filter(c => c.totalAttendance > 0).length ?? "—")}
          sub="with cell activity"
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard
          title="Avg Per Meeting"
          value={
            isLoading
              ? "—"
              : data?.topCells.length
              ? (
                  data.topCells.reduce((s, c) => s + c.avgPerMeeting, 0) /
                  Math.max(data.topCells.filter(c => c.avgPerMeeting > 0).length, 1)
                ).toFixed(1)
              : "—"
          }
          sub="members across all cells"
          icon={CheckSquare}
          loading={isLoading}
        />
      </div>

      {/* Trend + Cluster comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cell Attendance Trend</CardTitle>
            <CardDescription>Daily attendance across all cells — last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : !formattedTrend.length ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={formattedTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={false} name="Attendees" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cluster Comparison</CardTitle>
            <CardDescription>Total cell attendance by cluster (all time)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : !data?.clusterComparison.length ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.clusterComparison}
                  layout="vertical"
                  barSize={18}
                  margin={{ left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="clusterName" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: number, name: string) => [v, name]}
                  />
                  <Bar dataKey="totalAttendance" fill="#f97316" radius={[0, 4, 4, 0]} name="Total Attendance" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top cells */}
      <Card>
        <CardHeader>
          <CardTitle>Top Cells by Attendance</CardTitle>
          <CardDescription>All-time attendance leaders</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <ChartSkeleton height={300} /> : !data?.topCells.length ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.topCells.slice(0, 10)}
                layout="vertical"
                barSize={18}
                margin={{ left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="cellName" width={130} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  formatter={(v: number, name: string) => [v, name]}
                />
                <Bar dataKey="totalAttendance" fill="#34d399" radius={[0, 4, 4, 0]} name="Total Attendance" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent meetings table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cell Meetings</CardTitle>
          <CardDescription>Latest recorded meetings with attendance count</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !data?.recentMeetings.length ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Cell</th>
                    <th className="text-left pb-2 font-medium">Cluster</th>
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-right pb-2 font-medium">Attendees</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentMeetings.map((m, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-2 font-medium">{m.cellName}</td>
                      <td className="py-2 text-muted-foreground">{m.clusterName}</td>
                      <td className="py-2 text-muted-foreground">
                        {(() => {
                          try { return format(new Date(m.meetingDate), "dd MMM yyyy"); }
                          catch { return m.meetingDate; }
                        })()}
                      </td>
                      <td className="py-2 text-right">
                        <Badge variant="secondary">{m.attendees}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
      <BarChart2 className="h-8 w-8 opacity-30" />
      <p className="text-sm">No data available yet</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Reports() {
  const { dataUpdatedAt: execUpdated, isFetching: execFetching } = useQuery({
    queryKey: ["/api/analytics/executive-summary"],
    refetchInterval: REFRESH_INTERVAL,
  });
  const { isFetching: ftFetching } = useQuery({
    queryKey: ["/api/analytics/first-timer-analysis"],
    refetchInterval: REFRESH_INTERVAL,
  });
  const { isFetching: cellFetching } = useQuery({
    queryKey: ["/api/analytics/cell-attendance-analysis"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const anyFetching = execFetching || ftFetching || cellFetching;

  const lastUpdated = execUpdated
    ? format(new Date(execUpdated), "d MMM yyyy, HH:mm")
    : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-0.5">Last refreshed: {lastUpdated}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className={`h-3 w-3 ${anyFetching ? "animate-spin text-orange-500" : ""}`} />
          Auto-refreshes every 5 min
        </div>
      </div>

      <Tabs defaultValue="executive">
        <TabsList className="mb-4">
          <TabsTrigger value="executive">Executive Summary</TabsTrigger>
          <TabsTrigger value="first-timers">First Timer Analysis</TabsTrigger>
          <TabsTrigger value="cell-attendance">Cell Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <ExecutiveSummary />
        </TabsContent>
        <TabsContent value="first-timers">
          <FirstTimerAnalysis />
        </TabsContent>
        <TabsContent value="cell-attendance">
          <CellAttendanceAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
