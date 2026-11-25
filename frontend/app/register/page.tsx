"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Timer } from "lucide-react";
import { useAuth, useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isAuthenticated } = useAuth();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (values: RegisterValues) => {
    try {
      await registerUser(values.name, values.email, values.password);
      toast.success("Account created!", "Welcome to FocusFlow — let's plan your first sprint.");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Registration failed", extractApiError(err));
    }
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

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Create your account</h1>
        <p className="mt-1.5 text-sm text-[#8B8E96]">
          Build consistent deep-work habits with smart prioritization and analytics.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#B5B8C0]">Full Name</label>
            <input {...register("name")} placeholder="Alex Rivera" className="input-field" />
            {errors.name && <p className="mt-1 text-xs text-[#FF5A26]">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#B5B8C0]">
              Email Address
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="alex@company.com"
              className="input-field"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-[#FF5A26]">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#B5B8C0]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="At least 8 characters"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8E96] hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-[#FF5A26]">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#B5B8C0]">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              {...register("confirmPassword")}
              placeholder="Re-enter your password"
              className="input-field"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-[#FF5A26]">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
            {isSubmitting ? "Creating account..." : "Create Account"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#8B8E96]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#48BC2B] hover:text-[#7FE066]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
