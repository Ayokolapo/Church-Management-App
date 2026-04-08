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
import { Loader2, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function getToken() {
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const token = getToken();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Reset failed");
      }
      return res.json();
    },
    onSuccess: () => setDone(true),
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#FDFAF7" }}>
        <div className="text-center space-y-3 max-w-sm px-6">
          <p className="text-lg font-semibold" style={{ color: "#1C0F0A" }}>
            Invalid reset link
          </p>
          <p className="text-sm text-gray-500">
            This link is missing a token. Please request a new password reset.
          </p>
          <a
            href="/forgot-password"
            className="text-sm font-semibold hover:underline"
            style={{ color: "#F7821B" }}
          >
            Request new link
          </a>
        </div>
      </div>
    );
  }

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
          {done ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#F7821B20" }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: "#F7821B" }} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: "#1C0F0A" }}>
                Password reset
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <a
                href="/"
                className="mt-2 text-sm font-semibold hover:underline"
                style={{ color: "#F7821B" }}
              >
                Sign in
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1" style={{ color: "#1C0F0A" }}>
                Set new password
              </h2>
              <p className="text-sm text-gray-500 mb-8">
                Choose a strong password for your account.
              </p>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-600">
                          New password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Min. 8 characters"
                              {...field}
                              className="h-10 pr-10"
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                              onClick={() => setShowPassword((v) => !v)}
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-600">
                          Confirm new password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirm ? "text" : "password"}
                              placeholder="Re-enter password"
                              {...field}
                              className="h-10 pr-10"
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                              onClick={() => setShowConfirm((v) => !v)}
                              tabIndex={-1}
                            >
                              {showConfirm ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
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
                        Resetting...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 mr-2" />
                        Reset Password
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
