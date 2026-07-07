import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SmartBulkUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TimesOp = "any" | "at_least" | "at_most" | "between" | "exactly";
type LastAttendedPreset =
  | "" | "within30" | "within90" | "within180"
  | "over30" | "over60" | "over90" | "over180" | "over365" | "never";

function buildCriteriaParams(
  timesOp: TimesOp,
  timesMin: string,
  timesMax: string,
  lastAttended: LastAttendedPreset,
  statusFilter: string,
) {
  const params: Record<string, string> = {};

  const min = parseInt(timesMin, 10);
  const max = parseInt(timesMax, 10);
  if (timesOp === "at_least" && !isNaN(min)) params.minAttended = String(min);
  else if (timesOp === "at_most" && !isNaN(max)) params.maxAttended = String(max);
  else if (timesOp === "exactly" && !isNaN(min)) { params.minAttended = String(min); params.maxAttended = String(min); }
  else if (timesOp === "between") {
    if (!isNaN(min)) params.minAttended = String(min);
    if (!isNaN(max)) params.maxAttended = String(max);
  }

  switch (lastAttended) {
    case "within30":  params.lastAttendedWithin = "30"; break;
    case "within90":  params.lastAttendedWithin = "90"; break;
    case "within180": params.lastAttendedWithin = "180"; break;
    case "over30":    params.notAttendedSince = "30"; break;
    case "over60":    params.notAttendedSince = "60"; break;
    case "over90":    params.notAttendedSince = "90"; break;
    case "over180":   params.notAttendedSince = "180"; break;
    case "over365":   params.notAttendedSince = "365"; break;
    case "never":     params.notAttendedSince = "36500"; break;
  }

  if (statusFilter) params.status = statusFilter;
  return params;
}

