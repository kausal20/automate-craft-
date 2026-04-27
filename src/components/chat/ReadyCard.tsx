"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Rocket,
  FlaskConical,
  PenLine,
  Loader2,
  ArrowRight,
  Radio,
  ShieldCheck,
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
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-4"
    >
      <div className="liquid-glass rounded-xl border border-white/[0.08] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <div className="px-5 py-5">

          {/* Status badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                hasDeployed ? "bg-emerald-400/[0.08] ring-1 ring-emerald-400/20" : "bg-accent/[0.08] ring-1 ring-accent/15"
              }`}>
                {hasDeployed ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                )}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white/90">
                  {hasDeployed ? "Pipeline is live" : "Automation ready"}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">
                  {hasDeployed ? "Listening for incoming triggers" : "Review and deploy your workflow"}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 ${
              hasDeployed
                ? "bg-emerald-400/[0.08] text-emerald-400 border border-emerald-400/15 shadow-[0_0_12px_rgba(52,211,153,0.1)]"
                : hasTested
                ? "bg-emerald-400/[0.06] text-emerald-400/70 border border-emerald-400/12"
                : "bg-accent/[0.08] text-accent/70 border border-accent/15"
            }`}>
              <div className={`h-1.5 w-1.5 rounded-full transition-colors ${
                hasDeployed ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]" : hasTested ? "bg-emerald-400" : "bg-accent"
              }`} />
              {hasDeployed ? "Live" : hasTested ? "Tested" : "Ready"}
            </div>
          </div>

          {/* Pipeline summary — with glow dots */}
          <div className="flex items-center gap-2.5 mb-3.5 py-2.5 px-3.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400/60 shadow-[0_0_6px_rgba(245,158,11,0.3)]" />
              <span className="text-white/50 truncate font-medium">{trigger}</span>
            </div>
            <ArrowRight className="h-3 w-3 text-white/12 shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400/60 shadow-[0_0_6px_rgba(59,130,246,0.3)]" />
              <span className="text-white/50 font-medium">Process</span>
            </div>
            <ArrowRight className="h-3 w-3 text-white/12 shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-400/60 shadow-[0_0_6px_rgba(139,92,246,0.3)]" />
              <span className="text-white/50 truncate font-medium">{action}</span>
            </div>
          </div>

          <p className="text-[12px] text-white/25 mb-5 leading-relaxed">{explanation}</p>

          {/* Actions */}
          {!hasDeployed && (
            <div className="flex items-center gap-2">
              <button
                onClick={onTest}
                disabled={isTesting || isDeploying}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed ${
                  hasTested
                    ? "border border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-400/70 shadow-[0_0_10px_rgba(52,211,153,0.06)]"
                    : "border border-white/[0.06] bg-white/[0.02] text-white/50 hover:bg-white/[0.04] hover:text-white/70 hover:border-white/[0.1]"
                }`}
              >
                {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : hasTested ? <CheckCircle2 className="h-3.5 w-3.5" /> : <FlaskConical className="h-3.5 w-3.5" />}
                {isTesting ? "Testing…" : hasTested ? "Passed" : "Test"}
              </button>

              <button
                onClick={onDeploy}
                disabled={isDeploying || isTesting}
                className="liquid-button flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-[12px] font-semibold text-white transition-all duration-200 hover:bg-accent/90 hover:shadow-[0_4px_20px_rgba(59,130,246,0.5),0_0_0_1px_rgba(59,130,246,0.3)] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
              >
                {isDeploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                {isDeploying ? "Deploying…" : "Deploy"}
              </button>

              <button
                onClick={onModify}
                disabled={isTesting || isDeploying}
                className="flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-white/30 transition-all duration-200 hover:text-white/50 hover:bg-white/[0.04] hover:border-white/[0.1] active:scale-[0.97] disabled:opacity-30"
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
                className="space-y-2.5 relative"
              >
                {/* Deploy celebration particles */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={`spark-${i}`}
                    className="absolute h-1.5 w-1.5 rounded-full"
                    style={{
                      left: "50%",
                      top: "0%",
                      background: i % 2 === 0 ? "#34d399" : "#3b82f6",
                      boxShadow: `0 0 6px ${i % 2 === 0 ? "rgba(52,211,153,0.6)" : "rgba(59,130,246,0.6)"}`,
                    }}
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{
                      opacity: 0,
                      scale: 0.4,
                      x: (i - 2) * 40 + (Math.random() - 0.5) * 20,
                      y: -(30 + Math.random() * 40),
                    }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.05 }}
                  />
                ))}
                <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] px-3.5 py-2.5">
                  <div className="relative">
                    <Radio className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <motion.div
                      className="absolute -inset-1 rounded-full border border-emerald-400/20"
                      animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-emerald-400/80">Pipeline is live</p>
                    <p className="text-[10px] text-white/25 mt-0.5">Listening for incoming triggers</p>
                  </div>
                </div>
                <button
                  onClick={onModify}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 text-[12px] font-medium text-white/35 transition-all duration-200 hover:text-white/55 hover:bg-white/[0.04] active:scale-[0.98]"
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
