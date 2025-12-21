import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const ALL_MEMBER_COLUMNS = [
  { id: "name", label: "Name" },
  { id: "gender", label: "Gender" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "address", label: "Address" },
  { id: "occupation", label: "Occupation" },
  { id: "cluster", label: "Cluster" },
  { id: "cell", label: "Cell" },
  { id: "status", label: "Status" },
  { id: "joinDate", label: "Join Date" },
  { id: "lastAttended", label: "Last Attended" },
  { id: "timesAttended", label: "Times Attended" },
  { id: "dateOfBirth", label: "Date of Birth" },
  { id: "followUpWorker", label: "Follow Up Worker" },
  { id: "archive", label: "Archive Status" },
];

export const DEFAULT_VISIBLE_COLUMNS = new Set([
  "name",
  "gender",
  "phone",
  "email",
  "status",
  "cluster",
  "lastAttended",
  "timesAttended",
  "actions",
]);

interface ColumnVisibilityDialogProps {
  open: boolean;
  onClose: () => void;
  visibleColumns: Set<string>;
  onToggleColumn: (columnId: string) => void;
}

export function ColumnVisibilityDialog({ 
  open, 
  onClose, 
  visibleColumns, 
  onToggleColumn 
}: ColumnVisibilityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Column Visibility</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select which columns to display in the members table.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {ALL_MEMBER_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={visibleColumns.has(column.id)}
                  onCheckedChange={() => onToggleColumn(column.id)}
                  data-testid={`checkbox-column-${column.id}`}
                />
                <Label htmlFor={column.id} className="cursor-pointer font-normal">
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
