import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MemberSlim } from "@shared/schema";

interface AttendanceListProps {
  members: MemberSlim[];
  attendanceData: Record<string, string>;
  onToggle: (memberId: string, currentStatus: string) => void;
  isUpdating: boolean;
}

export function AttendanceList({ members, attendanceData, onToggle, isUpdating }: AttendanceListProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No members found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const status = attendanceData[member.id] || "Absent";
        const isPresent = status === "Present";

        return (
          <Card key={member.id} data-testid={`card-attendance-${member.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-medium">
                      {member.firstName} {member.lastName}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {member.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="font-mono">{member.mobilePhone}</span>
                    {member.email && <span>{member.email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${isPresent ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isPresent ? "Present" : "Absent"}
                    </div>
                  </div>
                  <Switch
                    checked={isPresent}
                    onCheckedChange={() => onToggle(member.id, status)}
                    disabled={isUpdating}
                    data-testid={`switch-attendance-${member.id}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
