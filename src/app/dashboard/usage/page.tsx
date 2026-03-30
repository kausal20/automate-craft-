"use client";

import { UsageAndCredits } from "@/components/dashboard/UsageAndCredits";

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
      <div className="mt-8">
        <UsageAndCredits />
      </div>
    </div>
  );
}
