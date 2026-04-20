"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Play, Rocket, Settings2, Loader2, FileCheck2, Sparkles } from "lucide-react";

type ReadyCardProps = {
  title: string;
  description: string;
  trigger?: string;
  action?: string;
  explanation?: string;
  isTesting?: boolean;
  hasTested?: boolean;
  isDeploying?: boolean;
  hasDeployed?: boolean;
  onTest?: () => void;
  onDeploy?: () => void;
  onModify?: () => void;
};

export function ReadyCard({
  title,
  description,
  trigger = "Form Submission",
  action = "Send Notification",
  explanation = "The workflow captures incoming data and executes the configured action path.",
  isTesting,
  hasTested,
  isDeploying,
  hasDeployed,
  onTest,
  onDeploy,
  onModify,
}: ReadyCardProps) {
  // Celebration particles on first mount
  const [showParticles, setShowParticles] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowParticles(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-[85%] mb-6"
    >
      <div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0c0c0c] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {/* Corner glows */}
        <div className="absolute -top-16 -left-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-[50px] pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-24 w-24 rounded-full bg-accent/8 blur-[40px] pointer-events-none" />

        {/* Celebration particles */}
        <AnimatePresence>
          {showParticles && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: "40%",
                    backgroundColor: i % 3 === 0 ? "rgba(52,211,153,0.6)" : i % 3 === 1 ? "rgba(59,130,246,0.6)" : "rgba(6,182,212,0.6)",
                  }}
                  initial={{ opacity: 1, scale: 1, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 0,
                    y: -40 - Math.random() * 60,
                    x: (Math.random() - 0.5) * 80,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 + Math.random() * 0.8, delay: i * 0.08, ease: "easeOut" }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        <div className="p-6 relative">
          <div className="flex items-start gap-4">
            {/* Success icon with scale-bounce */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              className="relative"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/[0.04] ring-1 ring-emerald-500/15">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              {/* Pulse ring */}
              <motion.div
                className="absolute -inset-1 rounded-2xl border border-emerald-500/20"
                animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>

            <div className="flex-1">
              {/* Status badge */}
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400/90">Ready</span>
                </motion.div>
              </div>

              <p className="text-[17px] font-semibold tracking-wide text-white">
                {title}
              </p>
              <div className="mt-2 text-[13px] leading-relaxed text-white/45 whitespace-pre-wrap">
                {description}
              </div>

              {/* Trigger / Action glass cards */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 transition-all duration-200 hover:bg-white/[0.04] hover:border-white/10"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Trigger</p>
                  <p className="mt-1 text-[13px] font-medium text-white/80">{trigger}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 transition-all duration-200 hover:bg-white/[0.04] hover:border-white/10"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Action</p>
                  <p className="mt-1 text-[13px] font-medium text-white/80">{action}</p>
                </motion.div>
              </div>

              <p className="mt-3 text-[12px] leading-relaxed text-white/50">{explanation}</p>

              {/* Ready badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 20 }}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.05] px-3 py-1.5 text-[12px] font-medium text-emerald-400/90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                This automation is ready to run
              </motion.div>
              
              {hasTested && !hasDeployed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2.5 text-emerald-400"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span className="text-[13px] font-medium tracking-wide">Tests passed without errors. Ready to deploy.</span>
                </motion.div>
              )}
              
              {hasDeployed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center gap-2 rounded-xl border border-accent/15 bg-accent/[0.04] px-3 py-2.5 text-accent"
                >
                  <Rocket className="h-4 w-4" />
                  <span className="text-[13px] font-medium tracking-wide">Deployment complete. Live and waiting for triggers.</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="relative mt-7 flex items-center gap-3 border-t border-white/[0.04] pt-5">
            {/* Test button */}
            <button
              onClick={onTest}
              disabled={isTesting || hasTested || isDeploying || hasDeployed}
              className="group relative flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-white/[0.05] hover:border-white/15 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
            >
              {/* Hover border draw effect */}
              <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-accent/20 transition-colors duration-300" />
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-white/60" />}
              Test Flow
            </button>
            
            {/* Deploy button */}
            <button
              onClick={onDeploy}
              disabled={!hasTested || isDeploying || hasDeployed}
              className="group relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-white to-white/95 px-4 py-2.5 text-[13px] font-bold text-black transition-all duration-200 hover:shadow-[0_4px_16px_rgba(255,255,255,0.15)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
            >
              {/* Shine sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Deploy Live
            </button>

            <div className="flex-1" />

            {/* Modify button */}
            <button
              onClick={onModify}
              disabled={isTesting || isDeploying}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium text-white/40 transition-colors hover:text-white/70 hover:bg-white/[0.03] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Settings2 className="h-4 w-4" />
              Modify
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
