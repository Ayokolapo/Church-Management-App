import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MemberWithAttendanceStats } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface MemberTableProps {
  members: MemberWithAttendanceStats[];
  onEdit: (member: MemberWithAttendanceStats) => void;
}

export function MemberTable({ members, onEdit }: MemberTableProps) {
  const { toast } = useToast();
  const [visibleColumns] = useState<Set<string>>(
    new Set([
      "name",
      "gender",
      "phone",
      "email",
      "status",
      "cluster",
      "lastAttended",
      "timesAttended",
      "actions",
    ])
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/members/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Success",
        description: "Member deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete member",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Leader":
        return "default";
      case "Worker":
        return "secondary";
      case "Committed":
        return "outline";
      default:
        return "outline";
    }
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No members found. Add your first member to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.has("name") && <TableHead>Name</TableHead>}
            {visibleColumns.has("gender") && <TableHead>Gender</TableHead>}
            {visibleColumns.has("phone") && <TableHead className="font-mono">Phone</TableHead>}
            {visibleColumns.has("email") && <TableHead>Email</TableHead>}
            {visibleColumns.has("status") && <TableHead>Status</TableHead>}
            {visibleColumns.has("cluster") && <TableHead>Cluster</TableHead>}
            {visibleColumns.has("lastAttended") && <TableHead>Last Attended</TableHead>}
            {visibleColumns.has("timesAttended") && <TableHead>Times Attended</TableHead>}
            {visibleColumns.has("actions") && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
              {visibleColumns.has("name") && (
                <TableCell className="font-medium">
                  {member.firstName} {member.lastName}
                </TableCell>
              )}
              {visibleColumns.has("gender") && <TableCell>{member.gender}</TableCell>}
              {visibleColumns.has("phone") && (
                <TableCell className="font-mono text-sm">{member.mobilePhone}</TableCell>
              )}
              {visibleColumns.has("email") && (
                <TableCell className="text-sm">{member.email || "-"}</TableCell>
              )}
              {visibleColumns.has("status") && (
                <TableCell>
                  <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
                </TableCell>
              )}
              {visibleColumns.has("cluster") && <TableCell>{member.cluster}</TableCell>}
              {visibleColumns.has("lastAttended") && (
                <TableCell className="text-sm">
                  {member.lastAttended
                    ? formatDistanceToNow(new Date(member.lastAttended), { addSuffix: true })
                    : "Never"}
                </TableCell>
              )}
              {visibleColumns.has("timesAttended") && (
                <TableCell className="text-center">{member.timesAttended}</TableCell>
              )}
              {visibleColumns.has("actions") && (
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(member)}
                    data-testid={`button-edit-${member.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(member.id, `${member.firstName} ${member.lastName}`)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${member.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
