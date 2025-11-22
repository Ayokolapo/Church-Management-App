import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ColumnVisibilityDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ColumnVisibilityDialog({ open, onClose }: ColumnVisibilityDialogProps) {
  const columns = [
    { id: "name", label: "Name", checked: true },
    { id: "gender", label: "Gender", checked: true },
    { id: "phone", label: "Phone", checked: true },
    { id: "email", label: "Email", checked: true },
    { id: "address", label: "Address", checked: false },
    { id: "occupation", label: "Occupation", checked: false },
    { id: "cluster", label: "Cluster", checked: true },
    { id: "cell", label: "Cell", checked: false },
    { id: "status", label: "Status", checked: true },
    { id: "joinDate", label: "Join Date", checked: false },
    { id: "lastAttended", label: "Last Attended", checked: true },
    { id: "timesAttended", label: "Times Attended", checked: true },
    { id: "dateOfBirth", label: "Date of Birth", checked: false },
    { id: "followUpWorker", label: "Follow Up Worker", checked: false },
    { id: "archive", label: "Archive Status", checked: false },
  ];

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
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  defaultChecked={column.checked}
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
