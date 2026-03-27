import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Download, Upload, Filter, Columns, Search, GitMerge, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberTable } from "@/components/member-table";
import { MemberDialog } from "@/components/member-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { MergeDuplicatesDialog } from "@/components/merge-duplicates-dialog";
import { ColumnVisibilityDialog, DEFAULT_VISIBLE_COLUMNS } from "@/components/column-visibility-dialog";
import { MemberFilters } from "@/components/member-filters";
import type { MemberWithAttendanceStats, PaginatedResult } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_LIMIT = 50;

export default function Members() {
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<MemberWithAttendanceStats | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(DEFAULT_VISIBLE_COLUMNS)
  );
  const [filters, setFilters] = useState({
    status: "",
    gender: "",
    occupation: "",
    cluster: "",
  });

  // Debounce search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setPage(1);
    }, 300);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.gender, filters.occupation, filters.cluster]);

  const handleToggleColumn = useCallback((columnId: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const { data: result, isLoading, isError, error } = useQuery<PaginatedResult<MemberWithAttendanceStats>>({
    queryKey: [
      "/api/members",
      filters.status,
      filters.gender,
      filters.occupation,
      filters.cluster,
      searchTerm,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.gender) params.append("gender", filters.gender);
      if (filters.occupation) params.append("occupation", filters.occupation);
      if (filters.cluster) params.append("cluster", filters.cluster);
      if (searchTerm) params.append("search", searchTerm);
      params.append("page", String(page));
      params.append("limit", String(PAGE_LIMIT));
      const res = await fetch(`/api/members?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const members = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const total = result?.total ?? 0;

  const handleEdit = (member: MemberWithAttendanceStats) => {
    setSelectedMember(member);
    setShowMemberDialog(true);
  };

  const handleDialogClose = () => {
    setShowMemberDialog(false);
    setSelectedMember(null);
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/members/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Members</h1>
          <p className="text-muted-foreground">Manage your church member database</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowMemberDialog(true)}
            data-testid="button-add-member"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
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
          <Button
            variant="outline"
            onClick={() => setShowMergeDialog(true)}
            data-testid="button-find-duplicates"
          >
            <GitMerge className="w-4 h-4 mr-2" />
            Find Duplicates
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-filters"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowColumnDialog(true)}
            data-testid="button-columns"
          >
            <Columns className="w-4 h-4 mr-2" />
            Columns
          </Button>
        </div>
      </div>

      {showFilters && (
        <MemberFilters filters={filters} onFiltersChange={setFilters} />
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-destructive">
          Failed to load members: {(error as Error)?.message ?? "Unknown error"}
        </div>
      ) : (
        <MemberTable members={members} onEdit={handleEdit} visibleColumns={visibleColumns} />
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * PAGE_LIMIT) + 1}–{Math.min(page * PAGE_LIMIT, total)} of {total} members
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

      {showMemberDialog && (
        <MemberDialog
          member={selectedMember}
          open={showMemberDialog}
          onClose={handleDialogClose}
        />
      )}

      {showImportDialog && (
        <ImportDialog
          type="members"
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
        />
      )}

      {showColumnDialog && (
        <ColumnVisibilityDialog
          open={showColumnDialog}
          onClose={() => setShowColumnDialog(false)}
          visibleColumns={visibleColumns}
          onToggleColumn={handleToggleColumn}
        />
      )}

      {showMergeDialog && (
        <MergeDuplicatesDialog
          open={showMergeDialog}
          onClose={() => setShowMergeDialog(false)}
        />
      )}
    </div>
  );
}
