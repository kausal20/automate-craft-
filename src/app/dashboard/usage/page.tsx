"use client";

import { AlertCircle } from "lucide-react";

export default function UsagePage() {
  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground">
            Usage & Credits
          </h1>
          <p className="mt-1 text-white/40">
            Monitor your automation runs, manage your credit balance, and view your active plan.
          </p>
        </div>
      </div>
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] py-24 text-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <AlertCircle className="mb-4 h-12 w-12 text-accent/25" />
        <h3 className="text-lg font-bold text-white tracking-tight">Usage Dashboard Retired</h3>
        <p className="mt-2 max-w-sm text-sm text-white/40 leading-relaxed">
          The legacy usage dashboard has been removed. Active usage and credits can now be tracked in real-time from the top header dropdown on the home page.
        </p>
      </div>
    </div>
  );
}
