import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Upload, ExternalLink, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FirstTimerTable } from "@/components/first-timer-table";
import { ImportDialog } from "@/components/import-dialog";
import type { FirstTimer, PaginatedResult, Branch } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const PAGE_LIMIT = 50;

export default function FirstTimers() {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [seeingAgain, setSeeingAgain] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { toast } = useToast();

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(PAGE_LIMIT));
  if (search) params.set("search", search);
  if (seeingAgain) params.set("seeingAgain", seeingAgain);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const { data: result, isLoading } = useQuery<PaginatedResult<FirstTimer>>({
    queryKey: ["/api/first-timers", page, search, seeingAgain, dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/first-timers?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch first timers");
      return res.json();
    },
    staleTime: 0,
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    staleTime: 0,
  });

  const firstTimers = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const total = result?.total ?? 0;

  const hasFilters = search || seeingAgain || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setSeeingAgain("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

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

  const [selectedBranchId, setSelectedBranchId] = useState("");

  const BASE_URL = "https://occwaypoint.com/first-timer-form";

  const toBranchSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const selectedBranch = branches?.find((b) => b.id === selectedBranchId);
  const displayUrl = selectedBranch
    ? `${BASE_URL}/${toBranchSlug(selectedBranch.name)}`
    : BASE_URL;

  const copyFormLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "Form link copied to clipboard",
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

      {/* Form links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">First Timer Form Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with first-time visitors. Optionally pick a branch to get a pre-filled URL.
          </p>
          <div className="flex items-center gap-3">
            <Label className="text-sm shrink-0">Branch</Label>
            <Select
              value={selectedBranchId || "general"}
              onValueChange={(v) => setSelectedBranchId(v === "general" ? "" : v)}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="General (no branch)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General (no branch)</SelectItem>
                {branches?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div
              className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all"
              data-testid="text-form-url"
            >
              {displayUrl}
            </div>
            <Button onClick={() => copyFormLink(displayUrl)} variant="outline" size="sm" data-testid="button-copy-link">
              Copy
            </Button>
            <Button asChild variant="outline" size="sm" data-testid="button-open-form">
              <a
                href={selectedBranch ? `/first-timer-form/${toBranchSlug(selectedBranch.name)}` : "/first-timer-form"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Search name or phone</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Seeing again</Label>
              <Select
                value={seeingAgain || "all"}
                onValueChange={(v) => { setSeeingAgain(v === "all" ? "" : v); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Maybe">Maybe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date from</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date to</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {total} result{total !== 1 ? "s" : ""} found
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" />
                Clear filters
              </Button>
            </div>
          )}
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
