import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MessageSquare, Mail, Send, History } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MemberWithAttendanceStats, Communication } from "@shared/schema";

export default function Communications() {
  const { toast } = useToast();
  const [communicationType, setCommunicationType] = useState<"SMS" | "Email">("SMS");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sentBy, setSentBy] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [occupationFilter, setOccupationFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("");

  const { data: members, isLoading: membersLoading } = useQuery<MemberWithAttendanceStats[]>({
    queryKey: ["/api/members", { 
      status: statusFilter === "all" ? "" : statusFilter, 
      gender: genderFilter === "all" ? "" : genderFilter, 
      occupation: occupationFilter === "all" ? "" : occupationFilter, 
      cluster: clusterFilter 
    }],
  });

  const { data: communications, isLoading: commsLoading } = useQuery<Communication[]>({
    queryKey: ["/api/communications"],
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const filters = JSON.stringify({ 
        status: statusFilter === "all" ? "" : statusFilter, 
        gender: genderFilter === "all" ? "" : genderFilter, 
        occupation: occupationFilter === "all" ? "" : occupationFilter, 
        cluster: clusterFilter 
      });
      return await apiRequest("POST", "/api/communications/send", {
        type: communicationType,
        subject: communicationType === "Email" ? subject : undefined,
        message,
        recipientCount: members?.length || 0,
        filters,
        sentBy,
      });
    },
    onSuccess: () => {
      toast({
        title: "Communication Sent",
        description: `${communicationType} sent to ${members?.length || 0} recipients`,
      });
      setMessage("");
      setSubject("");
      setSentBy("");
      setShowConfirmDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Send Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim()) {
      toast({
        title: "Validation Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    if (!sentBy.trim()) {
      toast({
        title: "Validation Error",
        description: "Sender name is required",
        variant: "destructive",
      });
      return;
    }

    if (!members || members.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please select filters to choose recipients",
        variant: "destructive",
      });
      return;
    }

    if (communicationType === "Email" && !subject.trim()) {
      toast({
        title: "Validation Error",
        description: "Email subject is required",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const recipientCount = members?.length || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Bulk Communications</h1>
        <p className="text-muted-foreground">Send SMS or email to filtered member groups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="comm-type">Communication Type</Label>
                <Select value={communicationType} onValueChange={(val) => setCommunicationType(val as "SMS" | "Email")}>
                  <SelectTrigger id="comm-type" data-testid="select-comm-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>SMS</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {communicationType === "Email" && (
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                    data-testid="input-subject"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Enter your ${communicationType.toLowerCase()} message...`}
                  rows={8}
                  data-testid="textarea-message"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length} characters{communicationType === "SMS" && message.length > 160 ? " (Multiple SMS)" : ""}
                </p>
              </div>

              <div>
                <Label htmlFor="sent-by">Sent By (Your Name)</Label>
                <Input
                  id="sent-by"
                  value={sentBy}
                  onChange={(e) => setSentBy(e.target.value)}
                  placeholder="Enter your name"
                  data-testid="input-sent-by"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm">
                  <span className="font-medium">{recipientCount}</span> recipients selected
                </div>
                <Button
                  onClick={handleSend}
                  disabled={sendMutation.isPending || !message || !sentBy || recipientCount === 0}
                  data-testid="button-send"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMutation.isPending ? "Sending..." : `Send ${communicationType}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Communication History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !communications || communications.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No communication history yet
                </div>
              ) : (
                <div className="space-y-3">
                  {communications.map((comm) => (
                    <div key={comm.id} className="border rounded-md p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {comm.type === "SMS" ? (
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Mail className="h-4 w-4 text-purple-500" />
                          )}
                          <span className="font-medium">{comm.type}</span>
                          {comm.subject && <span className="text-sm text-muted-foreground">• {comm.subject}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comm.createdAt), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{comm.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{comm.recipientCount} recipients</span>
                        <span>Sent by: {comm.sentBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Select Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status-filter">Member Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" data-testid="select-status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Crowd">Crowd</SelectItem>
                    <SelectItem value="Potential">Potential</SelectItem>
                    <SelectItem value="Committed">Committed</SelectItem>
                    <SelectItem value="Worker">Worker</SelectItem>
                    <SelectItem value="Leader">Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gender-filter">Gender</Label>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger id="gender-filter" data-testid="select-gender-filter">
                    <SelectValue placeholder="All genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genders</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="occupation-filter">Occupation</Label>
                <Select value={occupationFilter} onValueChange={setOccupationFilter}>
                  <SelectTrigger id="occupation-filter" data-testid="select-occupation-filter">
                    <SelectValue placeholder="All occupations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All occupations</SelectItem>
                    <SelectItem value="Students">Students</SelectItem>
                    <SelectItem value="Workers">Workers</SelectItem>
                    <SelectItem value="Unemployed">Unemployed</SelectItem>
                    <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cluster-filter">Cluster</Label>
                <Input
                  id="cluster-filter"
                  value={clusterFilter}
                  onChange={(e) => setClusterFilter(e.target.value)}
                  placeholder="Enter cluster name"
                  data-testid="input-cluster-filter"
                />
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm font-medium mb-2">Preview</div>
                {membersLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Recipients:</span>
                      <span className="font-medium">{recipientCount}</span>
                    </div>
                    {statusFilter && (
                      <div className="text-xs text-muted-foreground">
                        Status: {statusFilter}
                      </div>
                    )}
                    {genderFilter && (
                      <div className="text-xs text-muted-foreground">
                        Gender: {genderFilter}
                      </div>
                    )}
                    {occupationFilter && (
                      <div className="text-xs text-muted-foreground">
                        Occupation: {occupationFilter}
                      </div>
                    )}
                    {clusterFilter && (
                      <div className="text-xs text-muted-foreground">
                        Cluster: {clusterFilter}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {communicationType} Send</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send a {communicationType.toLowerCase()} to <strong>{recipientCount} recipients</strong>.
              {communicationType === "SMS" && message.length > 160 && (
                <span className="block mt-2 text-orange-600">
                  Note: This message will be sent as multiple SMS messages ({Math.ceil(message.length / 160)} parts).
                </span>
              )}
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Message Preview:</p>
                <p className="text-sm mt-1">{message.substring(0, 100)}{message.length > 100 ? "..." : ""}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-send">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => sendMutation.mutate()} data-testid="button-confirm-send">
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
