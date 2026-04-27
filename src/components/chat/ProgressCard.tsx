"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, ChevronDown, Terminal, BrainCircuit, Cpu } from "lucide-react";

export function ProgressCard({ steps }: { steps: string[] }) {
  const normalizedSteps = steps.map((s) => s.trim()).filter(Boolean);
  const isAnalyzing = normalizedSteps[0]?.toLowerCase().includes("analyzing");
  const heading = isAnalyzing ? "Thinking process" : "Building process";
  const headingIcon = isAnalyzing ? BrainCircuit : Cpu;
  const HeadingIcon = headingIcon;
  const innerSteps = normalizedSteps.slice(1);

  const [elapsed, setElapsed] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const completedCount = innerSteps.filter((s) => s.startsWith("✓")).length;
  const totalSteps = innerSteps.length || 1;
  const progress = (completedCount / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full mb-4"
    >
      <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.02)_inset]">
        {/* Top Progress Bar — gradient with glow */}
        <div className="h-[2px] bg-white/[0.02] relative">
          <motion.div
            className="h-full rounded-r-full"
            style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(59,130,246,0.9))" }}
            initial={{ width: "3%" }}
            animate={{ width: `${Math.max(progress, 5)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {/* Glow pulse at the leading edge */}
          <motion.div
            className="absolute top-0 h-full w-8 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)", right: `${100 - Math.max(progress, 5)}%` }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>

        {/* Header (Clickable) */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.01] hover:bg-white/[0.025] transition-colors duration-200"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/[0.08] ring-1 ring-accent/[0.12]">
              <HeadingIcon className="h-3 w-3 text-accent animate-pulse" />
            </div>
            <span className="text-[13px] font-semibold text-white/80">{heading}</span>
            <div className="flex gap-[3px] ml-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1 w-1 rounded-full bg-accent/50"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium text-white/25 tabular-nums bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.04]">
              {elapsed}s
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-white/20 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* Expandable Terminal View */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-white/[0.04]"
            >
              <div className="px-4 py-3.5 space-y-2 font-mono text-[11px]">
                {innerSteps.length === 0 && (
                  <div className="flex items-center gap-2 text-white/20">
                    <Terminal className="h-3 w-3" />
                    <span>Booting cognitive engine...</span>
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block w-1.5 h-[10px] bg-accent/40"
                    />
                  </div>
                )}
                {innerSteps.map((step, i) => {
                  const isCompleted = step.startsWith("✓");
                  const text = step.replace("✓ ", "");
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.2 }}
                      className="flex items-start gap-2.5 py-0.5"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400/60 shrink-0 mt-0.5" />
                      ) : (
                        <Loader2 className="h-3 w-3 text-accent/50 animate-spin shrink-0 mt-0.5" />
                      )}
                      <span className={`leading-relaxed ${isCompleted ? "text-emerald-400/50 line-through decoration-emerald-400/20" : "text-white/50"}`}>
                        {text}
                        {!isCompleted && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block ml-1 w-1.5 h-[10px] bg-accent/40 align-middle rounded-sm"
                          />
                        )}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
