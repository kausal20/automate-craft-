"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

/* LOGIC EXPLAINED:
This is a completely new standalone floating credits button.
- It does not depend on any old credits component, auth logic, or modal logic.
- It uses only local React state to store a placeholder credits count and to
  open and close a simple modal.
- Because it is fixed and rendered from the root layout, it stays visible on
  every page as a clean future-extension entry point.
- The structure is intentionally simple so we can later swap the local credits
  value for Supabase data and wire the Buy Credits action to Stripe.
*/

export default function FloatingCreditsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [credits] = useState(10);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group fixed right-5 top-5 z-[9999] inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all duration-150 hover:bg-[rgba(0,0,0,0.78)] hover:shadow-[0_18px_42px_rgba(0,0,0,0.38)]"
        style={{
          background: "rgba(0,0,0,0.7)",
        }}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f7d883]/15 text-[#f7d883] ring-1 ring-[#f7d883]/20">
          <Zap className="h-3.5 w-3.5" />
        </span>
        <span>{credits} Credits</span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-[22px] border border-white/10 bg-[#111111] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="m-0 text-lg font-semibold tracking-tight">
                Credits
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <p className="m-0 text-sm leading-6 text-white/70">
              Credits remaining: {credits}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/92"
              >
                Buy Credits
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.05]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
