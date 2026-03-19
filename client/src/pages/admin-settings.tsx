import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Settings, Mail, Eye, RotateCcw, Save, Send, Wifi } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SmtpSettings {
  id: string;
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  fromName: string;
  security: "starttls" | "ssl" | "none";
  enabled: boolean;
  hasPassword: boolean;
}

interface TemplateMetadata {
  name: string;
  description: string;
  variables: string[];
}

interface EmailTemplate extends TemplateMetadata {
  subject: string;
  htmlContent: string;
  isCustomized: boolean;
}

const TEMPLATE_LABELS: Record<string, string> = {
  signup_confirmation: "Signup Confirmation",
  password_reset: "Password Reset",
  password_changed: "Password Changed",
  role_assigned: "Role Assigned",
  general_notification: "General Notification",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ---- SMTP state ----
  const [smtpForm, setSmtpForm] = useState({
    host: "",
    port: "587",
    username: "",
    password: "",
    fromEmail: "",
    fromName: "",
    security: "starttls" as "starttls" | "ssl" | "none",
    enabled: false,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  // ---- Template state ----
  const [selectedTemplate, setSelectedTemplate] = useState("signup_confirmation");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  // ---- Load SMTP settings ----
  const { data: smtpSettings } = useQuery<SmtpSettings | null>({
    queryKey: ["/api/admin/smtp-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/smtp-settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load SMTP settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (smtpSettings) {
      setSmtpForm({
        host: smtpSettings.host,
        port: String(smtpSettings.port),
        username: smtpSettings.username,
        password: "", // never pre-fill password
        fromEmail: smtpSettings.fromEmail,
        fromName: smtpSettings.fromName,
        security: smtpSettings.security,
        enabled: smtpSettings.enabled,
      });
      setSettingsSaved(true);
    }
  }, [smtpSettings]);

  // ---- Load template list ----
  const { data: templateList } = useQuery<TemplateMetadata[]>({
    queryKey: ["/api/admin/email-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/email-templates", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load templates");
      return res.json();
    },
  });

  // ---- Load selected template ----
  const { data: currentTemplate, isLoading: templateLoading } = useQuery<EmailTemplate>({
    queryKey: ["/api/admin/email-templates", selectedTemplate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/email-templates/${selectedTemplate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load template");
      return res.json();
    },
    enabled: !!selectedTemplate,
  });

  useEffect(() => {
    if (currentTemplate) {
      setTemplateSubject(currentTemplate.subject);
      setTemplateHtml(currentTemplate.htmlContent);
    }
  }, [currentTemplate]);

  // ---- Save SMTP ----
  const saveSmtpMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/smtp-settings", smtpForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smtp-settings"] });
      setSettingsSaved(true);
      setSmtpForm(prev => ({ ...prev, password: "" }));
      toast({ title: "Settings saved", description: "SMTP configuration has been saved." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    },
  });

  // ---- Test connection ----
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/smtp-settings/test", {
        host: smtpForm.host,
        port: smtpForm.port,
        username: smtpForm.username,
        password: smtpForm.password || undefined,
        security: smtpForm.security,
      });
    },
    onSuccess: (data: any) => {
      toast({ title: "Connection successful", description: data.message });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Connection failed", description: err.message });
    },
  });

  // ---- Send test email ----
  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/smtp-settings/send-test", { toEmail: testEmail });
    },
    onSuccess: (data: any) => {
      toast({ title: "Test email sent", description: data.message });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Send failed", description: err.message });
    },
  });

  // ---- Save template ----
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/email-templates/${selectedTemplate}`, {
        subject: templateSubject,
        htmlContent: templateHtml,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates", selectedTemplate] });
      toast({ title: "Template saved" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    },
  });

  // ---- Reset template ----
  const resetTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/email-templates/${selectedTemplate}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to reset");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates", selectedTemplate] });
      setTemplateSubject(data.subject);
      setTemplateHtml(data.htmlContent);
      toast({ title: "Template reset to default" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Reset failed", description: err.message });
    },
  });

  const currentMeta = templateList?.find(t => t.name === selectedTemplate);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-orange-500" />
        <h1 className="text-2xl font-semibold">Admin Settings</h1>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: SMTP Configuration                                       */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-500" />
            Email Configuration (SMTP)
          </CardTitle>
          <CardDescription>Configure your outgoing mail server settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={smtpForm.host}
                onChange={e => setSmtpForm(p => ({ ...p, host: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                placeholder="587"
                value={smtpForm.port}
                onChange={e => setSmtpForm(p => ({ ...p, port: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Username</Label>
              <Input
                id="smtp-user"
                placeholder="your-email@gmail.com"
                value={smtpForm.username}
                onChange={e => setSmtpForm(p => ({ ...p, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">
                Password
                {smtpSettings?.hasPassword && !smtpForm.password && (
                  <span className="ml-2 text-xs text-muted-foreground">(leave blank to keep existing)</span>
                )}
              </Label>
              <Input
                id="smtp-pass"
                type="password"
                placeholder="App password"
                value={smtpForm.password}
                onChange={e => setSmtpForm(p => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-from-email">From Email</Label>
              <Input
                id="smtp-from-email"
                placeholder="noreply@yourchurch.com"
                value={smtpForm.fromEmail}
                onChange={e => setSmtpForm(p => ({ ...p, fromEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-from-name">From Name</Label>
              <Input
                id="smtp-from-name"
                placeholder="The Waypoint"
                value={smtpForm.fromName}
                onChange={e => setSmtpForm(p => ({ ...p, fromName: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <Label>Security</Label>
              <Select
                value={smtpForm.security}
                onValueChange={val =>
                  setSmtpForm(p => ({ ...p, security: val as "starttls" | "ssl" | "none" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starttls">STARTTLS — Port 587</SelectItem>
                  <SelectItem value="ssl">SSL — Port 465</SelectItem>
                  <SelectItem value="none">None — Port 25</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="smtp-enabled"
                checked={smtpForm.enabled}
                onCheckedChange={val => setSmtpForm(p => ({ ...p, enabled: val }))}
              />
              <Label htmlFor="smtp-enabled" className="cursor-pointer">
                {smtpForm.enabled ? "Email sending enabled" : "Email sending disabled"}
              </Label>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => saveSmtpMutation.mutate()}
              disabled={saveSmtpMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveSmtpMutation.isPending ? "Saving…" : "Save Settings"}
            </Button>
            <Button
              variant="outline"
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending || !smtpForm.host || !smtpForm.username}
            >
              <Wifi className="w-4 h-4 mr-2" />
              {testConnectionMutation.isPending ? "Testing…" : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Send Test Email                                          */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-orange-500" />
            Send Test Email
          </CardTitle>
          <CardDescription>
            Send a test email to verify your SMTP configuration is working end-to-end.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              onClick={() => sendTestEmailMutation.mutate()}
              disabled={sendTestEmailMutation.isPending || !settingsSaved || !testEmail}
            >
              <Send className="w-4 h-4 mr-2" />
              {sendTestEmailMutation.isPending ? "Sending…" : "Send Test Email"}
            </Button>
          </div>
          {!settingsSaved && (
            <p className="text-sm text-muted-foreground mt-2">
              Save your SMTP settings before sending a test email.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Email Templates                                          */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-500" />
            Email Templates
          </CardTitle>
          <CardDescription>
            Customise the HTML templates used for transactional emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Template selector */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATE_LABELS).map(([name, label]) => (
                  <SelectItem key={name} value={name}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          {currentMeta && (
            <p className="text-sm text-muted-foreground">{currentMeta.description}</p>
          )}

          {/* Variables */}
          {currentMeta && (
            <div className="space-y-2">
              <Label>Available Variables</Label>
              <div className="flex flex-wrap gap-2">
                {currentMeta.variables.map(v => (
                  <Badge key={v} variant="secondary" className="font-mono text-xs">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="template-subject">Subject Line</Label>
            <Input
              id="template-subject"
              value={templateSubject}
              onChange={e => setTemplateSubject(e.target.value)}
              disabled={templateLoading}
            />
          </div>

          {/* HTML content */}
          <div className="space-y-2">
            <Label htmlFor="template-html">HTML Content</Label>
            <Textarea
              id="template-html"
              value={templateHtml}
              onChange={e => setTemplateHtml(e.target.value)}
              rows={16}
              className="font-mono text-xs resize-y"
              disabled={templateLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => saveTemplateMutation.mutate()}
              disabled={saveTemplateMutation.isPending || templateLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveTemplateMutation.isPending ? "Saving…" : "Save Template"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={!templateHtml}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("Reset this template to its default content?")) {
                  resetTemplateMutation.mutate();
                }
              }}
              disabled={resetTemplateMutation.isPending || !currentTemplate?.isCustomized}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {resetTemplateMutation.isPending ? "Resetting…" : "Reset to Default"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* HTML Preview Modal                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview — {TEMPLATE_LABELS[selectedTemplate]}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md overflow-hidden">
            <iframe
              srcDoc={templateHtml}
              title="Email Preview"
              className="w-full"
              style={{ height: "500px", border: "none" }}
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
