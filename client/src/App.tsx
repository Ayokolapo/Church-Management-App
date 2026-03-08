import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
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
import Outreach from "@/pages/outreach";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Public routes always rendered regardless of auth state
  return (
    <Switch>
      <Route path="/first-timer-form">
        <FirstTimerForm />
      </Route>
      <Route>
        {isLoading ? (
          <div className="flex h-screen items-center justify-center">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !isAuthenticated ? (
          <AuthPage />
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
