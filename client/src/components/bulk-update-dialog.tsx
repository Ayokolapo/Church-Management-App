import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BulkUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  count: number;
  onConfirm: (updates: Record<string, string>) => void;
  isPending: boolean;
}

const FIELD_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "cluster", label: "Cluster" },
  { value: "archive", label: "Archive Status" },
  { value: "followUpWorker", label: "Follow Up Worker" },
  { value: "cell", label: "Cell" },
];

const FIELD_VALUES: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: "Crowd", label: "Crowd" },
    { value: "Potential", label: "Potential" },
    { value: "Committed", label: "Committed" },
    { value: "Volunteer", label: "Volunteer" },
    { value: "Worker", label: "Worker" },
    { value: "Leader", label: "Leader" },
  ],
  archive: [
    { value: "Active", label: "Active" },
    { value: "Relocated", label: "Relocated" },
    { value: "Has a church", label: "Has a church" },
    { value: "Wrong number", label: "Wrong number" },
    { value: "Unreachable", label: "Unreachable" },
    { value: "Not interested", label: "Not interested" },
  ],
};

export function BulkUpdateDialog({ open, onClose, count, onConfirm, isPending }: BulkUpdateDialogProps) {
  const [field, setField] = useState("");
  const [value, setValue] = useState("");

  const valueOptions = field ? FIELD_VALUES[field] : undefined;

  const handleConfirm = () => {
    if (!field || !value) return;
    onConfirm({ [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update {count} Member(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Field to update</Label>
            <Select value={field} onValueChange={(v) => { setField(v); setValue(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a field..." />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {field && valueOptions ? (
            <div className="space-y-2">
              <Label>New value</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a value..." />
                </SelectTrigger>
                <SelectContent>
                  {valueOptions.map(v => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : field ? (
            <div className="space-y-2">
              <Label>New value</Label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Enter value..."
                value={value}
                onChange={e => setValue(e.target.value)}
              />
            </div>
          ) : null}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!field || !value || isPending}>
              {isPending ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
