"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, FileCheck2, Rocket, ArrowRight } from "lucide-react";

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
  hasTested,
  hasDeployed,
}: ReadyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-5"
    >
      <div className="relative group">
        {/* 3D shadow layer */}
        <div className="absolute inset-0 rounded-2xl bg-emerald-500/[0.03] translate-y-1 blur-xl transition-all duration-300 group-hover:translate-y-2 group-hover:blur-2xl" />

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111] to-[#0c0c0c] shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]">
          {/* Emerald accent line */}
          <div className="h-[3px] bg-gradient-to-r from-emerald-500/50 via-emerald-400/60 to-cyan-400/50" />

          {/* Ambient glows */}
          <div className="absolute -top-12 -left-12 h-24 w-24 rounded-full bg-emerald-500/8 blur-[40px] pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 h-20 w-20 rounded-full bg-accent/5 blur-[30px] pointer-events-none" />

          <div className="relative px-6 py-5">
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/[0.04] shadow-[0_4px_12px_rgba(52,211,153,0.1),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-emerald-500/15">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <motion.div
                  className="absolute -inset-0.5 rounded-xl border border-emerald-500/15"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-white">{title}</p>
                <p className="text-[12px] text-white/35 mt-0.5">{description}</p>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1.5 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.06)]">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Ready</span>
              </div>
            </div>

            {/* Trigger & Action — 3D cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-white/[0.1]">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/50 mb-1">Trigger</p>
                <p className="text-[13px] font-medium text-white/75 truncate">{trigger}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-white/[0.1]">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400/50 mb-1">Action</p>
                <p className="text-[13px] font-medium text-white/75 truncate">{action}</p>
              </div>
            </div>

            <p className="text-[12px] text-white/30 mb-4 leading-relaxed">{explanation}</p>

            {/* CTA to panel */}
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <Sparkles className="h-3.5 w-3.5 text-accent/40 shrink-0" />
              <span className="text-[12px] text-white/35 flex-1">
                {hasDeployed
                  ? "Automation is live and waiting for triggers"
                  : hasTested
                    ? "Tests passed — deploy from the workflow panel"
                    : "Open the workflow panel to test and deploy"
                }
              </span>
              {!hasDeployed && <ArrowRight className="h-3.5 w-3.5 text-white/20 shrink-0" />}
            </div>

            {/* Status badges */}
            {hasTested && !hasDeployed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2 text-emerald-400/70"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                <span className="text-[12px] font-medium">Tests passed without errors</span>
              </motion.div>
            )}

            {hasDeployed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 rounded-lg border border-accent/15 bg-accent/[0.04] px-3 py-2 text-accent/70"
              >
                <Rocket className="h-3.5 w-3.5" />
                <span className="text-[12px] font-medium">Deployment complete — live</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
