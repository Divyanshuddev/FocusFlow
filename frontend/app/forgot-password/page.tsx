"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, KeyRound, MailCheck, Timer } from "lucide-react";
import { useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";
import { authService } from "@/services/authService";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (values: ForgotValues) => {
    try {
      const res = await authService.forgotPassword(values.email);
      setSubmittedMsg(res.message);
      setTokenPreview(res.reset_token_preview ?? null);
      toast.success("Reset instructions generated");
    } catch (err) {
      toast.error("Request failed", extractApiError(err));
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

        <h1 className="mt-6 text-2xl font-bold text-white">Forgot password?</h1>
        <p className="mt-1.5 text-sm text-[#8B8E96]">
          Enter your email address and we&apos;ll generate a password reset token.
        </p>

        {submittedMsg ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[#48BC2B]/35 bg-[#0D1C09] p-4 text-sm text-[#7FE066]">
              <div className="flex items-center gap-2 font-semibold">
                <MailCheck className="h-4 w-4 text-[#48BC2B]" />
                Reset Request Processed
              </div>
              <p className="mt-1.5 text-xs text-[#B5B8C0]">{submittedMsg}</p>
            </div>

            {tokenPreview && (
              <div className="rounded-2xl border border-white/10 bg-[#141414] p-4 text-xs">
                <p className="font-semibold text-[#5CD13E]">
                  Local Development Reset Token Preview
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-[#B5B8C0]">
                  {tokenPreview}
                </p>
                <Link
                  href={`/reset-password?token=${encodeURIComponent(tokenPreview)}`}
                  className="btn-primary mt-3 w-full text-xs"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Continue to Reset Password
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#B5B8C0]">
                Account Email
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

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

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
