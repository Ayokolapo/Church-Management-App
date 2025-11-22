import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Download, Upload, Filter, Columns, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberTable } from "@/components/member-table";
import { MemberDialog } from "@/components/member-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { ColumnVisibilityDialog } from "@/components/column-visibility-dialog";
import { MemberFilters } from "@/components/member-filters";
import type { MemberWithAttendanceStats } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Members() {
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberWithAttendanceStats | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    gender: "",
    occupation: "",
    cluster: "",
  });

  const { data: allMembers, isLoading } = useQuery<MemberWithAttendanceStats[]>({
    queryKey: [
      "/api/members",
      filters.status,
      filters.gender,
      filters.occupation,
      filters.cluster,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.gender) params.append("gender", filters.gender);
      if (filters.occupation) params.append("occupation", filters.occupation);
      if (filters.cluster) params.append("cluster", filters.cluster);
      
      const url = `/api/members${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  // Client-side search filtering
  const members = allMembers?.filter((member) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(search) ||
      member.lastName.toLowerCase().includes(search) ||
      member.mobilePhone.includes(search) ||
      member.email?.toLowerCase().includes(search)
    );
  });

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
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      ) : (
        <MemberTable members={members || []} onEdit={handleEdit} />
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
        />
      )}
    </div>
  );
}
