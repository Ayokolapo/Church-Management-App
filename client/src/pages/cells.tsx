import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Users, Calendar, Trash2, Edit, ChevronDown, ChevronRight, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CellWithMembers, MemberSlim, CellAttendanceWithMember, ClusterWithCells, UserWithRole } from "@shared/schema";
import { CellTour } from "@/components/cell-tour";

const cellFormSchema = z.object({
  name: z.string().min(1, "Cell name is required"),
  clusterId: z.string().min(1, "Cluster is required"),
  leader: z.string().optional(),
});

type CellFormData = z.infer<typeof cellFormSchema>;

export default function Cells() {
  const { toast } = useToast();
  const [showCellDialog, setShowCellDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CellWithMembers | null>(null);
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [attendanceMemberSearch, setAttendanceMemberSearch] = useState("");
  const [showCellMembersOnly, setShowCellMembersOnly] = useState(false);

  const { data: cells, isLoading: cellsLoading } = useQuery<CellWithMembers[]>({
    queryKey: ["/api/cells"],
  });

  const { data: clustersData } = useQuery<ClusterWithCells[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: usersData } = useQuery<UserWithRole[]>({
    queryKey: ["/api/users"],
  });

  const { data: allMembers } = useQuery<MemberSlim[]>({
    queryKey: ["/api/members/list"],
  });

  const { data: cellAttendance } = useQuery<CellAttendanceWithMember[]>({
    queryKey: ["/api/cells", selectedCell?.id, "attendance", attendanceDate],
    queryFn: async () => {
      if (!selectedCell) return [];
      const res = await fetch(`/api/cells/${selectedCell.id}/attendance?meetingDate=${attendanceDate}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
    enabled: !!selectedCell && showAttendanceDialog,
  });

  const { data: meetingDates } = useQuery<string[]>({
    queryKey: ["/api/cells", selectedCell?.id, "meeting-dates"],
    queryFn: async () => {
      if (!selectedCell) return [];
      const res = await fetch(`/api/cells/${selectedCell.id}/meeting-dates`);
      if (!res.ok) throw new Error("Failed to fetch meeting dates");
      return res.json();
    },
    enabled: !!selectedCell && showAttendanceDialog,
    staleTime: 0,
  });

  const form = useForm<CellFormData>({
    resolver: zodResolver(cellFormSchema),
    defaultValues: {
      name: "",
      clusterId: "",
      leader: "",
    },
  });

  const createCellMutation = useMutation({
    mutationFn: async (data: CellFormData) => {
      return apiRequest("POST", "/api/cells", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cells"] });
      toast({ title: "Cell created successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create cell", description: error.message, variant: "destructive" });
    },
  });

  const updateCellMutation = useMutation({
    mutationFn: async (data: CellFormData) => {
      return apiRequest("PATCH", `/api/cells/${selectedCell?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cells"] });
      toast({ title: "Cell updated successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update cell", description: error.message, variant: "destructive" });
    },
  });

  const deleteCellMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/cells/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cells"] });
      toast({ title: "Cell deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete cell", description: error.message, variant: "destructive" });
    },
  });

  const recordAttendanceMutation = useMutation({
    mutationFn: async ({ cellId, memberId, meetingDate }: { cellId: string; memberId: string; meetingDate: string }) => {
      return apiRequest("POST", `/api/cells/${cellId}/attendance`, { memberId, meetingDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cells", selectedCell?.id, "attendance"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record attendance", description: error.message, variant: "destructive" });
    },
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      return apiRequest("DELETE", `/api/cell-attendance/${attendanceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cells", selectedCell?.id, "attendance"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove attendance", description: error.message, variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setShowCellDialog(false);
    setSelectedCell(null);
    form.reset({ name: "", clusterId: "", leader: "" });
  };

  const handleEditCell = (cell: CellWithMembers) => {
    setSelectedCell(cell);
    form.reset({
      name: cell.name,
      clusterId: cell.clusterId,
      leader: cell.leader || "",
    });
    setShowCellDialog(true);
  };

  const handleOpenAttendance = (cell: CellWithMembers) => {
    setSelectedCell(cell);
    setSelectedMembers(new Set());
    setAttendanceMemberSearch("");
    setShowCellMembersOnly(false);
    setShowAttendanceDialog(true);
  };

  const handleViewMembers = (cell: CellWithMembers) => {
    setSelectedCell(cell);
    setShowMembersDialog(true);
  };

  const handleSubmit = (data: CellFormData) => {
    if (selectedCell) {
      updateCellMutation.mutate(data);
    } else {
      createCellMutation.mutate(data);
    }
  };

  const handleToggleMemberAttendance = async (memberId: string, isPresent: boolean) => {
    if (!selectedCell) return;

    if (isPresent) {
      setSelectedMembers(prev => {
        const newSet = new Set(prev);
        newSet.add(memberId);
        return newSet;
      });
      recordAttendanceMutation.mutate({
        cellId: selectedCell.id,
        memberId,
        meetingDate: attendanceDate,
      });
    } else {
      setSelectedMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
      const existingRecord = cellAttendance?.find(a => a.memberId === memberId);
      if (existingRecord) {
        deleteAttendanceMutation.mutate(existingRecord.id);
      }
    }
  };

  const toggleCluster = (clusterName: string) => {
    setCollapsedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterName)) {
        newSet.delete(clusterName);
      } else {
        newSet.add(clusterName);
      }
      return newSet;
    });
  };

  const groupedCells = cells?.reduce((acc, cell) => {
    const key = cell.clusterName || "Unknown Cluster";
    if (!acc[key]) acc[key] = [];
    acc[key].push(cell);
    return acc;
  }, {} as Record<string, CellWithMembers[]>) || {};

  const filteredGroupedCells = Object.entries(groupedCells).reduce((acc, [clusterName, clusterCells]) => {
    const filtered = clusterCells.filter(cell =>
      cell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cell.leader?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[clusterName] = filtered;
    }
    return acc;
  }, {} as Record<string, CellWithMembers[]>);

  const cellMembers = selectedCell ? allMembers?.filter(m => m.cell === selectedCell.name) : [];

  const filteredAttendanceMembers = (allMembers ?? []).filter(m => {
    if (showCellMembersOnly && m.cell !== selectedCell?.name) return false;
    if (!attendanceMemberSearch) return true;
    const s = attendanceMemberSearch.toLowerCase();
    return `${m.firstName} ${m.lastName}`.toLowerCase().includes(s) ||
      m.mobilePhone.includes(s);
  });

  const allVisiblePresent = filteredAttendanceMembers.length > 0 &&
    filteredAttendanceMembers.every(m => cellAttendance?.some(a => a.memberId === m.id) || selectedMembers.has(m.id));
  const someVisiblePresent = filteredAttendanceMembers.some(m => cellAttendance?.some(a => a.memberId === m.id) || selectedMembers.has(m.id));

  const handleSelectAll = () => {
    filteredAttendanceMembers.forEach(m => {
      const isPresent = cellAttendance?.some(a => a.memberId === m.id) || selectedMembers.has(m.id);
      if (allVisiblePresent ? isPresent : !isPresent) {
        handleToggleMemberAttendance(m.id, !allVisiblePresent);
      }
    });
  };

  const presentCount = cellAttendance?.length ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Cells</h1>
          <p className="text-muted-foreground">Manage small groups and cell meetings</p>
        </div>
        <Button onClick={() => setShowCellDialog(true)} data-testid="button-add-cell" data-cell-tour="cell-tour-add">
          <Plus className="w-4 h-4 mr-2" />
          Add Cell
        </Button>
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search cells by name or leader..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search"
          data-cell-tour="cell-tour-search"
        />
      </div>

      {cellsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : Object.keys(filteredGroupedCells).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? "No cells found matching your search." : "No cells created yet. Click 'Add Cell' to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredGroupedCells).map(([clusterName, clusterCells], clusterIndex) => {
            const isExpanded = !collapsedClusters.has(clusterName);

            return (
              <Card key={clusterName}>
                <CardHeader
                  className="cursor-pointer hover-elevate"
                  onClick={() => toggleCluster(clusterName)}
                  data-testid={`cluster-header-${clusterName.toLowerCase().replace(/\s+/g, '-')}`}
                  {...(clusterIndex === 0 ? { "data-cell-tour": "cell-tour-cluster" } : {})}
                >
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    {clusterName}
                    <Badge variant="secondary" className="ml-2">
                      {clusterCells.length} {clusterCells.length === 1 ? "cell" : "cells"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {clusterCells.map((cell, cellIndex) => {
                        const isFirstCell = clusterIndex === 0 && cellIndex === 0;
                        return (
                        <Card key={cell.id} className="border" data-testid={`card-cell-${cell.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold" data-testid={`text-cell-name-${cell.id}`}>{cell.name}</h3>
                                {cell.leader && (
                                  <p className="text-sm text-muted-foreground">Leader: {cell.leader}</p>
                                )}
                              </div>
                              <Badge variant="outline">
                                <Users className="w-3 h-3 mr-1" />
                                {cell.memberCount}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewMembers(cell)}
                                data-testid={`button-view-members-${cell.id}`}
                                {...(isFirstCell ? { "data-cell-tour": "cell-tour-members" } : {})}
                              >
                                <Users className="w-4 h-4 mr-1" />
                                Members
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAttendance(cell)}
                                data-testid={`button-attendance-${cell.id}`}
                                {...(isFirstCell ? { "data-cell-tour": "cell-tour-attendance" } : {})}
                              >
                                <Calendar className="w-4 h-4 mr-1" />
                                Attendance
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCell(cell)}
                                data-testid={`button-edit-${cell.id}`}
                                {...(isFirstCell ? { "data-cell-tour": "cell-tour-edit" } : {})}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCellMutation.mutate(cell.id)}
                                data-testid={`button-delete-${cell.id}`}
                                {...(isFirstCell ? { "data-cell-tour": "cell-tour-delete" } : {})}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCellDialog} onOpenChange={setShowCellDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCell ? "Edit Cell" : "Add New Cell"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cell Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter cell name" data-testid="input-cell-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clusterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cluster</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-cluster">
                          <SelectValue placeholder="Select cluster" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clustersData?.map(cluster => (
                          <SelectItem key={cluster.id} value={cluster.id}>
                            {cluster.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leader"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cell Leader (Optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-cell-leader">
                          <SelectValue placeholder="Select a leader" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No leader</SelectItem>
                        {usersData?.map((user) => {
                          const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
                          return (
                            <SelectItem key={user.id} value={fullName}>
                              {fullName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCellMutation.isPending || updateCellMutation.isPending}
                  data-testid="button-submit-cell"
                >
                  {selectedCell ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Members of {selectedCell?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cellMembers && cellMembers.length > 0 ? (
              cellMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`member-item-${member.id}`}
                >
                  <div>
                    <p className="font-medium">{member.firstName} {member.lastName}</p>
                    <p className="text-sm text-muted-foreground">{member.mobilePhone}</p>
                  </div>
                  <Badge variant="outline">{member.status}</Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No members assigned to this cell yet.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembersDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CellTour cellsLoaded={!cellsLoading && !!cells} />

      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>Cell Attendance — {selectedCell?.name}</span>
              <Badge variant="secondary" className="ml-2">
                <Check className="w-3 h-3 mr-1" />
                {presentCount} present
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Date picker */}
            <div>
              <label className="text-sm font-medium">Meeting Date</label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => {
                  setAttendanceDate(e.target.value);
                  setSelectedMembers(new Set());
                }}
                className="mt-1"
                data-testid="input-meeting-date"
              />
            </div>

            {/* Past meetings quick-select */}
            {meetingDates && meetingDates.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Past meetings</p>
                <div className="flex flex-wrap gap-1">
                  {meetingDates.slice(0, 8).map(date => (
                    <Button
                      key={date}
                      variant={attendanceDate === date ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => {
                        setAttendanceDate(date);
                        setSelectedMembers(new Set());
                      }}
                    >
                      {format(new Date(date + "T00:00:00"), "MMM d")}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={attendanceMemberSearch}
                  onChange={(e) => setAttendanceMemberSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-attendance-search"
                />
              </div>
              <Button
                variant={showCellMembersOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCellMembersOnly(v => !v)}
                className="shrink-0"
              >
                <Users className="w-4 h-4 mr-1" />
                Cell only
              </Button>
            </div>

            {/* Member list */}
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {filteredAttendanceMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  {attendanceMemberSearch || showCellMembersOnly ? "No members match your search." : "No members found."}
                </p>
              ) : (
                <>
                  {/* Select all row */}
                  <div
                    className="flex items-center gap-3 px-2.5 py-2 rounded-md bg-muted/50 cursor-pointer"
                    onClick={handleSelectAll}
                  >
                    <Checkbox
                      checked={allVisiblePresent ? true : someVisiblePresent ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      {allVisiblePresent ? "Deselect all" : "Select all"} ({filteredAttendanceMembers.length})
                    </span>
                  </div>
                </>
              )}
              {filteredAttendanceMembers.map(member => {
                const isPresent = cellAttendance?.some(a => a.memberId === member.id) || selectedMembers.has(member.id);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2.5 border rounded-md hover-elevate cursor-pointer"
                    onClick={() => handleToggleMemberAttendance(member.id, !isPresent)}
                    data-testid={`attendance-member-${member.id}`}
                  >
                    <Checkbox
                      checked={isPresent}
                      onCheckedChange={(checked) => handleToggleMemberAttendance(member.id, !!checked)}
                      data-testid={`checkbox-attendance-${member.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                      <p className="text-xs text-muted-foreground">{member.mobilePhone}</p>
                    </div>
                    {isPresent && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttendanceDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
