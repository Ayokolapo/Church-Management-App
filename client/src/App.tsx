import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OnboardingTour } from "@/components/onboarding-tour";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import FirstTimers from "@/pages/first-timers";
import Attendance from "@/pages/attendance";
import Cells from "@/pages/cells";
import Communications from "@/pages/communications";
import FollowUpTasks from "@/pages/follow-up-tasks";
import FirstTimerForm from "@/pages/first-timer-form";
import Branches from "@/pages/branches";
import Users from "@/pages/users";
import RolesPermissions from "@/pages/roles-permissions";
import AuthPage from "@/pages/auth-page";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Outreach from "@/pages/outreach";
import AdminSettings from "@/pages/admin-settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/members" component={Members} />
      <Route path="/first-timers" component={FirstTimers} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/cells" component={Cells} />
      <Route path="/communications" component={Communications} />
      <Route path="/follow-up-tasks" component={FollowUpTasks} />
      <Route path="/first-timer-form" component={FirstTimerForm} />
      <Route path="/branches" component={Branches} />
      <Route path="/users" component={Users} />
      <Route path="/roles-permissions" component={RolesPermissions} />
      <Route path="/outreach" component={Outreach} />
      <Route path="/admin-settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PendingRolePage() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-6">
        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Account Pending</h1>
          <p className="text-muted-foreground">
            Your account has been created. An administrator will review your
            registration and assign your role shortly.
          </p>
          <p className="text-sm text-muted-foreground">
            Please check back later or contact your church administrator for
            assistance.
          </p>
        </div>
        <a
          href="/api/logout"
          className="text-sm text-orange-500 hover:text-orange-600 underline underline-offset-4"
        >
          Sign out
        </a>
      </div>
    </div>
  );
}

function AppShell() {
  const { isAuthenticated, isLoading, userRole, isRoleLoading } = useAuth();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const hasRole = !!userRole;

  // Public routes always rendered regardless of auth state
  return (
    <Switch>
      <Route path="/first-timer-form">
        <FirstTimerForm />
      </Route>
      <Route path="/forgot-password">
        <ForgotPassword />
      </Route>
      <Route path="/reset-password">
        <ResetPassword />
      </Route>
      <Route>
        {isLoading || (isAuthenticated && isRoleLoading) ? (
          <div className="flex h-screen items-center justify-center">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !isAuthenticated ? (
          <AuthPage />
        ) : !hasRole ? (
          <PendingRolePage />
        ) : (
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b bg-background">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                </header>
                <main className="flex-1 overflow-y-auto">
                  <Router />
                </main>
              </div>
            </div>
            <OnboardingTour />
          </SidebarProvider>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
