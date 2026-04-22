"use client";

import { useState, useRef, useEffect } from "react";
import { Coins, Loader2 } from "lucide-react";
import { BuyCreditsModal } from "@/components/dashboard/BuyCreditsModal";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

type CreditsData = {
  planCredits: number;
  extraCredits: number;
  totalCredits: number;
  monthlyUsage: number;
  hasSubscription: boolean;
};

const DEFAULT_CREDITS: CreditsData = {
  planCredits: 50,
  extraCredits: 0,
  totalCredits: 50,
  monthlyUsage: 0,
  hasSubscription: false,
};

export function CreditsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBuyCreditsOpen, setIsBuyCreditsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<CreditsData>(DEFAULT_CREDITS);
  const [animateValue, setAnimateValue] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    async function fetchAndSubscribe() {
      // 1. Initial fetch via API route (server-side auth)
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits({
            planCredits: data.planCredits ?? 0,
            extraCredits: data.extraCredits ?? 0,
            totalCredits: data.totalCredits ?? 0,
            monthlyUsage: data.monthlyUsage ?? 0,
            hasSubscription: data.hasSubscription ?? false,
          });
        }
      } catch (error) {
        console.error("Failed to fetch credits", error);
      } finally {
        setLoading(false);
      }

      // 2. Real-time subscription via browser client
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("credits-realtime")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as {
              plan_credits?: number;
              extra_credits?: number;
              credits?: number;
            };
            // Support both column layouts: `credits` (single) or `plan_credits`+`extra_credits`
            const planCredits = row.plan_credits ?? row.credits ?? 0;
            const extraCredits = row.extra_credits ?? 0;
            const totalCredits = planCredits + extraCredits;
            setCredits((prev) => ({
              ...prev,
              planCredits,
              extraCredits,
              totalCredits,
            }));
          }
        )
        .subscribe();
    }

    void fetchAndSubscribe();

    return () => {
      const supabase = getSupabaseBrowserClient();
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  const refreshCredits = async () => {
    try {
      const res = await fetch("/api/credits", { cache: "no-store" });
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      setCredits({
        planCredits: data.planCredits ?? 50,
        extraCredits: data.extraCredits ?? 0,
        totalCredits: data.totalCredits ?? 50,
        monthlyUsage: data.monthlyUsage ?? 0,
        hasSubscription: data.hasSubscription ?? false,
      });
    } catch (error) {
      console.error("Failed to refresh credits", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const remaining = credits.totalCredits - credits.monthlyUsage;
  const remainingStr = Math.max(remaining, 0).toFixed(2);
  const usagePercent = credits.totalCredits > 0 ? Math.min((credits.monthlyUsage / credits.totalCredits) * 100, 100) : 0;
  const previousRemainingStr = useRef(remainingStr);

  useEffect(() => {
    if (previousRemainingStr.current !== remainingStr && !loading) {
      setAnimateValue(true);
      const timer = setTimeout(() => setAnimateValue(false), 600);
      previousRemainingStr.current = remainingStr;
      return () => clearTimeout(timer);
    } else if (loading) {
      previousRemainingStr.current = remainingStr;
    }
  }, [remainingStr, loading]);

  return (
    <div className="relative z-50 flex" ref={dropdownRef}>
      {/* TRIGGER BUTTON — always visible */}
      <div className="group/credits relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-[34px] items-center gap-2 rounded-full bg-gradient-to-r from-accent to-blue-600 px-3 py-1 shadow-[0_4px_16px_rgba(59,130,246,0.3),0_10px_24px_rgba(59,130,246,0.15)] transition-all duration-200 hover:shadow-[0_6px_22px_rgba(59,130,246,0.4)] hover:translate-y-[-1px] active:scale-95 active:translate-y-0"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin text-white" />
            ) : (
              <Coins className="h-3 w-3 text-white" />
            )}
          </span>
          <span className={`text-sm font-bold tracking-wide transition-all duration-300 ${animateValue ? "scale-110 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "text-white"}`}>
            {remainingStr}
          </span>
        </button>
        {/* Tooltip */}
        <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] opacity-0 group-hover/credits:opacity-100 transition-opacity duration-200 z-40">
          <div className="whitespace-nowrap rounded-lg border border-white/[0.08] bg-[#111113]/95 backdrop-blur-xl px-3 py-1.5 text-[11px] font-medium text-white/50 shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
            Each automation run uses credits
          </div>
        </div>
      </div>

      {/* DROPDOWN PANEL */}
      {isOpen && (
        <div className="absolute right-0 top-[120%] w-[300px] origin-top-right rounded-[16px] border border-white/[0.08] bg-[#0c0c0e]/95 backdrop-blur-2xl p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_24px_60px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* HEADER */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
                Available Credits
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] leading-none font-bold text-white tracking-tight">
                  {remainingStr}
                </span>
                <Coins className="h-5 w-5 text-[#3b82f6]" />
              </div>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 border border-white/5">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {credits.hasSubscription ? "Premium" : "Starter"}
              </span>
            </div>
          </div>

          {/* USAGE BAR */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-white/40 font-medium">Monthly Usage</span>
              <span className="text-white/60 font-bold">{credits.monthlyUsage.toFixed(2)} used</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-cyan-400 transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          <div className="h-px w-full bg-white/10 my-4" />

          {/* CREDIT BREAKDOWN */}
          <div className="space-y-3 mb-5 text-[13px]">
            <div className="flex justify-between items-center">
              <span className="text-white/60 font-medium">Plan Credits</span>
              <span className="text-white font-bold">{credits.planCredits.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 font-medium">Bonus Credits</span>
              <span className="text-white font-bold">{credits.extraCredits.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-3">
              <span className="text-white/80 font-semibold">Total</span>
              <span className="text-white font-bold">{credits.totalCredits.toFixed(2)}</span>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="pt-1">
            <button 
              onClick={() => {
                setIsOpen(false);
                setIsBuyCreditsOpen(true);
              }}
              className="w-full rounded-xl bg-gradient-to-r from-accent to-blue-600 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:translate-y-[-1px] active:translate-y-[1px]"
            >
              Buy More Credits
            </button>
          </div>

        </div>
      )}

      <BuyCreditsModal
        isOpen={isBuyCreditsOpen}
        onClose={() => setIsBuyCreditsOpen(false)}
        onPurchased={() => {
          void refreshCredits();
        }}
      />
    </div>
  );
}
