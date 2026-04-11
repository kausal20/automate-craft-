"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, PenLine, Rocket } from "lucide-react";

type AutomationPreviewProps = {
  flow: {
    trigger: string;
    action: string;
    destination: string;
  };
  onDeploy: () => void;
  onEdit: () => void;
  isDeploying?: boolean;
  hasDeployed?: boolean;
};

export function AutomationPreview({
  flow,
  onDeploy,
  onEdit,
  isDeploying,
  hasDeployed,
}: AutomationPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-6 shadow-[0_12px_30px_rgba(28,28,28,0.06)]">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Automation preview
            </p>
            <p className="mt-1 text-sm leading-7 text-subtle">
              Review the generated workflow path before deployment.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1 rounded-[18px] border border-[#E5E7EB] bg-black/[0.02] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Trigger
            </p>
            <p className="mt-2 text-sm leading-7 text-foreground">{flow.trigger}</p>
          </div>

          <div className="flex items-center justify-center text-foreground/26">
            <ArrowRight className="h-5 w-5" />
          </div>

          <div className="flex-1 rounded-[18px] border border-[#E5E7EB] bg-black/[0.02] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Action
            </p>
            <p className="mt-2 text-sm leading-7 text-foreground">{flow.action}</p>
          </div>

          <div className="flex items-center justify-center text-foreground/26">
            <ArrowRight className="h-5 w-5" />
          </div>

          <div className="flex-1 rounded-[18px] border border-[#E5E7EB] bg-black/[0.02] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Destination
            </p>
            <p className="mt-2 text-sm leading-7 text-foreground">{flow.destination}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={onDeploy}
            disabled={isDeploying || hasDeployed}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-white transition-all hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {hasDeployed ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Deployed
              </>
            ) : isDeploying ? (
              "Deploying..."
            ) : (
              "Deploy"
            )}
          </button>

          {!hasDeployed ? (
            <button
              onClick={onEdit}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
            >
              <PenLine className="h-4 w-4" />
              Edit
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
