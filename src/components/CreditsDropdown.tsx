"use client";

import { useState, useRef, useEffect } from "react";
import { Coins, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<CreditsData>(DEFAULT_CREDITS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits({
            planCredits: data.planCredits ?? 50,
            extraCredits: data.extraCredits ?? 0,
            totalCredits: data.totalCredits ?? 50,
            monthlyUsage: data.monthlyUsage ?? 0,
            hasSubscription: data.hasSubscription ?? false,
          });
        }
      } catch (error) {
        console.error("Failed to fetch credits", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCredits();
  }, []);

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

  return (
    <div className="relative z-50 flex" ref={dropdownRef}>
      {/* TRIGGER BUTTON — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-[34px] items-center gap-2 rounded-full bg-[#3B82F6] px-3 py-1 shadow-[0_10px_24px_rgba(59,130,246,0.28)] transition-all duration-200 hover:bg-[#4a8cf7] hover:shadow-[0_12px_28px_rgba(59,130,246,0.34)] active:scale-95"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-white" />
          ) : (
            <Coins className="h-3 w-3 text-white" />
          )}
        </span>
        <span className="text-sm font-bold text-white tracking-wide">
          {remainingStr}
        </span>
      </button>

      {/* DROPDOWN PANEL */}
      {isOpen && (
        <div className="absolute right-0 top-[120%] w-[300px] origin-top-right rounded-[16px] border border-white/10 bg-black p-4 shadow-[0_20px_40px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-200">
          
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
                router.push("/pricing");
              }}
              className="w-full rounded-xl bg-[#3B82F6] py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.28)] transition-all hover:scale-[1.02] hover:bg-[#4a8cf7] active:scale-[0.98]"
            >
              {credits.hasSubscription ? "Manage Subscription" : "Upgrade Plan"}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
