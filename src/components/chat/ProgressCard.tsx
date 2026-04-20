"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Clock, Lightbulb, BrainCircuit } from "lucide-react";

const TIPS = [
  "AutomateCraft can chain up to 12 services in a single workflow.",
  "You can attach files and voice memos directly in the chat.",
  "Deployed automations run 24/7 without any server management.",
  "Use Ultra Thinking mode for more complex multi-step logic.",
  "Every automation gets a live audit log you can review anytime.",
  "You can modify a deployed automation without downtime.",
];

export function ProgressCard({ steps }: { steps: string[] }) {
  const normalizedSteps = steps.map((step) => step.trim()).filter(Boolean);
  const isAnalyzing = normalizedSteps[0]?.toLowerCase().includes("analyzing");
  const heading = isAnalyzing ? "Analyzing your automation..." : "Building your automation...";
  const description = isAnalyzing
    ? "Understanding your trigger and action intent."
    : "Configuring workflow logic and services.";

  // Live elapsed timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotating tips
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const completedCount = normalizedSteps.filter((s) => s.startsWith("✓")).length;
  const progress = normalizedSteps.length > 0 ? (completedCount / normalizedSteps.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-[85%] mb-6"
    >
      <div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0c0c0c] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {/* Outer glow accent */}
        <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-accent/10 blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-cyan-500/8 blur-[50px] pointer-events-none" />

        {/* Animated progress bar at top */}
        <div className="relative h-[2px] bg-white/[0.04] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent via-cyan-400 to-accent"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.max(progress, 15)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {/* Glowing leading edge */}
          <motion.div
            className="absolute top-0 h-full w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ["-64px", "400px"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Orbital loader */}
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/15 to-cyan-500/10 ring-1 ring-white/[0.06]" />
              {/* Orbiting dot */}
              <div className="absolute inset-[-4px]">
                <motion.div
                  className="absolute h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ top: 0, left: "50%", marginLeft: "-3px" }}
                />
              </div>
              <BrainCircuit className="relative h-5 w-5 text-accent" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold tracking-wide text-white">
                {heading}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">
                {description}
              </p>
            </div>

            {/* Elapsed timer */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 shrink-0 backdrop-blur-sm">
              <Clock className="h-3 w-3 text-white/30" />
              <motion.span
                key={elapsed}
                initial={{ opacity: 0.5, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] font-mono font-medium tabular-nums text-white/50"
              >
                {elapsed}s
              </motion.span>
            </div>
          </div>

          {/* Progress steps */}
          <div className="relative mt-6 flex flex-wrap gap-2 ml-1">
            {normalizedSteps.map((step, i) => {
              const isCompleted = step.startsWith("✓");
              const text = step.replace("✓ ", "");
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-300 ${
                    isCompleted
                      ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      </motion.div>
                    ) : (
                      <motion.div key="spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span className={`text-[12px] font-medium ${isCompleted ? "text-emerald-400/90" : "text-white/50"}`}>
                    {text}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Rotating tips — glass card */}
          <div className="relative mt-5 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3 backdrop-blur-sm overflow-hidden">
            {/* Subtle shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent animate-[shimmer_4s_ease-in-out_infinite]" style={{ backgroundSize: "200% 100%" }} />
            <div className="relative flex items-start gap-2.5">
              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400/60" />
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-[12px] leading-relaxed text-white/40"
                >
                  {TIPS[tipIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
