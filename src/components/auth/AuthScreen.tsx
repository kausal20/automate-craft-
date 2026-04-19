"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";

type AuthScreenProps = {
  mode: "login" | "signup";
  nextPath: string;
  initialError?: string | null;
  socialAuthEnabled: boolean;
  ssoEnabled: boolean;
  focusSso?: boolean;
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

export default function AuthScreen({
  mode,
  nextPath,
  initialError = null,
  socialAuthEnabled,
  ssoEnabled,
  focusSso = false,
}: AuthScreenProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const ssoDomainRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Magic link state
  const [authMethod, setAuthMethod] = useState<"magic" | "password">("magic");
  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  useEffect(() => {
    if (!focusSso || !ssoEnabled) {
      return;
    }
    const node = ssoDomainRef.current;
    if (!node) {
      return;
    }
    node.focus();
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusSso, ssoEnabled]);

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
    console.log("[AuthScreen] Submit started.", { mode, email, nextPath });
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup ? { name, email, password } : { email, password },
        ),
      });

      const json = (await response.json()) as {
        error?: string;
        user?: { onboarded: boolean };
        needsEmailVerification?: boolean;
      };
      console.log("[AuthScreen] Submit response received.", json);

      if (!response.ok) {
        if (json.needsEmailVerification) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(json.error || "Authentication failed.");
      }

      // Email verification required — redirect to check-email page
      if (json.needsEmailVerification) {
        console.log("[AuthScreen] Email verification required. Redirecting to /verify-email.");
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      let finalPath = nextPath;
      if (json.user && json.user.onboarded === false) {
        finalPath = "/onboarding";
      }

      router.push(finalPath);
      router.refresh();
      console.log("[AuthScreen] Navigation to next path complete:", finalPath);
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

  const handleMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMagicLoading(true);
    setMagicError(null);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: magicEmail }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Could not send magic link.");
      }

      setMagicSent(true);
    } catch (err) {
      setMagicError(
        err instanceof Error ? err.message : "Could not send magic link.",
      );
    } finally {
      setMagicLoading(false);
    }
  };

  const googleHref = `/api/auth/oauth?provider=google&next=${encodeURIComponent(nextPath)}`;

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
            href="/"
            className="text-sm font-medium text-foreground/56 transition-colors hover:text-accent"
          >
            Back to home
          </Link>
        </div>

          <div className="mt-4 lg:mt-0">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              {title}
            </h1>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-foreground/50 sm:text-base">
              {subtitle}
            </p>
            <p className="mt-5 text-[0.95rem] font-medium text-foreground/50">
              {authLabel}{" "}
              <Link
                href={`${authHref}?next=${encodeURIComponent(nextPath)}${focusSso ? "&focus=sso" : ""}`}
                className="font-semibold text-accent"
              >
                {authLinkLabel}
              </Link>
            </p>
          </div>

          <div
            className={`mt-8 grid gap-4 ${
              socialAuthEnabled && ssoEnabled ? "sm:grid-cols-2" : ""
            }`}
          >
            <a
              href={socialAuthEnabled ? googleHref : undefined}
              aria-disabled={!socialAuthEnabled}
              className={`inline-flex h-[3.25rem] w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 text-[0.95rem] font-medium text-foreground transition-all ${
                socialAuthEnabled
                  ? "hover:bg-white/[0.04] hover:border-white/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <GoogleIcon />
              Continue with Google
            </a>

            {socialAuthEnabled && ssoEnabled ? (
              <form
                method="GET"
                action="/api/auth/sso"
                id="enterprise-sso"
                className="mt-4 sm:mt-0 relative"
              >
                <input type="hidden" name="next" value={nextPath} />
                <input
                  ref={ssoDomainRef}
                  name="domain"
                  type="text"
                  required
                  autoComplete="organization"
                  placeholder="name@company.com"
                  className="h-[3.25rem] w-full rounded-2xl border border-white/10 bg-white/[0.02] pl-5 pr-[88px] text-[0.95rem] text-foreground outline-none transition-all placeholder:text-foreground/30 focus:border-accent focus:bg-white/5 focus:ring-[3px] focus:ring-accent/15"
                />
                <button
                  type="submit"
                  className="absolute bottom-1.5 right-1.5 top-1.5 inline-flex items-center justify-center rounded-xl bg-white text-black px-4 text-xs font-semibold transition-colors hover:bg-white/80"
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5 opacity-70" aria-hidden />
                  SSO
                </button>
              </form>
            ) : null}
          </div>

          {!socialAuthEnabled ? (
            <p className="mt-4 text-xs leading-6 text-foreground/50">
              Google sign-in and enterprise SSO become available when Supabase is
              configured for this project.
            </p>
          ) : !ssoEnabled ? (
            <p className="mt-4 text-xs leading-6 text-foreground/50">
              Enterprise SSO is hidden. Set{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-[0.7rem]">
                NEXT_PUBLIC_ENABLE_SSO=true
              </code>{" "}
              (or remove{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-[0.7rem]">
                NEXT_PUBLIC_ENABLE_SSO=false
              </code>
              ) to enable SAML SSO after configuring it in Supabase.
            </p>
          ) : null}

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#121212] px-4 text-xs font-medium uppercase tracking-widest text-foreground/40">
                Or
              </span>
            </div>
          </div>

          {/* ─── Auth Method Toggle (Login only) ─── */}
          {!isSignup && (
            <div className="mb-6 flex items-center gap-1 rounded-2xl bg-white/[0.03] p-1 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => { setAuthMethod("magic"); setError(null); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                  authMethod === "magic"
                    ? "bg-accent text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                    : "text-foreground/40 hover:text-foreground/60"
                }`}
              >
                <Mail className="h-4 w-4" />
                Magic Link
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod("password"); setError(null); setMagicError(null); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                  authMethod === "password"
                    ? "bg-accent text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                    : "text-foreground/40 hover:text-foreground/60"
                }`}
              >
                <KeyRound className="h-4 w-4" />
                Password
              </button>
            </div>
          )}

          {/* ─── Magic Link Form ─── */}
          <AnimatePresence mode="wait">
            {!isSignup && authMethod === "magic" ? (
              <motion.div
                key="magic"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {magicSent ? (
                  /* ─── Success State ─── */
                  <div className="flex flex-col items-center text-center py-4">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
                      <CheckCircle2 className="h-8 w-8 text-accent" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Check your inbox</h2>
                    <p className="text-sm text-foreground/50 mb-1">
                      We sent a login link to
                    </p>
                    <p className="text-sm font-semibold text-accent mb-6">{magicEmail}</p>
                    <p className="text-xs text-foreground/30 mb-4">
                      Click the link in the email to sign in automatically. The link expires in 1 hour.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setMagicSent(false); setMagicEmail(""); }}
                      className="text-sm font-medium text-foreground/40 hover:text-foreground/70 transition-colors"
                    >
                      Use a different email
                    </button>
                  </div>
                ) : (
                  /* ─── Input State ─── */
                  <form onSubmit={handleMagicLink} className="space-y-5">
                    {magicError && (
                      <div className="rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-[0.95rem] font-medium text-red-400">
                        {magicError}
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-[0.95rem] font-medium text-foreground/80">
                        Email
                      </label>
                      <input
                        required
                        type="email"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoComplete="email"
                        className="h-[3.25rem] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-5 text-[0.95rem] text-foreground outline-none transition-all placeholder:text-foreground/30 focus:border-accent focus:bg-white/5 focus:ring-[3px] focus:ring-accent/15"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={magicLoading}
                      className="btn-dark mt-2 inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl px-8 text-[0.95rem] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {magicLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending link...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Send magic link
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-foreground/30 leading-5">
                      No password needed. We'll email you a one-time login link.
                    </p>
                  </form>
                )}
              </motion.div>
            ) : (
              /* ─── Password Form (original) ─── */
              <motion.div
                key="password"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {error ? (
                    <div className="rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-[0.95rem] font-medium text-red-400">
                      {error}
                    </div>
                  ) : null}

                  {isSignup ? (
                    <div>
                      <label className="mb-2 block text-[0.95rem] font-medium text-foreground/80">
                        Full name
                      </label>
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your full name"
                        autoComplete="name"
                        className="h-[3.25rem] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-5 text-[0.95rem] text-foreground outline-none transition-all placeholder:text-foreground/30 focus:border-accent focus:bg-white/5 focus:ring-[3px] focus:ring-accent/15"
                      />
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-2 block text-[0.95rem] font-medium text-foreground/80">
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="h-[3.25rem] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-5 text-[0.95rem] text-foreground outline-none transition-all placeholder:text-foreground/30 focus:border-accent focus:bg-white/5 focus:ring-[3px] focus:ring-accent/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[0.95rem] font-medium text-foreground/80">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={8}
                        placeholder={isSignup ? "Minimum 8 characters" : "Your password"}
                        autoComplete={isSignup ? "new-password" : "current-password"}
                        className="h-[3.25rem] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-5 pr-12 text-[0.95rem] text-foreground outline-none transition-all placeholder:text-foreground/30 focus:border-accent focus:bg-white/5 focus:ring-[3px] focus:ring-accent/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-dark mt-4 inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl px-8 text-[0.95rem] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? pendingLabel : submitLabel}
                    {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-10 text-center text-[0.85rem] leading-6 text-foreground/45">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </motion.section>
    </main>
  );
}
