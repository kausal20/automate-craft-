"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import BrandMark from "@/components/BrandMark";

/* LOGIC EXPLAINED:
This is the browser-side auth form. The fix adds clear logs for submit start,
API response, success, and failure so you can trace login and signup from the
browser without guessing which step broke.
*/

type AuthScreenProps = {
  mode: "login" | "signup";
  nextPath: string;
  initialError?: string | null;
  socialAuthEnabled: boolean;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M21.8 12.23c0-.76-.07-1.49-.2-2.18H12v4.13h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.94-1.79 3.05-4.42 3.05-7.59Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.97-3.45.97-2.65 0-4.89-1.79-5.7-4.2H2.89v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.3 13.74a5.98 5.98 0 0 1 0-3.48V7.62H2.89a10 10 0 0 0 0 8.76l3.41-2.64Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.03c1.49 0 2.83.51 3.88 1.52l2.9-2.9C17.06 3.03 14.75 2 12 2A10 10 0 0 0 2.89 7.62L6.3 10.26c.81-2.41 3.05-4.23 5.7-4.23Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M16.7 12.6c0-2.16 1.76-3.2 1.84-3.24-1-.47-2.56-.54-3.49-.03-.99.52-1.94.54-2.87 0-.94-.55-2.39-.49-3.43.02-1.46.71-2.49 2.42-2.49 4.19 0 1.2.44 2.45.98 3.38.74 1.26 1.62 2.66 2.78 2.61 1.1-.05 1.51-.7 2.84-.7 1.33 0 1.7.7 2.85.67 1.18-.02 1.93-1.25 2.67-2.51.43-.74.6-1.1.94-1.93-2.68-1.02-2.62-3.83-2.62-4.46Zm-2.44-7.5c.61-.74 1.02-1.76.91-2.79-.88.04-1.95.59-2.58 1.33-.57.66-1.07 1.71-.93 2.72.98.08 1.98-.5 2.6-1.26Z" />
    </svg>
  );
}

export default function AuthScreen({
  mode,
  nextPath,
  initialError = null,
  socialAuthEnabled,
}: AuthScreenProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const title = isSignup ? "Create your workspace" : "Welcome back";
  const subtitle = isSignup
    ? "Set up your account to review, activate, and manage AI automations in one place."
    : "Sign in to manage your automations, integrations, logs, and settings.";
  const submitLabel = isSignup ? "Create account" : "Sign in";
  const pendingLabel = isSignup ? "Creating account..." : "Signing in...";
  const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
  const authHref = isSignup ? "/login" : "/signup";
  const authLabel = isSignup ? "Already have an account?" : "Need an account?";
  const authLinkLabel = isSignup ? "Sign in" : "Create one";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("[AuthScreen] Submit started.", {
      mode,
      email,
      nextPath,
    });
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isSignup
            ? { name, email, password }
            : { email, password },
        ),
      });

      const json = (await response.json()) as {
        error?: string;
      };
      console.log("[AuthScreen] Submit response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Authentication failed.");
      }

      router.push(nextPath);
      router.refresh();
      console.log("[AuthScreen] Navigation to next path complete:", nextPath);
    } catch (requestError) {
      console.error("[AuthScreen] Submit failed.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const googleHref = `/api/auth/oauth?provider=google&next=${encodeURIComponent(nextPath)}`;
  const appleHref = `/api/auth/oauth?provider=apple&next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fafc]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,142,247,0.08),_transparent_32%),linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-[1240px] items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="hidden rounded-[2.5rem] border border-black/6 bg-white/85 p-8 shadow-[0_28px_80px_rgba(28,28,28,0.07)] backdrop-blur-xl lg:block">
          <BrandMark />

          <div className="mt-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-black/[0.02] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <Sparkles className="h-4 w-4" />
              Automation control, refined
            </div>

            <h1 className="mt-7 max-w-lg text-5xl font-semibold tracking-[-0.06em] text-foreground">
              Build once.
              <br />
              Operate with confidence.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-foreground/62">
              Generate workflows from the homepage, connect the right tools, and
              keep every run visible through a clean operational dashboard.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {[
              "Secure session handling for email/password and social sign-in",
              "Structured AI workflow generation with dynamic setup forms",
              "Execution logs, app connections, and settings in one workspace",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[1.5rem] border border-black/6 bg-black/[0.02] px-4 py-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <p className="text-sm leading-7 text-foreground/70">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-[2rem] border border-black/6 bg-[#fcfdff] p-6">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-foreground/42">
              <LockKeyhole className="h-4 w-4 text-accent" />
              Security posture
            </div>
            <p className="mt-4 text-sm leading-7 text-foreground/62">
              Authentication uses secure cookie-based sessions. When Supabase is
              configured, Google and Apple sign-in flow through the provider&apos;s
              OAuth consent screens and return directly to your workspace.
            </p>
          </div>
        </section>

        <section className="card-surface rounded-[2.5rem] border border-white/60 p-6 sm:p-8 lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <BrandMark compact />
            <Link
              href="/"
              className="hidden text-sm font-medium text-foreground/56 transition-colors hover:text-accent sm:block"
            >
              Back to home
            </Link>
          </div>

          <div className="mt-10">
            <h1 className="text-4xl font-semibold tracking-[-0.055em] text-foreground">
              {title}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-foreground/60">
              {subtitle}
            </p>
            <p className="mt-4 text-sm text-foreground/58">
              {authLabel}{" "}
              <Link
                href={`${authHref}?next=${encodeURIComponent(nextPath)}`}
                className="font-semibold text-accent"
              >
                {authLinkLabel}
              </Link>
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href={socialAuthEnabled ? googleHref : undefined}
              aria-disabled={!socialAuthEnabled}
              className={`inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-black/8 bg-white px-5 text-sm font-semibold text-foreground shadow-[0_10px_30px_rgba(28,28,28,0.04)] transition-all ${
                socialAuthEnabled
                  ? "hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(28,28,28,0.06)]"
                  : "cursor-not-allowed opacity-55"
              }`}
            >
              <GoogleIcon />
              Continue with Google
            </a>

            <a
              href={socialAuthEnabled ? appleHref : undefined}
              aria-disabled={!socialAuthEnabled}
              className={`inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-black/8 bg-white px-5 text-sm font-semibold text-foreground shadow-[0_10px_30px_rgba(28,28,28,0.04)] transition-all ${
                socialAuthEnabled
                  ? "hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(28,28,28,0.06)]"
                  : "cursor-not-allowed opacity-55"
              }`}
            >
              <AppleIcon />
              Continue with Apple
            </a>
          </div>

          {!socialAuthEnabled ? (
            <p className="mt-4 text-xs leading-6 text-foreground/50">
              Google and Apple sign-in become available when Supabase OAuth is
              configured for this project.
            </p>
          ) : null}

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-black/8" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/38">
              Or continue with email
            </span>
            <div className="h-px flex-1 bg-black/8" />
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            ) : null}

            {isSignup ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Full name
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Email
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Password
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                placeholder={isSignup ? "Minimum 8 characters" : "Your password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-foreground px-8 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? pendingLabel : submitLabel}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-6 text-foreground/48">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </section>
      </div>
    </main>
  );
}
