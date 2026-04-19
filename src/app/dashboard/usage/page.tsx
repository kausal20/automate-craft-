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
          <p className="mt-1 text-foreground/58">
            Monitor your automation runs, manage your credit balance, and view your active plan.
          </p>
        </div>
      </div>
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/5 py-24 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-white/20" />
        <h3 className="text-lg font-bold text-white">Usage Dashboard Retired</h3>
        <p className="mt-2 max-w-sm text-sm text-white/50">
          The legacy usage dashboard has been removed. Active usage and credits can now be tracked in real-time from the top header dropdown on the home page.
        </p>
      </div>
    </div>
  );
}
