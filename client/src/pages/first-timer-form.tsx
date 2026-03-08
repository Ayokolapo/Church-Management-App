import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFirstTimerSchema, type InsertFirstTimer, type Branch, type Cluster } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle } from "lucide-react";

export default function FirstTimerForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<InsertFirstTimer>({
    resolver: zodResolver(insertFirstTimerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "Male",
      mobilePhone: "",
      email: "",
      address: "",
      dateOfBirth: "",
      closestAxis: "",
      basedInCity: "Yes",
      seeingAgain: "Yes",
      enjoyedAboutService: [],
      howHeardAbout: "Oikia member",
      whoInvited: "",
      feedback: "",
      branchId: "",
    },
  });

  const selectedBranchId = form.watch("branchId");

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters", selectedBranchId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/clusters?branchId=${selectedBranchId}`);
      return res.json();
    },
    enabled: !!selectedBranchId,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InsertFirstTimer) => {
      const response = await apiRequest("POST", "/api/first-timers", data);
      return await response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset();
    },
    onError: (error: any) => {
      console.error("First timer submission error:", error);
    },
  });

  const onSubmit = (data: InsertFirstTimer) => {
    console.log("Submitting first timer:", data);
    submitMutation.mutate(data);
  };

  const enjoymentOptions = [
    { id: "Sermon", label: "Sermon" },
    { id: "Prayer", label: "Prayer" },
    { id: "Praise and worship", label: "Praise and Worship" },
    { id: "Ambience", label: "Ambience" },
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">Thank You!</h2>
              <p className="text-muted-foreground">
                Your information has been submitted successfully. We look forward to seeing you again!
              </p>
            </div>
            <Button onClick={() => setIsSubmitted(false)} data-testid="button-submit-another">
              Submit Another Response
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-form-title">Welcome to The Waypoint!</h1>
          <p className="text-muted-foreground">
            We're excited to have you. Please fill out this form so we can stay connected.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>First Timer Information</CardTitle>
            <CardDescription>All fields marked with * are required</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("closestAxis", "");
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-branch">
                              <SelectValue placeholder="Select a branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches?.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
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
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-gender">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-dob" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mobilePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Phone *</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="closestAxis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What axis is closest to where you stay? *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedBranchId || !clusters?.length}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-axis">
                            <SelectValue
                              placeholder={
                                !selectedBranchId
                                  ? "Select a branch first"
                                  : clusters?.length
                                  ? "Select an axis"
                                  : "No clusters available"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clusters?.map((cluster) => (
                            <SelectItem key={cluster.id} value={cluster.name}>
                              {cluster.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="basedInCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Are you based in this city? *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-based-in-city">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="seeingAgain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Are we seeing you again? *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-seeing-again">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                            <SelectItem value="Maybe">Maybe</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="enjoyedAboutService"
                  render={() => (
                    <FormItem>
                      <FormLabel>What did you enjoy about the service? *</FormLabel>
                      <div className="space-y-2">
                        {enjoymentOptions.map((option) => (
                          <FormField
                            key={option.id}
                            control={form.control}
                            name="enjoyedAboutService"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.id as any)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      const updated = checked
                                        ? [...current, option.id as any]
                                        : current.filter((val) => val !== option.id);
                                      field.onChange(updated);
                                    }}
                                    data-testid={`checkbox-${option.id.toLowerCase().replace(/\s+/g, '-')}`}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="howHeardAbout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about Oikia? *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-how-heard">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Oikia member">Oikia member</SelectItem>
                          <SelectItem value="Social media">Social media</SelectItem>
                          <SelectItem value="Billboard/Lamp post">Billboard/Lamp post</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whoInvited"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who invited you?</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-who-invited" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="feedback"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you have feedback on what we can improve?</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} data-testid="textarea-feedback" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit"}
                </Button>

                {submitMutation.isError && (
                  <p className="text-sm text-destructive text-center">
                    Failed to submit form. Please try again.
                  </p>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
