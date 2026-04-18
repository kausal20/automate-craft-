"use client";

import { useState, useRef, useEffect } from "react";
import { Zap } from "lucide-react";

export function CreditsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hardcoded for now per requirements
  const credits = {
    total: "70.00",
    free: { current: "10.00", max: "10" },
    monthly: { current: "50.00", max: "50" },
    topup: "10.00",
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 1. BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 transition-all hover:bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.15)] active:scale-95"
      >
        <Zap className="h-4 w-4 text-yellow-500" fill="currentColor" />
        <span className="text-sm font-bold text-yellow-500">{credits.total}</span>
      </button>

      {/* 2. DROPDOWN PANEL */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[300px] rounded-2xl bg-[#111111] border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          <div className="p-5 space-y-6">
            
            {/* HEADER */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">
                  Available Credits
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white leading-none tracking-tight">
                    {credits.total}
                  </span>
                  <Zap className="h-5 w-5 text-yellow-500" fill="currentColor" />
                </div>
              </div>
              <div className="rounded-full bg-yellow-500/20 border border-yellow-500/30 px-3 py-1">
                <span className="text-xs font-bold text-yellow-500 tracking-wide uppercase">
                  Standard
                </span>
              </div>
            </div>

            {/* CREDIT BREAKDOWN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70 font-medium">Free Credits</span>
                <span className="text-white font-bold">{credits.free.current} / {credits.free.max}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70 font-medium">Monthly Credits</span>
                <span className="text-white font-bold">{credits.monthly.current} / {credits.monthly.max}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70 font-medium">Top up Credits</span>
                <span className="text-white font-bold">{credits.topup}</span>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex flex-col gap-2 pt-2">
              <button className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-transparent py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/5 active:scale-[0.98]">
                Manage your subscriptions
              </button>
              <button className="flex w-full items-center justify-center rounded-xl bg-yellow-500 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all hover:bg-yellow-400 hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] active:scale-[0.98]">
                Buy More Credits
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
