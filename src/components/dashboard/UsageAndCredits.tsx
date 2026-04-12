"use client";

import { useEffect, useState } from "react";
import { CreditCard, Rocket, History, Check } from "lucide-react";
import { motion } from "framer-motion";
import { BuyCreditsModal } from "@/components/dashboard/BuyCreditsModal";

type UsageLog = {
  id: string;
  action: string;
  creditsUsed: number;
  status: string;
  createdAt: string;
};

type CreditsData = {
  planCredits: number;
  extraCredits: number;
  totalCredits: number;
  monthlyUsage: number;
  usageHistory: UsageLog[];
  hasSubscription: boolean;
};

export function UsageAndCredits() {
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const loadCredits = async () => {
    try {
      const res = await fetch("/api/credits");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredits();
  }, []);

  const handleBuyCreditsSuccess = async () => {
    await loadCredits();
    setShowBuyModal(false);
  };

  if (loading || !data) {
    return (
      <div className="card-surface mt-10 rounded-[2rem] p-10 text-center text-foreground/56">
        Loading credits...
      </div>
    );
  }

  // Warning thresholds based on totalCredits
  const warningThreshold = Math.max(50, (data.planCredits || 500) * 0.1);
  const isLowCredits = data.totalCredits < warningThreshold && data.totalCredits > 0;
  const isOutOfCredits = data.totalCredits <= 0;

  const UnifiedCreditCard = () => {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex min-w-[320px] flex-1 flex-col justify-center rounded-[2.5rem] bg-[#111111] p-10 shadow-[0_12px_40px_rgb(0,0,0,0.12)] text-white"
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-bold uppercase tracking-wider text-white/50 mb-2">
            Remaining Balance
          </span>
          <span className="text-[4.5rem] font-bold leading-none tracking-tight">
            {data.totalCredits.toLocaleString()}
          </span>
          
          <div className="mt-8 flex w-full gap-4 pt-6 border-t border-white/10">
            <div className="flex flex-col">
               <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Plan Credits</span>
               <span className="text-xl font-bold">{data.planCredits.toLocaleString()}</span>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col">
               <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Extra Credits</span>
               <span className="text-xl font-bold text-[#3B82F6]">{data.extraCredits.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const UsageInsightPanel = () => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
      className="flex min-w-[280px] flex-1 flex-col justify-center gap-6 rounded-[2.5rem] bg-[#111111] p-10 shadow-[0_12px_40px_rgb(0,0,0,0.12)] ring-1 ring-white/10"
    >
      <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">
        Monthly Insights
      </h3>
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <span className="text-white/60">Credits consumed</span>
        <span className="text-xl font-bold text-white">{data.monthlyUsage.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <span className="text-white/60">Total automations created</span>
        <span className="text-xl font-bold text-white">
          {data.usageHistory.filter((l) => l.action.includes("Generated")).length}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/60">Total executions run</span>
        <span className="text-xl font-bold text-white">
          {data.usageHistory.filter((l) => l.action.toLowerCase().includes("execut") || l.action.toLowerCase().includes("sent") || l.action.toLowerCase().includes("run")).length}
        </span>
      </div>
    </motion.div>
  );

  return (
    <section className="mt-0">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-[-0.04em] text-[#3B82F6]">
            Usage & Credits
          </h2>
          <p className="mt-2 text-white/50">
            Monitor your workspace consumption and recharge globally across all workflows.
          </p>
        </div>
      </div>

      {isOutOfCredits && (
        <div className="mb-8 rounded-[1.5rem] bg-red-50 p-6 ring-1 ring-red-100 flex items-center justify-between">
          <div>
             <h4 className="font-bold text-red-900 text-lg">You're out of credits!</h4>
             <p className="font-medium text-red-800/80 mt-1">
               Your automations have been paused.
             </p>
          </div>
        </div>
      )}

      {isLowCredits && !isOutOfCredits && (
        <div className="mb-8 rounded-[1.5rem] bg-orange-50 p-5 ring-1 ring-orange-100 flex items-center justify-between">
          <p className="font-medium text-orange-800">
            ⚠️ You’re running low on credits. Please contact support to recharge.
          </p>
        </div>
      )}

      {/* Top Layout */}
      <div className="flex flex-wrap gap-6">
        <UnifiedCreditCard />
        <UsageInsightPanel />
      </div>

      {/* Usage History Table */}
      <div className="mt-16 rounded-[2.5rem] bg-[#111111] p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] ring-1 ring-white/10">
        <h3 className="mb-8 text-xl font-bold tracking-tight text-white">
          Usage History
        </h3>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="pb-4 font-medium uppercase tracking-wider text-[11px]">Date</th>
                <th className="pb-4 font-medium uppercase tracking-wider text-[11px]">Action</th>
                <th className="pb-4 font-medium uppercase tracking-wider text-[11px]">Cost</th>
                <th className="pb-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {data.usageHistory.map((log) => (
                <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-5 text-white/50">
                    {new Date(log.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </td>
                  <td className="py-5 font-semibold">{log.action}</td>
                  <td className="py-5 font-bold text-red-400">
                     {log.creditsUsed > 0 ? `-${log.creditsUsed}` : log.creditsUsed}
                  </td>
                  <td className="py-5">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        log.status === "Success"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.usageHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-white/50">
                    <div className="flex flex-col items-center justify-center">
                       <History className="h-8 w-8 text-white/10 mb-3" />
                       <span className="font-medium">No usage history found.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BuyCreditsModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        onSuccess={handleBuyCreditsSuccess}
      />
    </section>
  );
}
