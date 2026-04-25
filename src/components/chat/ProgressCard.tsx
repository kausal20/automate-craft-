"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, ChevronDown, Terminal } from "lucide-react";

export function ProgressCard({ steps }: { steps: string[] }) {
  const normalizedSteps = steps.map((s) => s.trim()).filter(Boolean);
  const isAnalyzing = normalizedSteps[0]?.toLowerCase().includes("analyzing");
  const heading = isAnalyzing ? "Thinking process" : "Building process";
  const innerSteps = normalizedSteps.slice(1);

  const [elapsed, setElapsed] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const completedCount = innerSteps.filter((s) => s.startsWith("✓")).length;
  const progress = innerSteps.length > 0 ? (completedCount / innerSteps.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full mb-4"
    >
      <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        {/* Top Progress Bar */}
        <div className="h-[2px] bg-white/[0.02]">
          <motion.div
            className="h-full bg-gradient-to-r from-accent/40 to-accent/80"
            initial={{ width: "5%" }}
            animate={{ width: `${Math.max(progress, 5)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Header (Clickable) */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
            <span className="text-[13px] font-semibold text-white/80">{heading}</span>
            <div className="h-1.5 w-1.5 rounded-full bg-accent/40 animate-pulse ml-1" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tabular-nums text-white/20">{elapsed}s</span>
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
              className="overflow-hidden border-t border-white/[0.03]"
            >
              <div className="px-4 py-3 space-y-1.5 font-mono text-[11px]">
                {innerSteps.length === 0 && (
                  <div className="flex items-center gap-2 text-white/20">
                    <Terminal className="h-3 w-3" />
                    <span>Booting cognitive engine...</span>
                  </div>
                )}
                {innerSteps.map((step, i) => {
                  const isCompleted = step.startsWith("✓");
                  const text = step.replace("✓ ", "");
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.15 }}
                      className="flex items-start gap-2 py-0.5"
                    >
                      <span className="text-white/10 shrink-0 select-none mt-0.5">›</span>
                      <span className={`leading-relaxed ${isCompleted ? "text-emerald-400/50" : "text-white/40"}`}>
                        {text}
                        {!isCompleted && (
                          <motion.span 
                            animate={{ opacity: [1, 0] }} 
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block ml-1 w-1.5 h-[10px] bg-accent/40 align-middle"
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
