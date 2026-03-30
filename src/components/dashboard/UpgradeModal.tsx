"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UpgradeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

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
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white p-8 text-center shadow-[0_24px_64px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
          >
            <button
              title="Close modal"
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#111111] text-white">
              <Sparkles className="h-8 w-8" />
            </div>

            <h3 className="mt-6 text-2xl font-bold tracking-tight text-[#111111]">
              You've reached your limit.
            </h3>
            <p className="mt-3 text-[#6B7280] leading-relaxed">
              Upgrade your plan to continue using AutomateCraft without interruptions.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/pricing"
                className="w-full flex items-center justify-center rounded-full bg-[#111111] py-4 text-sm font-semibold text-white transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.2)] hover:-translate-y-0.5"
              >
                Upgrade Plan
              </Link>
              <button
                onClick={() => {
                  onClose();
                  router.push("/dashboard");
                }}
                className="w-full flex items-center justify-center rounded-full border border-black/10 bg-white py-4 text-sm font-semibold text-[#111111] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_14px_0_rgb(0,0,0,0.05)]"
              >
                Buy Credits
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
