"use client";

import { motion } from "framer-motion";
import { Activity, CheckCircle2, Clock3 } from "lucide-react";

export function StatusBlock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-6 shadow-[0_12px_30px_rgba(28,28,28,0.06)]">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Deployment status
            </p>
            <p className="mt-1 text-sm leading-7 text-subtle">
              The automation is live and ready to receive incoming events.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[18px] border border-[#E5E7EB] bg-black/[0.02] p-4">
            <div className="flex items-center gap-2 text-foreground/52">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Status
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">Active</p>
          </div>

          <div className="rounded-[18px] border border-[#E5E7EB] bg-black/[0.02] p-4">
            <div className="flex items-center gap-2 text-foreground/52">
              <Clock3 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Last run
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">Just now</p>
          </div>

          <div className="rounded-[18px] border border-[#E5E7EB] bg-black/[0.02] p-4">
            <div className="flex items-center gap-2 text-foreground/52">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Result
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">Ready</p>
          </div>
        </div>

        <div className="mt-8 rounded-[18px] border border-[#E5E7EB] bg-black/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/52">
            Execution notes
          </p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-subtle">
            <p>Webhook listener configured and waiting for incoming events.</p>
            <p>Notification and CRM sync steps are now linked to the deployed flow.</p>
            <p>Future runs will appear in the logs section of your dashboard.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
