"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Play, Rocket, Settings2, Loader2, FileCheck2 } from "lucide-react";

type ReadyCardProps = {
  title: string;
  description: string;
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[85%] mb-6"
    >
      <div className="rounded-[22px] border border-[#222] bg-[#111] p-6 shadow-2xl shadow-black/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-green-400 ring-1 ring-white/10">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-semibold tracking-wide text-white">
              {title}
            </p>
            <div className="mt-2 text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap">
              {description}
            </div>
            
            {hasTested && !hasDeployed && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-green-400">
                <FileCheck2 className="h-4 w-4" />
                <span className="text-[13px] font-medium tracking-wide">Tests passed without errors. Ready to deploy.</span>
              </div>
            )}
            
            {hasDeployed && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-accent">
                <Rocket className="h-4 w-4" />
                <span className="text-[13px] font-medium tracking-wide">Deployment complete. Live and waiting for triggers.</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-7 flex items-center gap-3 border-t border-white/5 pt-5">
          <button
            onClick={onTest}
            disabled={isTesting || hasTested || isDeploying || hasDeployed}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-white/70" />}
            Test Flow
          </button>
          
          <button
            onClick={onDeploy}
            disabled={!hasTested || isDeploying || hasDeployed}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[13px] font-bold text-black transition-all hover:scale-[1.02] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Deploy Live
          </button>

          <div className="flex-1" />

          <button
            onClick={onModify}
            disabled={isTesting || isDeploying}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings2 className="h-4 w-4" />
            Modify
          </button>
        </div>
      </div>
    </motion.div>
  );
}
