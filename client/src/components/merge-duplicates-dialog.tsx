import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { GitMerge, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Member } from "@shared/schema";

interface DuplicateGroup {
  reason: string;
  members: Member[];
}

interface MergeDuplicatesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MergeDuplicatesDialog({ open, onClose }: MergeDuplicatesDialogProps) {
  const { toast } = useToast();
  const [primaryIds, setPrimaryIds] = useState<Record<number, string>>({});
  const [mergingIndex, setMergingIndex] = useState<number | null>(null);

  const { data: groups, isLoading, isError, error, refetch } = useQuery<DuplicateGroup[]>({
    queryKey: ["/api/members/duplicates"],
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await fetch("/api/members/duplicates", { credentials: "include" });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json() as Promise<DuplicateGroup[]>;
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ primaryId, duplicateIds }: { primaryId: string; duplicateIds: string[] }) => {
      return await apiRequest("POST", "/api/members/merge", { primaryId, duplicateIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Merged", description: "Members merged successfully." });
      setMergingIndex(null);
      refetch();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to merge members.", variant: "destructive" });
      setMergingIndex(null);
    },
  });

  const handleMerge = (groupIndex: number, group: DuplicateGroup) => {
    const primaryId = primaryIds[groupIndex] ?? group.members[0].id;
    const duplicateIds = group.members.map(m => m.id).filter(id => id !== primaryId);
    setMergingIndex(groupIndex);
    mergeMutation.mutate({ primaryId, duplicateIds });
  };

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            Find &amp; Merge Duplicates
          </DialogTitle>
          <DialogDescription>
            Select the primary record to keep in each group, then click Merge.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 py-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center gap-3 py-10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">Failed to load duplicates</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              {(error as Error)?.message ?? "Unknown error"}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && groups?.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <p className="text-sm font-medium">No duplicates detected.</p>
          </div>
        )}

        {!isLoading && !isError && groups && groups.length > 0 && (
          <div className="space-y-6 py-2">
            {groups.map((group, gi) => {
              const selectedPrimary = primaryIds[gi] ?? group.members[0].id;
              const isMerging = mergingIndex === gi && mergeMutation.isPending;

              return (
                <div key={gi} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {group.reason}
                  </div>

                  <RadioGroup
                    value={selectedPrimary}
                    onValueChange={(val) => setPrimaryIds(prev => ({ ...prev, [gi]: val }))}
                    className="space-y-2"
                  >
                    {group.members.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                          selectedPrimary === m.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setPrimaryIds(prev => ({ ...prev, [gi]: m.id }))}
                      >
                        <RadioGroupItem value={m.id} id={`${gi}-${m.id}`} className="mt-0.5" />
                        <Label htmlFor={`${gi}-${m.id}`} className="cursor-pointer flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">
                              {m.firstName} {m.lastName}
                            </span>
                            <Badge variant="outline" className="text-xs">{m.status}</Badge>
                            {selectedPrimary === m.id && (
                              <Badge className="text-xs">Primary</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <span>Phone: {m.mobilePhone}</span>
                            <span>Email: {m.email || "—"}</span>
                            <span>DOB: {formatDate(m.dateOfBirth)}</span>
                            <span>Joined: {formatDate(m.joinDate)}</span>
                            <span>Cluster: {m.cluster}</span>
                            <span>Gender: {m.gender}</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleMerge(gi, group)}
                      disabled={isMerging || mergeMutation.isPending}
                    >
                      <GitMerge className="w-4 h-4 mr-1.5" />
                      {isMerging ? "Merging..." : "Merge"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
