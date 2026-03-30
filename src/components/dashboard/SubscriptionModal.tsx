"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

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

  const plans = [
    {
      id: "plan_starter",
      name: "Starter",
      price: "₹999",
      credits: "300 Runs / 50 Builds",
    },
    {
      id: "plan_plus",
      name: "Plus",
      price: "₹2000",
      credits: "1200 Runs / 150 Builds",
      highlighted: true,
    },
    {
      id: "plan_pro",
      name: "Pro",
      price: "₹3500",
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
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] bg-white p-6 sm:p-10 shadow-2xl ring-1 ring-black/5"
          >
            <button
              title="Close modal"
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold tracking-tight text-[#111111]">
                Choose a Plan
              </h3>
              <p className="mt-2 text-[#6B7280]">
                Subscribe to a monthly plan to unlock recurring resources.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all ${
                    plan.highlighted
                      ? "border-[2px] border-[#111111] bg-white shadow-lg"
                      : "border border-black/[0.08] bg-black/[0.02]"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#111111] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Most Popular
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-[#111111]">{plan.name}</h4>
                    <div className="my-3">
                      <span className="text-2xl font-bold text-[#111111]">{plan.price}</span>
                      <span className="text-sm text-[#6B7280]">/mo</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm font-medium text-[#6B7280]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" />
                      <span>{plan.credits}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing !== null}
                    className={`mt-6 w-full rounded-full py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                      plan.highlighted
                        ? "bg-[#111111] text-white hover:bg-black/90 shadow-md"
                        : "bg-white border border-[#111111] text-[#111111] hover:bg-black/[0.03]"
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
                className="text-sm font-medium text-[#3B82F6] hover:underline"
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
