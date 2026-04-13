"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Cog } from "lucide-react";

export function ProgressCard({ steps }: { steps: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[85%] mb-6"
    >
      <div className="rounded-[22px] border border-[#222] bg-[#111] p-6 shadow-2xl shadow-black/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-accent ring-1 ring-white/10">
            <Cog className="h-5 w-5 animate-[spin_3s_linear_infinite]" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-wide text-white">
              Building your automation...
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
              Analyzing intent and provisioning logic
            </p>
          </div>
        </div>

        <div className="relative mt-6 space-y-3 ml-2">
          {steps.map((step, i) => {
            const isCompleted = step.startsWith("✓");
            const text = step.replace("✓ ", "");
            return (
              <div key={i} className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                )}
                <span className={`text-[13px] font-medium ${isCompleted ? "text-white/80" : "text-white/40"}`}>
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