export function SmartBulkUpdateDialog({ open, onClose, onSuccess }: SmartBulkUpdateDialogProps) {
  const { toast } = useToast();

  // Criteria state
  const [timesOp, setTimesOp] = useState<TimesOp>("any");
  const [timesMin, setTimesMin] = useState("4");
  const [timesMax, setTimesMax] = useState("10");
  const [lastAttended, setLastAttended] = useState<LastAttendedPreset>("");
  const [statusFilter, setStatusFilter] = useState("");

  // Updates state
  const [newStatus, setNewStatus] = useState("");
  const [newArchive, setNewArchive] = useState("");

  // Debounced criteria for count query
  const [debouncedParams, setDebouncedParams] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedParams(buildCriteriaParams(timesOp, timesMin, timesMax, lastAttended, statusFilter));
    }, 400);
  }, [timesOp, timesMin, timesMax, lastAttended, statusFilter]);

  const hasCriteria = Object.keys(debouncedParams).length > 0;

  const { data: countData, isFetching: countFetching } = useQuery<{ count: number }>({
    queryKey: ["/api/members/count-by-criteria", debouncedParams],
    queryFn: async () => {
      const qs = new URLSearchParams(debouncedParams).toString();
      const res = await fetch(`/api/members/count-by-criteria?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to count");
      return res.json();
    },
    enabled: hasCriteria,
    staleTime: 0,
  });

  const count = hasCriteria ? (countData?.count ?? 0) : 0;

  const updateMutation = useMutation({
    mutationFn: async () => {
      const criteria = buildCriteriaParams(timesOp, timesMin, timesMax, lastAttended, statusFilter);
      const updates: Record<string, string> = {};
      if (newStatus) updates.status = newStatus;
      if (newArchive) updates.archive = newArchive;
      const res = await apiRequest("PATCH", "/api/members/bulk-by-criteria", { criteria, updates });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Done", description: `${data.updated} member(s) updated` });
      onSuccess();
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update members", variant: "destructive" });
    },
  });

  const canApply = hasCriteria && count > 0 && (newStatus || newArchive) && !updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Smart Bulk Update</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Criteria */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Step 1 — Who to update</p>

            <div className="space-y-2">
              <Label>Times attended (Sunday + Cell)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={timesOp} onValueChange={(v) => setTimesOp(v as TimesOp)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any amount</SelectItem>
                    <SelectItem value="at_least">At least</SelectItem>
                    <SelectItem value="at_most">At most</SelectItem>
                    <SelectItem value="between">Between</SelectItem>
                    <SelectItem value="exactly">Exactly</SelectItem>
                  </SelectContent>
                </Select>

                {timesOp === "between" ? (
                  <>
                    <Input
                      type="number"
                      min={0}
                      value={timesMin}
                      onChange={(e) => setTimesMin(e.target.value)}
                      className="w-20"
                      placeholder="min"
                    />
                    <span className="text-sm text-muted-foreground">and</span>
                    <Input
                      type="number"
                      min={0}
                      value={timesMax}
                      onChange={(e) => setTimesMax(e.target.value)}
                      className="w-20"
                      placeholder="max"
                    />
                    <span className="text-sm text-muted-foreground">times</span>
                  </>
                ) : timesOp === "at_most" ? (
                  <>
                    <Input
                      type="number"
                      min={0}
                      value={timesMax}
                      onChange={(e) => setTimesMax(e.target.value)}
                      className="w-24"
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground">times</span>
                  </>
                ) : timesOp !== "any" ? (
                  <>
                    <Input
                      type="number"
                      min={0}
                      value={timesMin}
                      onChange={(e) => setTimesMin(e.target.value)}
                      className="w-24"
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground">times</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Last attended</Label>
              <Select value={lastAttended || "__any__"} onValueChange={(v) => setLastAttended(v === "__any__" ? "" : v as LastAttendedPreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any time</SelectItem>
                  <SelectItem value="within30">Within last 30 days</SelectItem>
                  <SelectItem value="within90">Within last 90 days</SelectItem>
                  <SelectItem value="within180">Within last 180 days</SelectItem>
                  <SelectItem value="over30">Not attended in 30+ days</SelectItem>
                  <SelectItem value="over60">Not attended in 60+ days</SelectItem>
                  <SelectItem value="over90">Not attended in 90+ days</SelectItem>
                  <SelectItem value="over180">Not attended in 180+ days</SelectItem>
                  <SelectItem value="over365">Not attended in 1+ year</SelectItem>
                  <SelectItem value="never">Never attended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Current status (optional — leave blank for all)</Label>
              <Select value={statusFilter || "__any__"} onValueChange={(v) => setStatusFilter(v === "__any__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">All statuses</SelectItem>
                  <SelectItem value="Crowd">Crowd</SelectItem>
                  <SelectItem value="Potential">Potential</SelectItem>
                  <SelectItem value="Committed">Committed</SelectItem>
                  <SelectItem value="Worker">Worker</SelectItem>
                  <SelectItem value="Leader">Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Live count preview */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              {countFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              {!hasCriteria ? (
                <span className="text-sm text-muted-foreground">Set at least one criterion above to preview</span>
              ) : countFetching ? (
                <span className="text-sm text-muted-foreground">Counting…</span>
              ) : (
                <span className="text-sm">
                  <Badge variant={count > 0 ? "default" : "secondary"} className="mr-1">{count}</Badge>
                  member{count !== 1 ? "s" : ""} match{count === 1 ? "es" : ""} these criteria
                </span>
              )}
            </div>
          </div>

          {/* Updates */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Step 2 — What to change</p>

            <div className="space-y-2">
              <Label>Set status to</Label>
              <Select value={newStatus || "__keep__"} onValueChange={(v) => setNewStatus(v === "__keep__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__keep__">Keep current</SelectItem>
                  <SelectItem value="Crowd">Crowd</SelectItem>
                  <SelectItem value="Potential">Potential</SelectItem>
                  <SelectItem value="Committed">Committed</SelectItem>
                  <SelectItem value="Worker">Worker</SelectItem>
                  <SelectItem value="Leader">Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Set archive status to</Label>
              <Select value={newArchive || "__keep__"} onValueChange={(v) => setNewArchive(v === "__keep__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__keep__">Keep current</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Relocated">Relocated</SelectItem>
                  <SelectItem value="Has a church">Has a church</SelectItem>
                  <SelectItem value="Wrong number">Wrong number</SelectItem>
                  <SelectItem value="Unreachable">Unreachable</SelectItem>
                  <SelectItem value="Not interested">Not interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={!canApply}>
            {updateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
            ) : (
              `Update ${count} Member${count !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
