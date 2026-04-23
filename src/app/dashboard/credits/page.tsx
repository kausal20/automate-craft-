"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  RefreshCcw,
  ShoppingCart,
  Crown,
  LoaderCircle,
  Sparkles,
  BarChart3,
  CreditCard,
} from "lucide-react";

type CreditTransaction = {
  id: string;
  type: "grant" | "deduct" | "purchase" | "subscription" | "refund" | "adjustment";
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

type CreditsData = {
  planCredits: number;
  extraCredits: number;
  totalCredits: number;
  monthlyUsage: number;
  hasSubscription: boolean;
};

const TYPE_CONFIG: Record<
  CreditTransaction["type"],
  { label: string; icon: React.ElementType; color: string; bg: string; ring: string; sign: "+" | "-" }
> = {
  grant:        { label: "Grant",        icon: Gift,         color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "ring-emerald-400/20", sign: "+" },
  deduct:       { label: "Used",         icon: Zap,          color: "text-red-400",     bg: "bg-red-400/10",     ring: "ring-red-400/20",     sign: "-" },
  purchase:     { label: "Purchase",     icon: ShoppingCart, color: "text-blue-400",    bg: "bg-blue-400/10",    ring: "ring-blue-400/20",    sign: "+" },
  subscription: { label: "Subscription", icon: Crown,        color: "text-amber-400",   bg: "bg-amber-400/10",   ring: "ring-amber-400/20",   sign: "+" },
  refund:       { label: "Refund",       icon: RefreshCcw,   color: "text-purple-400",  bg: "bg-purple-400/10",  ring: "ring-purple-400/20",  sign: "+" },
  adjustment:   { label: "Adjustment",   icon: BarChart3,    color: "text-white/50",    bg: "bg-white/[0.04]",   ring: "ring-white/[0.08]",   sign: "+" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data);
        }
      } finally {
        setLoadingCredits(false);
      }
    };

    const fetchTransactions = async () => {
      try {
        const res = await fetch("/api/credit-transactions");
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions ?? []);
        }
      } finally {
        setLoadingTx(false);
      }
    };

    void fetchCredits();
    void fetchTransactions();
  }, []);

  const usagePercent = credits
    ? Math.min(100, Math.round((credits.monthlyUsage / Math.max(credits.planCredits + credits.extraCredits + credits.monthlyUsage, 1)) * 100))
    : 0;

  return (
    <div className="relative mx-auto max-w-5xl p-8">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.04)_0%,transparent_60%)]" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1">
            <Zap className="h-3 w-3 text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Credits & Usage</span>
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-white">Credit Balance</h1>
          <p className="mt-1 text-white/40">Track your credit usage and transaction history.</p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-accent to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:-translate-y-0.5"
        >
          <Crown className="h-4 w-4" />
          Upgrade Plan
        </Link>
      </div>

      {/* Balance Cards */}
      {loadingCredits ? (
        <div className="mb-8 flex h-40 items-center justify-center rounded-[2rem] border border-white/[0.06] bg-white/[0.02]">
          <LoaderCircle className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 grid gap-4 md:grid-cols-3"
        >
          {/* Total Balance */}
          <div className="md:col-span-1 group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0e1520] to-[#0a0d14] p-7 ring-1 ring-accent/20 shadow-[0_4px_24px_rgba(59,130,246,0.1)] transition-all hover:-translate-y-1 hover:ring-accent/30 hover:shadow-[0_12px_40px_rgba(59,130,246,0.15)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-[50px]" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent/60">Total Balance</p>
              <p className="mt-3 font-mono text-[3.5rem] font-bold leading-none tracking-tight text-white">
                {credits?.totalCredits ?? 0}
              </p>
              <p className="mt-2 text-sm text-white/35">credits available</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                  {credits?.planCredits ?? 0} plan
                </div>
                {(credits?.extraCredits ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
                    {credits?.extraCredits} extra
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Usage */}
          <div className="group relative overflow-hidden rounded-[2rem] bg-[#0a0a0a] p-7 ring-1 ring-white/10 shadow-2xl transition-all hover:-translate-y-1 hover:ring-white/20">
            <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-purple-500/10 blur-[50px]" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">This Month Used</p>
              <p className="mt-3 font-mono text-[3rem] font-bold leading-none tracking-tight text-white">
                {credits?.monthlyUsage ?? 0}
              </p>
              <p className="mt-2 text-sm text-white/35">credits consumed</p>
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/30">
                  <span>Usage</span>
                  <span>{usagePercent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className={`h-full rounded-full ${
                      usagePercent > 80
                        ? "bg-gradient-to-r from-red-500 to-red-400"
                        : usagePercent > 50
                          ? "bg-gradient-to-r from-amber-500 to-amber-400"
                          : "bg-gradient-to-r from-accent to-blue-400"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Plan Status */}
          <div className="group relative overflow-hidden rounded-[2rem] bg-[#0a0a0a] p-7 ring-1 ring-white/10 shadow-2xl transition-all hover:-translate-y-1 hover:ring-white/20">
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-amber-500/10 blur-[50px]" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">Plan Status</p>
              <div className="mt-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${credits?.hasSubscription ? "bg-amber-400/10 ring-amber-400/25" : "bg-white/[0.04] ring-white/[0.08]"}`}>
                  <Crown className={`h-5 w-5 ${credits?.hasSubscription ? "text-amber-400" : "text-white/25"}`} />
                </div>
                <div>
                  <p className="text-base font-bold text-white">
                    {credits?.hasSubscription ? "Subscribed" : "Free Plan"}
                  </p>
                  <p className="text-[12px] text-white/35">
                    {credits?.hasSubscription ? "Active subscription" : "10 starter credits"}
                  </p>
                </div>
              </div>
              {!credits?.hasSubscription && (
                <Link
                  href="/pricing"
                  className="mt-6 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-blue-600 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(59,130,246,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(59,130,246,0.3)]"
                >
                  <Sparkles className="h-4 w-4" />
                  Upgrade for more
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link
          href="/pricing"
          className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-accent/25 hover:bg-accent/[0.03] hover:-translate-y-0.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Upgrade Plan</p>
            <p className="text-[11px] text-white/30">Get more credits</p>
          </div>
          <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-white/20 group-hover:text-accent transition-colors" />
        </Link>
        <Link
          href="/how-credits-work"
          className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.03] hover:-translate-y-0.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08]">
            <BarChart3 className="h-4 w-4 text-white/40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">How Credits Work</p>
            <p className="text-[11px] text-white/30">Learn the system</p>
          </div>
          <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
        </Link>
        <Link
          href="/dashboard"
          className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-emerald-400/20 hover:bg-emerald-400/[0.03] hover:-translate-y-0.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-400/20">
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Build Automation</p>
            <p className="text-[11px] text-white/30">Use 5 credits</p>
          </div>
          <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-white/20 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>

      {/* Transaction History */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white">Transaction History</h2>
          <span className="text-sm text-white/30">{transactions.length} entries</span>
        </div>

        {loadingTx ? (
          <div className="flex h-40 items-center justify-center rounded-[2rem] border border-white/[0.06] bg-white/[0.02]">
            <LoaderCircle className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/[0.08] ring-1 ring-accent/15">
              <CreditCard className="h-6 w-6 text-accent/50" />
            </div>
            <p className="text-base font-semibold text-white/50">No transactions yet</p>
            <p className="mt-2 max-w-xs text-sm text-white/25">
              Your credit activity will appear here once you start building automations.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, index) => {
              const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.adjustment;
              const Icon = cfg.icon;
              const isDeduct = tx.type === "deduct";

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className="flex items-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-5 py-4 transition-all hover:border-white/[0.09] hover:bg-white/[0.03]"
                >
                  {/* Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bg} ring-1 ${cfg.ring}`}>
                    <Icon className={`h-4.5 w-4.5 ${cfg.color}`} />
                  </div>

                  {/* Description */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white/85">{tx.description}</p>
                    <p className="mt-0.5 text-[11px] text-white/30">{formatDate(tx.createdAt)}</p>
                  </div>

                  {/* Type badge */}
                  <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] sm:block ${cfg.bg} ${cfg.color} ring-1 ${cfg.ring}`}>
                    {cfg.label}
                  </span>

                  {/* Amount */}
                  <div className="text-right">
                    <p className={`text-base font-bold tabular-nums ${isDeduct ? "text-red-400" : "text-emerald-400"}`}>
                      {isDeduct ? <ArrowDownRight className="mr-0.5 inline h-3.5 w-3.5" /> : <ArrowUpRight className="mr-0.5 inline h-3.5 w-3.5" />}
                      {cfg.sign}{tx.amount}
                    </p>
                    {tx.balanceAfter > 0 && (
                      <p className="mt-0.5 text-[11px] text-white/25">→ {tx.balanceAfter} left</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
