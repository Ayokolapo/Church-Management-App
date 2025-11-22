import { UserCheck } from "lucide-react";
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
import type { FirstTimer } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface FirstTimerTableProps {
  firstTimers: FirstTimer[];
  onConvert: (id: string) => void;
  isConverting: boolean;
}

export function FirstTimerTable({ firstTimers, onConvert, isConverting }: FirstTimerTableProps) {
  if (firstTimers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No first timers yet. Share the form link to start collecting submissions.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead className="font-mono">Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Closest Axis</TableHead>
            <TableHead>Seeing Again</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {firstTimers.map((firstTimer) => (
            <TableRow key={firstTimer.id} data-testid={`row-first-timer-${firstTimer.id}`}>
              <TableCell className="font-medium">
                {firstTimer.firstName} {firstTimer.lastName}
              </TableCell>
              <TableCell>{firstTimer.gender}</TableCell>
              <TableCell className="font-mono text-sm">{firstTimer.mobilePhone}</TableCell>
              <TableCell className="text-sm">{firstTimer.email || "-"}</TableCell>
              <TableCell>{firstTimer.closestAxis}</TableCell>
              <TableCell>
                <Badge variant={firstTimer.seeingAgain === "Yes" ? "default" : "outline"}>
                  {firstTimer.seeingAgain}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {formatDistanceToNow(new Date(firstTimer.createdAt), { addSuffix: true })}
              </TableCell>
              <TableCell>
                {firstTimer.convertedToMember ? (
                  <Badge variant="secondary">Converted</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {!firstTimer.convertedToMember && (
                  <Button
                    size="sm"
                    onClick={() => onConvert(firstTimer.id)}
                    disabled={isConverting}
                    data-testid={`button-convert-${firstTimer.id}`}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Convert to Member
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
