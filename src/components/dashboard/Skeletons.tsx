"use client";

/**
 * Reusable skeleton loading primitives for dashboard pages.
 * Uses the animate-shimmer class from globals.css.
 */

export function SkeletonLine({ width = "100%", height = "14px" }: { width?: string; height?: string }) {
  return (
    <div
      className="rounded-lg bg-white/[0.04]"
      style={{ width, height }}
    >
      <div className="h-full w-full animate-shimmer rounded-lg" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/[0.04] animate-pulse" />
        <div className="space-y-2 flex-1">
          <SkeletonLine width="60%" height="14px" />
          <SkeletonLine width="40%" height="10px" />
        </div>
      </div>
      <SkeletonLine width="100%" height="12px" />
      <SkeletonLine width="80%" height="12px" />
    </div>
  );
}

export function SkeletonStatRow() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <SkeletonLine width="50%" height="10px" />
          <SkeletonLine width="40%" height="24px" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="space-y-2">
        <SkeletonLine width="200px" height="24px" />
        <SkeletonLine width="300px" height="13px" />
      </div>
      <SkeletonStatRow />
      <SkeletonList count={3} />
    </div>
  );
}
