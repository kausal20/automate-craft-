"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Rocket,
  FlaskConical,
  PenLine,
  Loader2,
  ArrowRight,
  Radio,
} from "lucide-react";

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full mb-4"
    >
      <div className="rounded-xl border border-white/[0.06] bg-[#0e0e10] overflow-hidden">
        <div className="px-5 py-5">

          {/* Status badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/8">
                <CheckCircle2 className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white/90">Automation ready</p>
                <p className="text-[11px] text-white/30 mt-0.5">Review and deploy your workflow</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              hasDeployed
                ? "bg-emerald-400/8 text-emerald-400 border border-emerald-400/15"
                : "bg-accent/8 text-accent/70 border border-accent/15"
            }`}>
              <div className={`h-1.5 w-1.5 rounded-full ${hasDeployed ? "bg-emerald-400 animate-pulse" : "bg-accent"}`} />
              {hasDeployed ? "Live" : "Ready"}
            </div>
          </div>

          {/* Pipeline summary */}
          <div className="flex items-center gap-2 mb-3 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[12px]">
            <span className="text-amber-400/60">●</span>
            <span className="text-white/40 truncate">{trigger}</span>
            <ArrowRight className="h-3 w-3 text-white/12 shrink-0" />
            <span className="text-blue-400/60">●</span>
            <span className="text-white/40">Process</span>
            <ArrowRight className="h-3 w-3 text-white/12 shrink-0" />
            <span className="text-violet-400/60">●</span>
            <span className="text-white/40 truncate">{action}</span>
          </div>

          <p className="text-[12px] text-white/25 mb-5 leading-relaxed">{explanation}</p>

          {/* Actions */}
          {!hasDeployed && (
            <div className="flex items-center gap-2">
              <button
                onClick={onTest}
                disabled={isTesting || isDeploying}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed ${
                  hasTested
                    ? "border border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-400/70"
                    : "border border-white/[0.06] bg-white/[0.02] text-white/50 hover:bg-white/[0.04] hover:text-white/70"
                }`}
              >
                {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : hasTested ? <CheckCircle2 className="h-3.5 w-3.5" /> : <FlaskConical className="h-3.5 w-3.5" />}
                {isTesting ? "Testing…" : hasTested ? "Passed" : "Test"}
              </button>

              <button
                onClick={onDeploy}
                disabled={isDeploying || isTesting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-[12px] font-semibold text-white transition-all hover:bg-accent/90 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isDeploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                {isDeploying ? "Deploying…" : "Deploy"}
              </button>

              <button
                onClick={onModify}
                disabled={isTesting || isDeploying}
                className="flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-white/30 transition-all hover:text-white/50 hover:bg-white/[0.04] active:scale-[0.97] disabled:opacity-30"
              >
                <PenLine className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Post-deploy */}
          <AnimatePresence>
            {hasDeployed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] px-3.5 py-2.5">
                  <Radio className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[12px] font-medium text-emerald-400/80">Pipeline is live</p>
                    <p className="text-[10px] text-white/25 mt-0.5">Listening for incoming triggers</p>
                  </div>
                </div>
                <button
                  onClick={onModify}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 text-[12px] font-medium text-white/35 transition-all hover:text-white/55 active:scale-[0.98]"
                >
                  <PenLine className="h-3 w-3" /> Edit
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
