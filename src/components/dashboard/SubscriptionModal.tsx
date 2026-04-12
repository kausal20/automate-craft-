"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGeoPricing } from "@/hooks/useGeoPricing";

export function SubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const { formatPrice } = useGeoPricing();

  const plans = [
    {
      id: "plan_starter",
      name: "Starter",
      priceInr: 999,
      credits: "300 Runs / 50 Builds",
    },
    {
      id: "plan_plus",
      name: "Plus",
      priceInr: 2000,
      credits: "1200 Runs / 150 Builds",
      highlighted: true,
    },
    {
      id: "plan_pro",
      name: "Pro",
      priceInr: 3500,
      credits: "5000 Runs / 500 Builds",
    },
  ];

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (res.ok) {
        onSuccess?.();
        onClose();
      } else if (res.status === 401) {
        router.push("/signup");
      }
    } finally {
      setSubscribing(null);
    }
  };

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
            className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] bg-[#121212] p-6 sm:p-10 shadow-[0_24px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
          >
            <button
              title="Close modal"
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full p-2 text-white/40 transition hover:bg-white/5 hover:text-white z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold tracking-tight text-white">
                Choose a Plan
              </h3>
              <p className="mt-2 text-white/50">
                Subscribe to a monthly plan to unlock recurring resources.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all ${
                    plan.highlighted
                      ? "border-[2px] border-white/20 bg-white/5 shadow-2xl"
                      : "border border-white/10 bg-white/5"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                      Most Popular
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-white">{plan.name}</h4>
                    <div className="my-3">
                      <span className="text-2xl font-bold text-white">{formatPrice(plan.priceInr)}</span>
                      <span className="text-sm text-white/40">/mo</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm font-medium text-white/60">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{plan.credits}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing !== null}
                    className={`mt-6 w-full rounded-full py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                      plan.highlighted
                        ? "bg-white text-black hover:bg-white/90 shadow-md"
                        : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                    }`}
                  >
                    {subscribing === plan.id ? "..." : "Subscribe"}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  onClose();
                  router.push("/pricing");
                }}
                className="text-sm font-medium text-accent hover:underline"
              >
                View full plan details
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
