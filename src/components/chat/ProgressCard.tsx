"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, BrainCircuit } from "lucide-react";

export function ProgressCard({ steps }: { steps: string[] }) {
  const normalizedSteps = steps.map((step) => step.trim()).filter(Boolean);
  const heading = normalizedSteps[0]?.toLowerCase().includes("analyzing")
    ? "Analyzing your automation"
    : "Building your automation";

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const completedCount = normalizedSteps.filter((s) => s.startsWith("✓")).length;
  const progress = normalizedSteps.length > 0 ? (completedCount / normalizedSteps.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-5"
    >
      <div className="relative group">
        {/* 3D shadow */}
        <div className="absolute inset-0 rounded-2xl bg-accent/[0.03] translate-y-1 blur-xl" />

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111] to-[#0c0c0c] shadow-[0_12px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]">
          {/* Animated progress bar */}
          <div className="relative h-[3px] bg-white/[0.03] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent/60 via-cyan-400/60 to-accent/60"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.max(progress, 15)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            <motion.div
              className="absolute top-0 h-full w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{ x: ["-64px", "500px"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <div className="p-5">
            {/* Ambient glow */}
            <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-accent/8 blur-[35px] pointer-events-none" />

            <div className="relative flex items-center gap-3.5 mb-4">
              {/* 3D Icon with orbiting dot */}
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/15 to-cyan-500/8 ring-1 ring-accent/12 shadow-[0_4px_12px_rgba(59,130,246,0.1),inset_0_1px_0_rgba(255,255,255,0.06)]" />
                <motion.div className="absolute -inset-1">
                  <motion.div
                    className="absolute h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,0.7)]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{ top: 0, left: "50%", marginLeft: "-3px" }}
                  />
                </motion.div>
                <BrainCircuit className="relative h-4 w-4 text-accent" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-white">{heading}</p>
                <p className="text-[12px] text-white/35 mt-0.5">Identifying triggers and actions</p>
              </div>

              <span className="text-[11px] font-mono tabular-nums text-white/20 shrink-0">{elapsed}s</span>
            </div>

            {/* Steps */}
            <div className="space-y-2.5 ml-1">
              {normalizedSteps.map((step, i) => {
                const isCompleted = step.startsWith("✓");
                const text = step.replace("✓ ", "");
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.2 }}
                    className="flex items-center gap-2.5"
                  >
                    <AnimatePresence mode="wait">
                      {isCompleted ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/15">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="dot" className="flex h-5 w-5 items-center justify-center">
                          <Loader2 className="h-3 w-3 animate-spin text-white/20" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span className={`text-[13px] font-medium ${isCompleted ? "text-white/55" : "text-white/30"}`}>
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
