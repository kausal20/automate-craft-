"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BuyCreditsModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [buying, setBuying] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");

  const handleBuyCredits = async () => {
    if (!selectedPackage) return;
    
    if (selectedPackage === "custom") {
      const amount = parseInt(customAmount, 10);
      if (!amount || amount < 600) return;
    }

    setBuying(true);
    try {
      const res = await fetch("/api/buy-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackage, customCredits: customAmount }),
      });
      if (res.ok) {
        onSuccess?.();
        onClose();
      }
    } finally {
      setBuying(false);
    }
  };

  const packages = [
    { id: "pkg_600", credits: 600, price: "₹1,080", popular: true },
    { id: "pkg_3600", credits: 3600, price: "₹6,480" },
    { id: "pkg_7200", credits: 7200, price: "₹12,960" },
    { id: "pkg_14400", credits: 14400, price: "₹25,920" },
    { id: "pkg_30000", credits: 30000, price: "₹54,000" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] bg-[#121212] p-6 sm:p-8 shadow-[0_24px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10 max-h-[90vh] overflow-y-auto"
          >
            <button
              title="Close modal"
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full p-2 text-white/40 transition hover:bg-white/5 hover:text-white z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-2xl font-bold tracking-tight text-white">
              Add More Credits
            </h3>
            <p className="mt-2 text-white/50">
              Choose a top-up plan below to add credits instantly to your balance.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id)}
                  className={`relative flex items-center justify-between outline-none rounded-2xl border-2 p-4 transition-all w-full text-left ${
                    selectedPackage === pkg.id
                      ? "border-[#3B82F6] bg-[#3B82F6]/10"
                      : "border-[#3B82F6]/40 hover:border-[#3B82F6] bg-white/5"
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                      Recommended
                    </span>
                  )}

                  <div className="flex w-full items-center justify-between px-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Credits</span>
                      <span className="text-lg font-bold text-white">{pkg.credits.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Price</span>
                       <span className="text-xl font-bold text-accent">{pkg.price}</span>
                    </div>
                  </div>

                  {selectedPackage === pkg.id && (
                    <div className="absolute right-[-8px] top-[-8px] flex h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6] text-white shadow-sm ring-2 ring-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}

              <button
                onClick={() => setSelectedPackage("custom")}
                className={`relative flex flex-col items-start outline-none rounded-2xl border-2 p-4 transition-all w-full text-left mt-2 ${
                  selectedPackage === "custom"
                    ? "border-[#3B82F6] bg-[#3B82F6]/10"
                    : "border-[#3B82F6]/40 hover:border-[#3B82F6] bg-white/5"
                }`}
              >
                <div className="flex w-full items-center justify-between mb-3 px-2">
                   <span className="text-sm font-bold text-white">Custom Amount</span>
                   {selectedPackage === "custom" && customAmount && (
                     <span className="text-xl font-bold text-accent">
                       ₹{Math.round(parseInt(customAmount, 10) * 1.8).toLocaleString()}
                     </span>
                   )}
                </div>
                {selectedPackage === "custom" && (
                  <div className="w-full px-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min="600"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter credits needed..."
                      className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold text-white outline-none transition-all bg-white/5 ${
                        customAmount && parseInt(customAmount, 10) < 600
                          ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                          : "border-white/10 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      }`}
                    />
                    {customAmount && parseInt(customAmount, 10) < 600 && (
                      <p className="mt-2 text-[11px] font-semibold text-red-500 px-1">
                        Minimum custom top-up is 600 credits.
                      </p>
                    )}
                  </div>
                )}
                {selectedPackage === "custom" && (
                  <div className="absolute right-[-8px] top-[-8px] flex h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6] text-white shadow-sm ring-2 ring-white">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5">
              <button
                disabled={
                  !selectedPackage || 
                  buying || 
                  (selectedPackage === "custom" && (!customAmount || parseInt(customAmount, 10) < 600))
                }
                onClick={handleBuyCredits}
                className="w-full rounded-full bg-white py-4 text-sm font-bold text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_8px_20px_rgba(255,255,255,0.1)]"
              >
                {buying ? "Processing..." : "Confirm Purchase"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
