"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Rocket,
  FlaskConical,
  PenLine,
  Loader2,
  FileCheck2,
  Radio,
  ArrowRight,
} from "lucide-react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

type ReadyCardProps = {
  title: string;
  description: string;
  trigger?: string;
  action?: string;
  explanation?: string;
  isTesting?: boolean;
  hasTested?: boolean;
  isDeploying?: boolean;
  hasDeployed?: boolean;
  onTest?: () => void;
  onDeploy?: () => void;
  onModify?: () => void;
};

export function ReadyCard({
  trigger = "Form Submission",
  action = "Send Notification",
  explanation = "The workflow captures incoming data and executes the configured action path.",
  isTesting,
  hasTested,
  isDeploying,
  hasDeployed,
  onTest,
  onDeploy,
  onModify,
}: ReadyCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-5"
      role="status"
      aria-label={hasDeployed ? "Automation is live" : "Automation ready to deploy"}
    >
      <div className="relative group">
        {/* Glow shadow */}
        <div className="absolute inset-0 rounded-2xl bg-accent/[0.05] translate-y-1 blur-2xl transition-all duration-500 group-hover:translate-y-2 group-hover:opacity-70" />

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111] to-[#0d0d0d] shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]">
          {/* Top accent line */}
          <div className="h-[3px] bg-gradient-to-r from-accent/50 via-blue-400/60 to-cyan-400/50" />

          {/* Ambient glows */}
          <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-accent/[0.06] blur-[50px] pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-blue-500/[0.04] blur-[35px] pointer-events-none" />

          <div className="relative px-6 py-5">

            {/* ── Phase label — inline, muted ── */}
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent/40 mb-3">
              {hasDeployed ? "Live" : "Ready"}
            </p>

            {/* ── Header: "Automation ready" ── */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-accent/[0.04] shadow-[0_4px_12px_rgba(59,130,246,0.14),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-accent/20">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                </div>
                {/* Breathing ring — only when motion allowed */}
                {!reducedMotion && (
                  <motion.div
                    className="absolute -inset-1 rounded-xl border border-accent/20"
                    animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.97, 1.02, 0.97] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-white tracking-tight">
                  Automation ready
                </p>
                <p className="text-[12px] text-white/35 mt-0.5">
                  Pipeline built — review and deploy below
                </p>
              </div>

              {/* Live badge */}
              <AnimatePresence>
                {hasDeployed ? (
                  <motion.div
                    key="live"
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-1.5 shrink-0"
                  >
                    {reducedMotion ? (
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                    ) : (
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Live</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ready"
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1.5 shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.08)]"
                  >
                    {reducedMotion ? (
                      <div className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
                    ) : (
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent/80">Ready</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Mini Pipeline Flow ── */}
            <div className="flex items-center gap-2 mb-4 py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-400/60 ring-1 ring-amber-400/20" />
                <span className="text-[11px] font-medium text-white/40 truncate max-w-[120px]">{trigger}</span>
              </div>
              <ArrowRight className="h-3 w-3 text-white/15 shrink-0" />
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-400/60 ring-1 ring-blue-400/20" />
                <span className="text-[11px] font-medium text-white/40">Process</span>
              </div>
              <ArrowRight className="h-3 w-3 text-white/15 shrink-0" />
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-violet-400/60 ring-1 ring-violet-400/20" />
                <span className="text-[11px] font-medium text-white/40 truncate max-w-[120px]">{action}</span>
              </div>
            </div>

            <p className="text-[12px] text-white/30 mb-5 leading-relaxed">{explanation}</p>

            {/* ── Action Buttons: Test / Deploy / Edit ── */}
            {!hasDeployed && (
              <div className="flex items-center gap-2.5">
                {/* Test */}
                <button
                  onClick={onTest}
                  disabled={isTesting || isDeploying}
                  aria-label={hasTested ? "Test passed" : "Run test"}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 active:scale-95 overflow-hidden
                    ${hasTested
                      ? "border border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/80"
                      : "border border-white/[0.08] bg-white/[0.04] text-white/60 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white/80"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isTesting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : hasTested ? (
                    <FileCheck2 className="h-3.5 w-3.5" />
                  ) : (
                    <FlaskConical className="h-3.5 w-3.5" />
                  )}
                  {isTesting ? "Testing..." : hasTested ? "Passed" : "Test"}
                </button>

                {/* Deploy */}
                <button
                  onClick={onDeploy}
                  disabled={isDeploying || isTesting}
                  aria-label="Deploy automation"
                  className="relative flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent/30 bg-gradient-to-br from-accent/20 to-accent/[0.08] px-4 py-2.5 text-[13px] font-semibold text-accent shadow-[0_0_20px_rgba(59,130,246,0.12)] transition-all duration-200 hover:shadow-[0_0_28px_rgba(59,130,246,0.2)] hover:border-accent/40 active:scale-95 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {/* Shimmer on deploy btn — only when motion allowed */}
                  {!reducedMotion && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                    />
                  )}
                  {isDeploying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Rocket className="h-3.5 w-3.5" />
                  )}
                  {isDeploying ? "Deploying..." : "Deploy"}
                </button>

                {/* Edit */}
                <button
                  onClick={onModify}
                  disabled={isTesting || isDeploying}
                  aria-label="Edit automation"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[13px] font-semibold text-white/40 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-white/60 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>
            )}

            {/* ── Post-deploy state ── */}
            <AnimatePresence>
              {hasDeployed && (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3 shadow-[0_0_16px_rgba(52,211,153,0.04)]">
                    <Radio className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-emerald-400/90">Pipeline is live</p>
                      <p className="text-[11px] text-white/30 mt-0.5">Listening for incoming triggers</p>
                    </div>
                  </div>
                  <button
                    onClick={onModify}
                    aria-label="Edit automation"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[13px] font-semibold text-white/40 transition-all hover:border-white/[0.1] hover:text-white/60 active:scale-95"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
