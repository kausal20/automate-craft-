"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

type BuyCreditsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onPurchased?: (creditsAdded: number) => void;
};

type CreditPackage = {
  id: string;
  credits: number;
  price: number;
  recommended?: boolean;
};

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "pkg_600", credits: 600, price: 1080, recommended: true },
  { id: "pkg_3600", credits: 3600, price: 6480 },
  { id: "pkg_7200", credits: 7200, price: 12960 },
  { id: "pkg_14400", credits: 14400, price: 25920 },
  { id: "pkg_30000", credits: 30000, price: 54000 },
];

const PRICE_PER_CREDIT = 1.8;

function formatCredits(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BuyCreditsModal({
  isOpen,
  onClose,
  onPurchased,
}: BuyCreditsModalProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>("pkg_600");
  const [customCredits, setCustomCredits] = useState<string>("600");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPackage = CREDIT_PACKAGES.find(
    (creditPackage) => creditPackage.id === selectedPackageId,
  );

  const customCreditsNumber = Number.parseInt(customCredits || "0", 10);
  const customPrice = Number.isFinite(customCreditsNumber)
    ? Math.round(customCreditsNumber * PRICE_PER_CREDIT)
    : 0;

  const selectedCredits = useMemo(() => {
    if (selectedPackageId === "custom") {
      return Number.isFinite(customCreditsNumber) ? customCreditsNumber : 0;
    }

    return selectedPackage?.credits ?? 0;
  }, [customCreditsNumber, selectedPackage, selectedPackageId]);

  const selectedPrice = selectedPackageId === "custom"
    ? customPrice
    : (selectedPackage?.price ?? 0);

  const customAmountError =
    selectedPackageId === "custom" && customCreditsNumber < 600
      ? "Minimum custom credit purchase is 600."
      : null;

  const handleClose = (force = false) => {
    if (submitting && !force) {
      return;
    }

    setError(null);
    onClose();
  };

  const handleBuyCredits = async () => {
    setError(null);

    if (selectedPackageId === "custom" && customCreditsNumber < 600) {
      setError("Minimum custom credit purchase is 600.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/buy-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: selectedPackageId,
          customCredits:
            selectedPackageId === "custom" ? customCreditsNumber : undefined,
        }),
      });

      const json = (await response.json()) as {
        error?: string;
        creditsAdded?: number;
      };

      if (!response.ok) {
        throw new Error(json.error || "Could not complete credit purchase.");
      }

      onPurchased?.(json.creditsAdded ?? selectedCredits);
      handleClose(true);
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error
          ? purchaseError.message
          : "Could not complete credit purchase.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => handleClose()}
            data-static-hover
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close buy credits dialog"
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[540px] rounded-[28px] border border-white/10 bg-[#121212] p-5 text-white shadow-[0_28px_60px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Buy More Credits
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  Top up credits and keep your automations running.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleClose()}
                data-static-hover
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70"
                aria-label="Close buy credits modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {CREDIT_PACKAGES.map((creditPackage) => {
                const isSelected = selectedPackageId === creditPackage.id;

                return (
                  <button
                    key={creditPackage.id}
                    type="button"
                    onClick={() => {
                      setSelectedPackageId(creditPackage.id);
                      setError(null);
                    }}
                    data-static-hover
                    className={`relative w-full rounded-[20px] border px-6 py-5 text-left ${
                      isSelected
                        ? "border-[#4F8EF7] bg-[#4F8EF7] text-white"
                        : "border-[#2957A4] bg-[#1B1B1B] text-white"
                    }`}
                  >
                    {creditPackage.recommended ? (
                      <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black">
                        Recommended
                      </span>
                    ) : null}

                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <p className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                          isSelected ? "text-white/70" : "text-white/45"
                        }`}>
                          Credits
                        </p>
                        <p className="mt-2 text-[2rem] font-semibold leading-none tracking-[-0.05em]">
                          {formatCredits(creditPackage.credits)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                          isSelected ? "text-white/70" : "text-white/45"
                        }`}>
                          Price
                        </p>
                        <p className={`mt-2 text-[1.85rem] font-semibold leading-none tracking-[-0.05em] ${
                          isSelected ? "text-white" : "text-[#4F8EF7]"
                        }`}>
                          {formatPrice(creditPackage.price)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

              <div
                onClick={() => {
                  setSelectedPackageId("custom");
                  setError(null);
                }}
                className={`rounded-[20px] border px-6 py-5 ${
                  selectedPackageId === "custom"
                    ? "border-[#4F8EF7] bg-[#1B1B1B]"
                    : "border-[#2957A4] bg-[#1B1B1B]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                      selectedPackageId === "custom" ? "text-white/70" : "text-white/45"
                    }`}>
                      Custom Amount
                    </p>
                    <input
                      type="number"
                      min={600}
                      step={1}
                      inputMode="numeric"
                      value={customCredits}
                      onFocus={() => setSelectedPackageId("custom")}
                      onChange={(event) => {
                        setSelectedPackageId("custom");
                        setCustomCredits(event.target.value);
                        setError(null);
                      }}
                      className="minimal-number-input mt-2 w-[180px] max-w-full bg-transparent text-[2rem] font-semibold leading-none tracking-[-0.05em] text-white outline-none [color-scheme:dark] placeholder:text-white/22"
                      placeholder="600"
                    />
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                      selectedPackageId === "custom" ? "text-white/70" : "text-white/45"
                    }`}>
                      Price
                    </p>
                    <p className="mt-2 text-[1.85rem] font-semibold leading-none tracking-[-0.05em] text-[#4F8EF7]">
                      {customPrice > 0 ? formatPrice(customPrice) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-3 px-1 text-sm text-white/45">
              Minimum custom credit purchase is 600.
            </p>

            {error || customAmountError ? (
              <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error || customAmountError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleClose()}
                data-static-hover
                className="inline-flex h-12 flex-1 items-center justify-center rounded-[16px] border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleBuyCredits()}
                disabled={submitting || !!customAmountError}
                data-static-hover
                className="inline-flex h-12 flex-[1.3] items-center justify-center rounded-[16px] bg-[#4F8EF7] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Buy ${formatCredits(selectedCredits)} Credits`
                )}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-white/35">
              Selected amount: {formatCredits(selectedCredits)} credits for{" "}
              {selectedPrice > 0 ? formatPrice(selectedPrice) : "-"}
            </p>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
