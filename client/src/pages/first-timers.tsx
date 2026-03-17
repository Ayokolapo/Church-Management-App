import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Upload, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FirstTimerTable } from "@/components/first-timer-table";
import { ImportDialog } from "@/components/import-dialog";
import type { FirstTimer, PaginatedResult } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PAGE_LIMIT = 50;

export default function FirstTimers() {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const { data: result, isLoading } = useQuery<PaginatedResult<FirstTimer>>({
    queryKey: ["/api/first-timers", page],
    queryFn: async () => {
      const res = await fetch(`/api/first-timers?page=${page}&limit=${PAGE_LIMIT}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch first timers");
      return res.json();
    },
  });

  const firstTimers = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const total = result?.total ?? 0;

  const convertMutation = useMutation({
    mutationFn: async (firstTimerId: string) => {
      return await apiRequest("POST", `/api/first-timers/${firstTimerId}/convert`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/first-timers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members/list"] });
      toast({
        title: "Success",
        description: "First timer converted to member successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to convert first timer to member",
        variant: "destructive",
      });
    },
  });

  const handleConvert = (firstTimerId: string) => {
    convertMutation.mutate(firstTimerId);
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/first-timers/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `first-timers-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const firstTimerFormUrl = `${window.location.origin}/first-timer-form`;

  const copyFormLink = () => {
    navigator.clipboard.writeText(firstTimerFormUrl);
    toast({
      title: "Copied",
      description: "First timer form link copied to clipboard",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">First Timers</h1>
          <p className="text-muted-foreground">Manage first-time visitors and convert them to members</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
            data-testid="button-import"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            data-testid="button-export"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">First Timer Form Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with first-time visitors to collect their information
          </p>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2 bg-muted rounded-md text-sm font-mono break-all" data-testid="text-form-url">
              {firstTimerFormUrl}
            </div>
            <Button onClick={copyFormLink} variant="outline" data-testid="button-copy-link">
              Copy Link
            </Button>
            <Button asChild variant="outline" data-testid="button-open-form">
              <a href="/first-timer-form" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Form
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <FirstTimerTable
          firstTimers={firstTimers}
          onConvert={handleConvert}
          isConverting={convertMutation.isPending}
        />
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * PAGE_LIMIT) + 1}–{Math.min(page * PAGE_LIMIT, total)} of {total} first timers
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showImportDialog && (
        <ImportDialog
          type="first-timers"
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </div>
  );
}
