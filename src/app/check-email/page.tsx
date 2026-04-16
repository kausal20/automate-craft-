"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function CheckEmailPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!emailParam) {
      setError("No email address found. Please sign up again.");
      return;
    }

    setResending(true);
    setError(null);
    setResent(false);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("Auth service is not configured.");
      }

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: emailParam,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (resendError) throw resendError;

      setResent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resend email.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.015),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(79,142,247,0.03),_transparent_40%)]" />

      <motion.section
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
        className="card-surface relative w-full max-w-[480px] rounded-[1.5rem] p-8 sm:p-12 text-foreground"
      >
        <div className="mb-10 flex items-center justify-between">
          <BrandMark compact showName={true} />
          <Link
            href="/login"
            className="text-sm font-medium text-foreground/56 transition-colors hover:text-accent"
          >
            Back to login
          </Link>
        </div>

        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20"
          >
            <Mail className="h-9 w-9 text-accent" />
          </motion.div>
        </div>

        <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          Check your email
        </h1>

        <p className="mt-4 text-center text-[0.95rem] leading-relaxed text-foreground/50">
          We&apos;ve sent a verification link to{" "}
          {emailParam ? (
            <span className="font-semibold text-foreground/80">
              {emailParam}
            </span>
          ) : (
            "your email"
          )}
          . Click the link to verify your account and get started.
        </p>

        {/* Status messages */}
        {resent && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-2 rounded-2xl border border-green-900/50 bg-green-950/20 px-4 py-3 text-[0.9rem] font-medium text-green-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Verification email resent successfully.
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-[0.9rem] font-medium text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <button
            onClick={handleResend}
            disabled={resending}
            data-static-hover
            className="inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${resending ? "animate-spin" : ""}`}
            />
            {resending ? "Resending..." : "Resend verification email"}
          </button>

          <Link
            href="/login"
            className="inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl text-[0.95rem] font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to login
          </Link>
        </div>

        <p className="mt-8 text-center text-[0.8rem] leading-6 text-foreground/35">
          Didn&apos;t receive the email? Check your spam folder or try resending.
        </p>
      </motion.section>
    </main>
  );
}
