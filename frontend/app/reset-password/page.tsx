"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Timer } from "lucide-react";
import { useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";
import { authService } from "@/services/authService";

const resetSchema = z
  .object({
    token: z.string().min(10, "Enter a valid reset token"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.new_password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
  });

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setValue("token", tokenParam);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (values: ResetValues) => {
    try {
      await authService.resetPassword({
        token: values.token,
        new_password: values.new_password,
      });
      toast.success("Password reset!", "You can now sign in with your new password.");
      router.push("/login");
    } catch (err) {
      toast.error("Reset failed", extractApiError(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#000000] px-4 py-12 text-white">
      <div className="glass-card w-full max-w-md p-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02]">
            <Timer className="h-5 w-5 stroke-[2.3]" />
          </div>
          <span className="text-lg font-bold tracking-tight">FocusFlow</span>
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-white">Reset password</h1>
        <p className="mt-1.5 text-sm text-[#8B8E96]">
          Enter your reset token and choose a new password.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#B5B8C0]">
              Reset Token
            </label>
            <input {...register("token")} placeholder="Paste reset token" className="input-field" />
            {errors.token && (
              <p className="mt-1 text-xs text-[#FF5A26]">{errors.token.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#B5B8C0]">
              New Password
            </label>
            <input
              type="password"
              {...register("new_password")}
              placeholder="At least 8 characters"
              className="input-field"
            />
            {errors.new_password && (
              <p className="mt-1 text-xs text-[#FF5A26]">{errors.new_password.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#B5B8C0]">
              Confirm Password
            </label>
            <input
              type="password"
              {...register("confirmPassword")}
              placeholder="Re-enter password"
              className="input-field"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-[#FF5A26]">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
            {isSubmitting ? "Updating..." : "Reset Password"}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#8B8E96] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000000]" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
