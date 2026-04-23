"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, BrainCircuit } from "lucide-react";

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

export function ProgressCard({ steps }: { steps: string[] }) {
  const normalizedSteps = steps.map((step) => step.trim()).filter(Boolean);
  const isAnalyzing = normalizedSteps[0]?.toLowerCase().includes("analyzing");
  const heading = isAnalyzing ? "Analyzing your automation" : "Building your automation";
  const phaseLabel = isAnalyzing ? "Phase 1 · Analysis" : "Phase 2 · Compilation";
  const subheading = isAnalyzing
    ? "Parsing intent and mapping execution path"
    : "Compiling workflow and wiring action nodes";

  const reducedMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [dotIndex, setDotIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => setDotIndex((d) => (d + 1) % 4), 420);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const completedCount = normalizedSteps.filter((s) => s.startsWith("✓")).length;
  const progress = normalizedSteps.length > 0 ? (completedCount / normalizedSteps.length) * 100 : 0;
  const dots = reducedMotion ? "..." : ".".repeat(dotIndex).padEnd(3, "\u00a0");

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-5"
      role="status"
      aria-label={`${heading}: ${completedCount} of ${normalizedSteps.length} steps complete`}
    >
      <div className="relative group">
        {/* 3D shadow */}
        <div className="absolute inset-0 rounded-2xl bg-accent/[0.03] translate-y-1 blur-xl" />

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111] to-[#0c0c0c] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]">
          {/* Progress bar */}
          <div className="relative h-[3px] bg-white/[0.03] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent/60 via-blue-400/60 to-accent/60 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
              initial={{ width: "8%" }}
              animate={{ width: `${Math.max(progress, 15)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            {/* Shimmer — disabled on reduced motion */}
            {!reducedMotion && (
              <motion.div
                className="absolute top-0 h-full w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                animate={{ x: ["-64px", "500px"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>

          <div className="p-5">
            {/* Ambient glow */}
            <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-accent/[0.06] blur-[35px] pointer-events-none" />

            <div className="relative flex items-center gap-3.5 mb-4">
              {/* Brain icon with optional orbiting dot */}
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/15 to-blue-500/8 ring-1 ring-accent/15 shadow-[0_4px_12px_rgba(59,130,246,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]" />
                {!reducedMotion && (
                  <motion.div className="absolute -inset-1">
                    <motion.div
                      className="absolute h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,0.7)]"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                      style={{ top: 0, left: "50%", marginLeft: "-3px" }}
                    />
                  </motion.div>
                )}
                <BrainCircuit className="relative h-4 w-4 text-accent" />
              </div>

              <div className="flex-1 min-w-0">
                {/* Phase label — inline, muted */}
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent/40 mb-1">
                  {phaseLabel}
                </p>
                {/* Heading with animated dots */}
                <p className="text-[14px] font-semibold text-white">
                  {heading}
                  <span className="inline-block w-[22px] text-accent/60 font-light">{dots}</span>
                </p>
                <p className="text-[12px] text-white/35 mt-0.5">{subheading}</p>
              </div>

              <span className="text-[11px] font-mono tabular-nums text-white/20 shrink-0">{elapsed}s</span>
            </div>

            {/* Step list */}
            <div className="space-y-2.5 ml-1">
              {normalizedSteps.map((step, i) => {
                const isCompleted = step.startsWith("✓");
                const text = step.replace("✓ ", "");
                return (
                  <motion.div
                    key={i}
                    initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reducedMotion ? 0 : i * 0.08, duration: 0.2 }}
                    className="flex items-center gap-2.5"
                  >
                    <AnimatePresence mode="wait">
                      {isCompleted ? (
                        <motion.div
                          key="check"
                          initial={reducedMotion ? false : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.08)]">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="dot" className="flex h-5 w-5 items-center justify-center">
                          {reducedMotion ? (
                            <div className="h-[6px] w-[6px] rounded-full bg-accent/50" />
                          ) : (
                            <motion.div
                              className="h-[6px] w-[6px] rounded-full bg-accent/50"
                              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span className={`text-[13px] font-medium ${isCompleted ? "text-white/55" : "text-white/35"}`}>
                      {text}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
