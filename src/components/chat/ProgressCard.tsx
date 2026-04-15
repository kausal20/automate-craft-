"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Cog } from "lucide-react";

export function ProgressCard({ steps }: { steps: string[] }) {
  const normalizedSteps = steps.map((step) => step.trim()).filter(Boolean);
  const isAnalyzing = normalizedSteps[0]?.toLowerCase().includes("analyzing");
  const heading = isAnalyzing ? "Analyzing your automation..." : "Building your automation...";
  const description = isAnalyzing
    ? "Understanding your trigger and action intent."
    : "Configuring workflow logic and services.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full max-w-[85%] mb-6"
    >
      <div className="rounded-[22px] border border-[#222] bg-[#111] p-6 shadow-2xl shadow-black/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-accent ring-1 ring-white/10">
            <Cog className="h-5 w-5 animate-[spin_6s_linear_infinite]" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-wide text-white">
              {heading}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
              {description}
            </p>
          </div>
        </div>

        <div className="relative mt-6 space-y-3 ml-2">
          {normalizedSteps.map((step, i) => {
            const isCompleted = step.startsWith("✓");
            const text = step.replace("✓ ", "");
            return (
              <div key={i} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 mr-2 mb-2">
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
                )}
                <span className={`text-[12px] font-medium ${isCompleted ? "text-white/85" : "text-white/55"}`}>
                  {text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
