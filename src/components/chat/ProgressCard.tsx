"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Cog, Clock, Lightbulb } from "lucide-react";

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
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full max-w-[85%] mb-6"
    >
      <div className="rounded-[22px] border border-[#222] bg-[#111] p-6 shadow-2xl shadow-black/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

        {/* Animated progress bar at top */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/5 overflow-hidden rounded-t-[22px]">
          <motion.div
            className="h-full bg-gradient-to-r from-accent via-cyan-400 to-accent rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.max(progress, 15)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" style={{ backgroundSize: "200% 100%" }} />
        </div>

        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-accent ring-1 ring-white/10">
            <Cog className="h-5 w-5 animate-[spin_6s_linear_infinite]" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-semibold tracking-wide text-white">
              {heading}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
              {description}
            </p>
          </div>
          {/* Elapsed timer */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 shrink-0">
            <Clock className="h-3 w-3 text-white/40" />
            <span className="text-[11px] font-mono font-medium tabular-nums text-white/50">
              {elapsed}s
            </span>
          </div>
        </div>

        {/* Progress steps */}
        <div className="relative mt-6 space-y-1 ml-2">
          {normalizedSteps.map((step, i) => {
            const isCompleted = step.startsWith("✓");
            const text = step.replace("✓ ", "");
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.25 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 mr-2 mb-2"
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
                )}
                <span className={`text-[12px] font-medium ${isCompleted ? "text-white/85" : "text-white/55"}`}>
                  {text}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Rotating tips */}
        <div className="relative mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400/70" />
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-[12px] leading-relaxed text-white/45"
            >
              {TIPS[tipIndex]}
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
