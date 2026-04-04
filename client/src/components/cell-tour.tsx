import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  target: string;
  title: string;
  description: string;
}

const CELL_TOUR_KEY = "waypoint_cell_tour_seen";

const STEPS: TourStep[] = [
  {
    target: "cell-tour-add",
    title: "Add Cell",
    description:
      "Create a new small group cell. You'll assign it to a cluster and optionally set a cell leader.",
  },
  {
    target: "cell-tour-search",
    title: "Search Cells",
    description:
      "Filter cells by name or leader. Results update as you type across all clusters.",
  },
  {
    target: "cell-tour-cluster",
    title: "Cluster Groups",
    description:
      "Cells are organised under clusters. Click a cluster header to expand or collapse it.",
  },
  {
    target: "cell-tour-members",
    title: "View Members",
    description:
      "See all congregation members currently assigned to this cell.",
  },
  {
    target: "cell-tour-attendance",
    title: "Record Attendance",
    description:
      "Mark who attended a cell meeting. Pick a date, check off members, and review past meeting records.",
  },
  {
    target: "cell-tour-edit",
    title: "Edit Cell",
    description:
      "Update the cell's name, cluster assignment, or leader at any time.",
  },
  {
    target: "cell-tour-delete",
    title: "Delete Cell",
    description:
      "Permanently remove a cell from the system. This does not affect member profiles.",
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function CellTour({ cellsLoaded }: { cellsLoaded: boolean }) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Only show if the user hasn't seen this tour yet
  useEffect(() => {
    if (localStorage.getItem(CELL_TOUR_KEY)) return;
    // Small delay so the page has rendered
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  const positionStep = useCallback((index: number) => {
    const step = STEPS[index];
    const el = document.querySelector<HTMLElement>(`[data-cell-tour="${step.target}"]`);
    if (!el) return false;

    const rect = el.getBoundingClientRect();
    const pad = 6;
    setSpotlight({
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    });

    const tooltipWidth = 300;
    const tooltipHeight = 190;

    // Prefer placing the tooltip to the right; fall back to left or below
    let left = rect.right + 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = rect.left - tooltipWidth - 16;
    }
    if (left < 16) {
      left = Math.max(16, rect.left);
    }

    let top = rect.top + rect.height / 2 - tooltipHeight / 2;
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

    setTooltipPos({ top, left });
    return true;
  }, []);

  // Re-position whenever step changes or cells finish loading
  useEffect(() => {
    if (!visible) return;
    positionStep(stepIndex);
  }, [stepIndex, visible, cellsLoaded, positionStep]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(CELL_TOUR_KEY, "1");
  };

  const next = () => {
    if (stepIndex < STEPS.length - 1) {
      // Skip steps whose targets don't exist yet (e.g. no cells loaded)
      let next = stepIndex + 1;
      while (next < STEPS.length) {
        const el = document.querySelector(`[data-cell-tour="${STEPS[next].target}"]`);
        if (el) break;
        next++;
      }
      if (next >= STEPS.length) {
        dismiss();
      } else {
        setStepIndex(next);
      }
    } else {
      dismiss();
    }
  };

  const prev = () => {
    let prev = stepIndex - 1;
    while (prev >= 0) {
      const el = document.querySelector(`[data-cell-tour="${STEPS[prev].target}"]`);
      if (el) break;
      prev--;
    }
    if (prev >= 0) setStepIndex(prev);
  };

  if (!visible || !spotlight || !tooltipPos) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <>
      {/* Spotlight overlay */}
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
        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {stepIndex + 1} / {STEPS.length}
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
