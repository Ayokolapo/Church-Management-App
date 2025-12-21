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
import type { CellWithMembers, MemberWithAttendanceStats, CellAttendanceWithMember } from "@shared/schema";

const cellFormSchema = z.object({
  name: z.string().min(1, "Cell name is required"),
  cluster: z.string().min(1, "Cluster is required"),
  leader: z.string().optional(),
});

type CellFormData = z.infer<typeof cellFormSchema>;

const clusters = ["Cluster A", "Cluster B", "Cluster C", "Cluster D", "Cluster E"];

export default function Cells() {
  const { toast } = useToast();
  const [showCellDialog, setShowCellDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CellWithMembers | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set(clusters));
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const { data: cells, isLoading: cellsLoading } = useQuery<CellWithMembers[]>({
    queryKey: ["/api/cells"],
  });

  const { data: allMembers } = useQuery<MemberWithAttendanceStats[]>({
    queryKey: ["/api/members"],
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

  const form = useForm<CellFormData>({
    resolver: zodResolver(cellFormSchema),
    defaultValues: {
      name: "",
      cluster: "",
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
    form.reset({ name: "", cluster: "", leader: "" });
  };

  const handleEditCell = (cell: CellWithMembers) => {
    setSelectedCell(cell);
    form.reset({
      name: cell.name,
      cluster: cell.cluster,
      leader: cell.leader || "",
    });
    setShowCellDialog(true);
  };

  const handleOpenAttendance = (cell: CellWithMembers) => {
    setSelectedCell(cell);
    setSelectedMembers(new Set());
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

  const toggleCluster = (cluster: string) => {
    setExpandedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cluster)) {
        newSet.delete(cluster);
      } else {
        newSet.add(cluster);
      }
      return newSet;
    });
  };

  const groupedCells = cells?.reduce((acc, cell) => {
    if (!acc[cell.cluster]) {
      acc[cell.cluster] = [];
    }
    acc[cell.cluster].push(cell);
    return acc;
  }, {} as Record<string, CellWithMembers[]>) || {};

  const filteredGroupedCells = Object.entries(groupedCells).reduce((acc, [cluster, clusterCells]) => {
    const filtered = clusterCells.filter(cell => 
      cell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cell.leader?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[cluster] = filtered;
    }
    return acc;
  }, {} as Record<string, CellWithMembers[]>);

  const cellMembers = selectedCell ? allMembers?.filter(m => m.cell === selectedCell.name) : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Cells</h1>
          <p className="text-muted-foreground">Manage small groups and cell meetings</p>
        </div>
        <Button onClick={() => setShowCellDialog(true)} data-testid="button-add-cell">
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
          {clusters.map(cluster => {
            const clusterCells = filteredGroupedCells[cluster];
            if (!clusterCells || clusterCells.length === 0) return null;
            
            const isExpanded = expandedClusters.has(cluster);
            
            return (
              <Card key={cluster}>
                <CardHeader 
                  className="cursor-pointer hover-elevate"
                  onClick={() => toggleCluster(cluster)}
                  data-testid={`cluster-header-${cluster.toLowerCase().replace(' ', '-')}`}
                >
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    {cluster}
                    <Badge variant="secondary" className="ml-2">
                      {clusterCells.length} {clusterCells.length === 1 ? "cell" : "cells"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {clusterCells.map(cell => (
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
                              >
                                <Users className="w-4 h-4 mr-1" />
                                Members
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAttendance(cell)}
                                data-testid={`button-attendance-${cell.id}`}
                              >
                                <Calendar className="w-4 h-4 mr-1" />
                                Attendance
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCell(cell)}
                                data-testid={`button-edit-${cell.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCellMutation.mutate(cell.id)}
                                data-testid={`button-delete-${cell.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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
                name="cluster"
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
                        {clusters.map(cluster => (
                          <SelectItem key={cluster} value={cluster}>
                            {cluster}
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
                    <FormLabel>Leader (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter leader name" data-testid="input-leader" />
                    </FormControl>
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

      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Attendance - {selectedCell?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Meeting Date</label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="mt-1"
                data-testid="input-meeting-date"
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-2">
                Select members who attended:
              </p>
              {cellMembers && cellMembers.length > 0 ? (
                cellMembers.map(member => {
                  const isPresent = cellAttendance?.some(a => a.memberId === member.id) || selectedMembers.has(member.id);
                  return (
                    <div 
                      key={member.id} 
                      className="flex items-center gap-3 p-3 border rounded-md hover-elevate cursor-pointer"
                      onClick={() => handleToggleMemberAttendance(member.id, !isPresent)}
                      data-testid={`attendance-member-${member.id}`}
                    >
                      <Checkbox
                        checked={isPresent}
                        onCheckedChange={(checked) => handleToggleMemberAttendance(member.id, !!checked)}
                        data-testid={`checkbox-attendance-${member.id}`}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{member.firstName} {member.lastName}</p>
                        <p className="text-sm text-muted-foreground">{member.mobilePhone}</p>
                      </div>
                      {isPresent && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No members assigned to this cell. Assign members first before recording attendance.
                </p>
              )}
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
