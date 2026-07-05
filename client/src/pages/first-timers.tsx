import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Upload, ExternalLink, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FirstTimerTable } from "@/components/first-timer-table";
import { ImportDialog } from "@/components/import-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertFirstTimerSchema, type FirstTimer, type InsertFirstTimer, type PaginatedResult, type Branch } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const PAGE_LIMIT = 50;

const ENJOYMENT_OPTIONS = [
  { id: "Sermon", label: "Sermon" },
  { id: "Prayer", label: "Prayer" },
  { id: "Praise and worship", label: "Praise and Worship" },
  { id: "Ambience", label: "Ambience" },
];

export default function FirstTimers() {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFirstTimer, setEditingFirstTimer] = useState<FirstTimer | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [seeingAgain, setSeeingAgain] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { toast } = useToast();

  const editForm = useForm<InsertFirstTimer>({
    resolver: zodResolver(insertFirstTimerSchema),
    defaultValues: {
      firstName: "", lastName: "", gender: "Male", mobilePhone: "", email: "",
      address: "", dateOfBirth: "", closestAxis: "", basedInCity: "Yes",
      seeingAgain: "Yes", enjoyedAboutService: [], howHeardAbout: "Oikia member",
      whoInvited: "", feedback: "", branchId: "",
    },
  });

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(PAGE_LIMIT));
  if (search) params.set("search", search);
  if (seeingAgain) params.set("seeingAgain", seeingAgain);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const { data: result, isLoading } = useQuery<PaginatedResult<FirstTimer>>({
    queryKey: ["/api/first-timers", page, search, seeingAgain, dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/first-timers?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch first timers");
      return res.json();
    },
    staleTime: 0,
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    staleTime: 0,
  });

  const firstTimers = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const total = result?.total ?? 0;

  const hasFilters = search || seeingAgain || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setSeeingAgain("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const convertMutation = useMutation({
    mutationFn: async (firstTimerId: string) => {
      return await apiRequest("POST", `/api/first-timers/${firstTimerId}/convert`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/first-timers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members/list"] });
      toast({
        title: "Success",
        description: "First timer converted to member successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to convert first timer to member",
        variant: "destructive",
      });
    },
  });

  const handleConvert = (firstTimerId: string) => {
    convertMutation.mutate(firstTimerId);
  };

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFirstTimer> }) => {
      return await apiRequest("PATCH", `/api/first-timers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/first-timers"] });
      setShowEditDialog(false);
      setEditingFirstTimer(null);
      toast({ title: "Success", description: "First timer updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update first timer", variant: "destructive" });
    },
  });

  const handleOpenEdit = (ft: FirstTimer) => {
    setEditingFirstTimer(ft);
    editForm.reset({
      firstName: ft.firstName,
      lastName: ft.lastName,
      gender: ft.gender as InsertFirstTimer["gender"],
      mobilePhone: ft.mobilePhone,
      email: ft.email || "",
      address: ft.address || "",
      dateOfBirth: ft.dateOfBirth || "",
      closestAxis: ft.closestAxis,
      basedInCity: ft.basedInCity as InsertFirstTimer["basedInCity"],
      seeingAgain: ft.seeingAgain as InsertFirstTimer["seeingAgain"],
      enjoyedAboutService: (ft.enjoyedAboutService || []) as InsertFirstTimer["enjoyedAboutService"],
      howHeardAbout: ft.howHeardAbout as InsertFirstTimer["howHeardAbout"],
      whoInvited: ft.whoInvited || "",
      feedback: ft.feedback || "",
      branchId: ft.branchId || "",
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = (data: InsertFirstTimer) => {
    if (!editingFirstTimer) return;
    editMutation.mutate({ id: editingFirstTimer.id, data });
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/first-timers/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `first-timers-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const [selectedBranchId, setSelectedBranchId] = useState("");

  const BASE_URL = "https://occwaypoint.com/first-timer-form";

  const toBranchSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const selectedBranch = branches?.find((b) => b.id === selectedBranchId);
  const displayUrl = selectedBranch
    ? `${BASE_URL}/${toBranchSlug(selectedBranch.name)}`
    : BASE_URL;

  const copyFormLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "Form link copied to clipboard",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">First Timers</h1>
          <p className="text-muted-foreground">Manage first-time visitors and convert them to members</p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      {/* Form links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">First Timer Form Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with first-time visitors. Optionally pick a branch to get a pre-filled URL.
          </p>
          <div className="flex items-center gap-3">
            <Label className="text-sm shrink-0">Branch</Label>
            <Select
              value={selectedBranchId || "general"}
              onValueChange={(v) => setSelectedBranchId(v === "general" ? "" : v)}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="General (no branch)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General (no branch)</SelectItem>
                {branches?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div
              className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all"
              data-testid="text-form-url"
            >
              {displayUrl}
            </div>
            <Button onClick={() => copyFormLink(displayUrl)} variant="outline" size="sm" data-testid="button-copy-link">
              Copy
            </Button>
            <Button asChild variant="outline" size="sm" data-testid="button-open-form">
              <a
                href={selectedBranch ? `/first-timer-form/${toBranchSlug(selectedBranch.name)}` : "/first-timer-form"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Search name or phone</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Seeing again</Label>
              <Select
                value={seeingAgain || "all"}
                onValueChange={(v) => { setSeeingAgain(v === "all" ? "" : v); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Maybe">Maybe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date from</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date to</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {total} result{total !== 1 ? "s" : ""} found
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" />
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <FirstTimerTable
          firstTimers={firstTimers}
          onConvert={handleConvert}
          isConverting={convertMutation.isPending}
          onEdit={handleOpenEdit}
        />
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * PAGE_LIMIT) + 1}–{Math.min(page * PAGE_LIMIT, total)} of {total} first timers
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

      {showImportDialog && (
        <ImportDialog
          type="first-timers"
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
        />
      )}

      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingFirstTimer(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit First Timer — {editingFirstTimer?.firstName} {editingFirstTimer?.lastName}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="gender" render={({ field }) => (
                  <FormItem><FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="mobilePhone" render={({ field }) => (
                  <FormItem><FormLabel>Mobile Phone *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={editForm.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="branchId" render={({ field }) => (
                  <FormItem><FormLabel>Branch</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No branch</SelectItem>
                        {branches?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="closestAxis" render={({ field }) => (
                  <FormItem><FormLabel>Closest Axis *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="basedInCity" render={({ field }) => (
                  <FormItem><FormLabel>Based in City? *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="seeingAgain" render={({ field }) => (
                  <FormItem><FormLabel>Seeing Again? *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Maybe">Maybe</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={editForm.control} name="enjoyedAboutService" render={() => (
                <FormItem>
                  <FormLabel>Enjoyed About Service *</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {ENJOYMENT_OPTIONS.map((opt) => (
                      <FormField key={opt.id} control={editForm.control} name="enjoyedAboutService" render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(opt.id as any)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                field.onChange(checked ? [...current, opt.id as any] : current.filter((v) => v !== opt.id));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">{opt.label}</FormLabel>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={editForm.control} name="howHeardAbout" render={({ field }) => (
                <FormItem><FormLabel>How Heard About *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Oikia member">Oikia member</SelectItem>
                      <SelectItem value="Social media">Social media</SelectItem>
                      <SelectItem value="Billboard/Lamp post">Billboard/Lamp post</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />

              <FormField control={editForm.control} name="whoInvited" render={({ field }) => (
                <FormItem><FormLabel>Who Invited</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={editForm.control} name="feedback" render={({ field }) => (
                <FormItem><FormLabel>Feedback</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowEditDialog(false); setEditingFirstTimer(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
