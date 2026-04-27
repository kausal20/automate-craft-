"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";

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

type ThinkingIndicatorProps = {
  label: string;
  variant?: "pill" | "card";
};

/**
 * A consolidated, accessible thinking/processing indicator.
 * Replaces all inline dot-animation patterns in ChatContainer.
 */
export function ThinkingIndicator({ label, variant = "pill" }: ThinkingIndicatorProps) {
  const reducedMotion = useReducedMotion();

  if (variant === "card") {
    return (
      <div
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
        role="status"
        aria-label={label}
      >
        {/* Sweep shimmer — disabled on reduced motion */}
        {!reducedMotion && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
        <div className="relative flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/[0.08] ring-1 ring-accent/[0.1]">
            <BrainCircuit className="h-3 w-3 text-accent/60" />
          </div>
          <span className="text-[13px] font-medium text-white/50">{label}</span>
          <div className="ml-auto flex gap-[3px]">
            {reducedMotion ? (
              <span className="text-[11px] text-accent/40">...</span>
            ) : (
              [0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1 w-1 rounded-full bg-accent/50"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: pill variant
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.05] bg-white/[0.02] px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
      role="status"
      aria-label={label}
    >
      <div className="flex items-center gap-[3px]">
        {reducedMotion ? (
          <span className="text-[10px] text-accent/40">...</span>
        ) : (
          [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-[5px] w-[5px] rounded-full bg-accent/50"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
            />
          ))
        )}
      </div>
      <span className="text-[12px] font-medium text-white/40">{label}</span>
    </div>
  );
}
