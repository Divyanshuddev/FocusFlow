"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Timer } from "lucide-react";
import { useAuth, useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (searchParams.get("demo") === "1") {
      setValue("email", "demo@focusflow.app");
      setValue("password", "FocusFlow123!");
    }
  }, [searchParams, setValue]);

  const onSubmit = async (values: LoginValues) => {
    try {
      await login(values.email, values.password);
      toast.success("Welcome back!", "Signed in to your FocusFlow workspace.");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Sign in failed", extractApiError(err, "Invalid email or password"));
    }
  };

  const fillDemoCredentials = () => {
    setValue("email", "demo@focusflow.app");
    setValue("password", "FocusFlow123!");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#000000] px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-10 h-96 w-96 -translate-x-1/2 rounded-full bg-[#48BC2B]/[0.08] blur-3xl" />
      </div>

      <div className="glass-card relative z-10 w-full max-w-md p-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02] shadow-[0_0_18px_-4px_rgba(72,188,43,0.5)]">
            <Timer className="h-5 w-5 stroke-[2.3]" />
          </div>
          <span className="text-lg font-bold tracking-tight">FocusFlow</span>
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="mt-1.5 text-sm text-[#8B8E96]">
          Sign in to continue your deep-work streak and tasks.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#B5B8C0]">
              Email Address
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="you@example.com"
              className="input-field"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-[#FF5A26]">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-[#B5B8C0]">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#48BC2B] hover:text-[#7FE066]"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8E96] hover:text-white"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-[#FF5A26]">{errors.password.message}</p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
            {isSubmitting ? "Signing in..." : "Sign In"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-5 rounded-2xl border border-[#48BC2B]/25 bg-[#0D1C09] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#5CD13E]">Demo Account Available</p>
              <p className="text-[11px] text-[#8B8E96]">demo@focusflow.app / FocusFlow123!</p>
            </div>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="rounded-lg border border-[#48BC2B]/35 bg-[#48BC2B]/15 px-2.5 py-1 text-xs font-semibold text-[#7FE066] hover:bg-[#48BC2B]/25"
            >
              Fill Demo
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[#8B8E96]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-[#48BC2B] hover:text-[#7FE066]">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000000]" />}>
      <LoginContent />
    </Suspense>
  );
}
