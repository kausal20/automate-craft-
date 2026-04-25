"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

export function ProgressCard({ steps }: { steps: string[] }) {
  const normalizedSteps = steps.map((s) => s.trim()).filter(Boolean);
  const isAnalyzing = normalizedSteps[0]?.toLowerCase().includes("analyzing");
  const heading = isAnalyzing ? "Analyzing your automation" : "Building your automation";

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const completedCount = normalizedSteps.filter((s) => s.startsWith("✓")).length;
  const progress = normalizedSteps.length > 0 ? (completedCount / normalizedSteps.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full mb-4"
    >
      <div className="rounded-xl border border-white/[0.06] bg-[#0e0e10] overflow-hidden">
        {/* Progress bar — thin, elegant */}
        <div className="h-[2px] bg-white/[0.03]">
          <motion.div
            className="h-full bg-accent/60"
            initial={{ width: "5%" }}
            animate={{ width: `${Math.max(progress, 12)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
              <span className="text-[13px] font-semibold text-white/80">{heading}</span>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-white/15">{elapsed}s</span>
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            {normalizedSteps.map((step, i) => {
              const isCompleted = step.startsWith("✓");
              const text = step.replace("✓ ", "");
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      </motion.div>
                    ) : (
                      <motion.div key="active" className="flex h-3.5 w-3.5 items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent/50 animate-pulse" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span className={`text-[12px] ${isCompleted ? "text-white/45" : "text-white/30"}`}>{text}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
