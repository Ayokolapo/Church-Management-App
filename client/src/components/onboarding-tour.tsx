import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface TourStep {
  target: string;
  title: string;
  description: string;
}

const MAIN_STEPS: TourStep[] = [
  {
    target: "nav-dashboard",
    title: "Dashboard",
    description:
      "Your church at a glance. See key metrics like total members, recent attendance, new visitors this week, and upcoming follow-up tasks.",
  },
  {
    target: "nav-members",
    title: "Members",
    description:
      "The heart of the system. View, add, edit, and manage all congregation members. Filter by status, gender, cluster, or search by name.",
  },
  {
    target: "nav-first-timers",
    title: "First Timers",
    description:
      "Track new visitors to your services. Follow up with them, mark conversions, and watch them become full members of the church.",
  },
  {
    target: "nav-attendance",
    title: "Attendance",
    description:
      "Record service and cell attendance. Track engagement over time and identify members who may need a follow-up.",
  },
  {
    target: "nav-cells",
    title: "Cells",
    description:
      "Manage your small groups. Assign cell leaders, track membership, and record cell meeting attendance.",
  },
  {
    target: "nav-outreach",
    title: "Outreach",
    description:
      "Track contacts made during outreach activities. Follow their journey from first contact to full church membership.",
  },
  {
    target: "nav-follow-up-tasks",
    title: "Follow-up Tasks",
    description:
      "Create and assign pastoral follow-up tasks to team members. Stay on top of who needs a call, visit, or prayer.",
  },
  {
    target: "nav-communications",
    title: "Communications",
    description:
      "Send bulk SMS or email messages to members, filtered by any criteria. Keep your congregation informed and engaged.",
  },
];

const ADMIN_STEPS: TourStep[] = [
  {
    target: "nav-branches",
    title: "Branches",
    description:
      "Manage your church's branches or campuses. Each branch has its own data while sharing the same system.",
  },
  {
    target: "nav-users",
    title: "User Management",
    description:
      "Manage staff accounts. View all registered users, assign roles, and control who has access to the system.",
  },
  {
    target: "nav-roles-permissions",
    title: "Roles & Permissions",
    description:
      "Configure what each role can see and do. Customise permissions for Super Admin, Branch Admin, Cell Leader, and more.",
  },
  {
    target: "nav-admin-settings",
    title: "Admin Settings",
    description:
      "Configure system settings including SMTP email, notification templates, and other church-wide preferences.",
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

async function markOnboardingComplete() {
  const res = await fetch("/api/onboarding/complete", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to complete onboarding");
}

export function OnboardingTour() {
  const { user, hasAdminAccess } = useAuth();
  const queryClient = useQueryClient();

  const steps = hasAdminAccess
    ? [...MAIN_STEPS, ...ADMIN_STEPS]
    : MAIN_STEPS;

  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const completeMutation = useMutation({
    mutationFn: markOnboardingComplete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const shouldShow =
    !!user &&
    user.loginCount <= 2 &&
    !user.onboardingCompleted;

  const positionStep = useCallback(
    (index: number) => {
      const step = steps[index];
      const el = document.querySelector<HTMLElement>(
        `[data-onboarding="${step.target}"]`
      );
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const pad = 6;
      setSpotlight({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });

      // Position tooltip to the right of sidebar; fall back to left if near edge
      const tooltipWidth = 300;
      const rightEdge = rect.right + 16 + tooltipWidth;
      const left =
        rightEdge < window.innerWidth
          ? rect.right + 16
          : rect.left - tooltipWidth - 16;

      const tooltipHeight = 180;
      let top = rect.top + rect.height / 2 - tooltipHeight / 2;
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

      setTooltipPos({ top, left });
    },
    [steps]
  );

  useEffect(() => {
    if (!shouldShow) return;
    // Small delay so sidebar has rendered
    const t = setTimeout(() => {
      setVisible(true);
      positionStep(0);
    }, 600);
    return () => clearTimeout(t);
  }, [shouldShow, positionStep]);

  useEffect(() => {
    if (!visible) return;
    positionStep(stepIndex);
  }, [stepIndex, visible, positionStep]);

  const dismiss = () => {
    setVisible(false);
    completeMutation.mutate();
  };

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  if (!shouldShow || !visible || !spotlight || !tooltipPos) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <>
      {/* Spotlight overlay — the huge box-shadow creates the dark curtain */}
      <div
        style={{
          position: "fixed",
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          borderRadius: 8,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.60)",
          border: "2px solid rgb(249 115 22)",
          zIndex: 9998,
          pointerEvents: "none",
          transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
        }}
      />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 300,
          zIndex: 9999,
          transition: "top 0.25s ease, left 0.25s ease",
        }}
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-orange-200 dark:border-orange-900 p-4 flex flex-col gap-3"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <span className="font-semibold text-sm text-foreground">{step.title}</span>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button size="sm" variant="ghost" onClick={prev} className="h-7 px-2">
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={next}
              className="h-7 px-3 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isLast ? "Done" : (
                <>
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
