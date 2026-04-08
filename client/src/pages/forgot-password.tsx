import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Valid email is required"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex h-screen w-full overflow-hidden font-[Arial,sans-serif]">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex items-center justify-center w-[42%] shrink-0"
        style={{ backgroundColor: "#000000" }}
      >
        <img src="/large_black_logo.png" alt="Oikia Christian Centre" className="w-4/5" />
      </div>

      {/* Right form panel */}
      <div
        className="flex-1 flex flex-col items-center justify-center overflow-y-auto p-6"
        style={{ backgroundColor: "#FDFAF7" }}
      >
        <div className="flex lg:hidden justify-center mb-8">
          <img
            src="/large_black_logo.png"
            alt="Oikia Christian Centre"
            className="w-40"
            style={{ filter: "invert(1)" }}
          />
        </div>

        <div className="w-full max-w-md">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#F7821B20" }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: "#F7821B" }} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: "#1C0F0A" }}>
                Check your email
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                If an account exists for that email, we've sent a password reset link. It expires in 1 hour.
              </p>
              <a
                href="/"
                className="mt-2 text-sm font-semibold hover:underline"
                style={{ color: "#F7821B" }}
              >
                ← Back to Sign In
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1" style={{ color: "#1C0F0A" }}>
                Forgot your password?
              </h2>
              <p className="text-sm text-gray-500 mb-8">
                Enter your email and we'll send you a reset link.
              </p>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-600">
                          Email address
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                            className="h-10"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-white mt-2"
                    style={{ backgroundColor: "#F7821B", border: "none" }}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Reset Link
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-gray-500 mt-4">
                    Remember your password?{" "}
                    <a
                      href="/"
                      className="font-semibold hover:underline"
                      style={{ color: "#F7821B" }}
                    >
                      Sign in
                    </a>
                  </p>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
