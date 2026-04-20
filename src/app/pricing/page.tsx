"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, X, ChevronDown } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGeoPricing } from "@/hooks/useGeoPricing";

type CreditTier = {
  credits: string;
  priceMonthlyInr: number;
  priceYearlyInr: number;
  billedYearlyInr: number;
  idSuffix: string;
};

type Plan = {
  idBase: string;
  name: string;
  priceMonthlyLabel?: string;
  priceYearlyLabel?: string;
  billedYearlyLabel?: string;
  creditTiers?: CreditTier[];
  audience: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

const plans: Plan[] = [
  {
    idBase: "plan_starter",
    name: "Starter",
    audience: "For individuals starting out",
    description: "Perfect for beginners who want to automate simple tasks and explore AI automation.",
    creditTiers: [
      { credits: "500", priceMonthlyInr: 999, priceYearlyInr: 833, billedYearlyInr: 9990, idSuffix: "" },
      { credits: "1000", priceMonthlyInr: 1899, priceYearlyInr: 1583, billedYearlyInr: 18990, idSuffix: "_1k" },
      { credits: "2000", priceMonthlyInr: 3499, priceYearlyInr: 2916, billedYearlyInr: 34990, idSuffix: "_2k" },
    ],
    features: [
      "Simple automation workflows",
      "Form to email alerts",
      "Basic tool connections",
      "Limited workflow steps",
    ],
    cta: "Get Started",
  },
  {
    idBase: "plan_plus",
    name: "Plus",
    audience: "For growing teams",
    description: "Ideal for businesses automating leads, follow-ups, and customer communication.",
    creditTiers: [
      { credits: "1,500", priceMonthlyInr: 2000, priceYearlyInr: 1666, billedYearlyInr: 19990, idSuffix: "" },
      { credits: "3,000", priceMonthlyInr: 3799, priceYearlyInr: 3166, billedYearlyInr: 37990, idSuffix: "_3k" },
      { credits: "5,000", priceMonthlyInr: 5999, priceYearlyInr: 4999, billedYearlyInr: 59990, idSuffix: "_5k" },
    ],
    features: [
      "Multi-step automations",
      "CRM and WhatsApp workflows",
      "Multiple tool connections",
      "Faster execution speed",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    idBase: "plan_pro",
    name: "Pro",
    audience: "For advanced users",
    description: "Best for scaling businesses running multiple automations daily.",
    creditTiers: [
      { credits: "3,000", priceMonthlyInr: 3500, priceYearlyInr: 2916, billedYearlyInr: 34990, idSuffix: "" },
      { credits: "5,000", priceMonthlyInr: 5499, priceYearlyInr: 4583, billedYearlyInr: 54990, idSuffix: "_5k" },
      { credits: "10,000", priceMonthlyInr: 9999, priceYearlyInr: 8333, billedYearlyInr: 99990, idSuffix: "_10k" },
    ],
    features: [
      "Complex workflow automation",
      "Conditional logic flows",
      "High execution priority",
      "Large scale automation",
    ],
    cta: "Get Started",
  },
  {
    idBase: "plan_enterprise",
    name: "Enterprise",
    priceMonthlyLabel: "Let's Talk",
    priceYearlyLabel: "Let's Talk",
    billedYearlyLabel: "Custom yearly billing",
    audience: "For high-scale needs",
    description: "For teams that need fully customized automation solutions and infrastructure.",
    features: [
      "Unlimited workflow execution",
      "Custom automation systems",
      "Dedicated infrastructure setup",
      "Custom integrations support",
      "Dedicated account manager",
      "Priority support access",
    ],
    cta: "Contact Us",
  },
];

function PlanCard({ plan, billingCycle, subscribing, onSubscribe, index, formatPrice }: { plan: Plan, billingCycle: "monthly" | "yearly", subscribing: string | null, onSubscribe: (planId: string) => void, index: number, formatPrice: (v: number) => string }) {
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const activeTier = plan.creditTiers ? plan.creditTiers[selectedTierIndex] : null;
  const currentPriceMonthly = activeTier ? formatPrice(activeTier.priceMonthlyInr) : plan.priceMonthlyLabel;
  const currentPriceYearly = activeTier ? formatPrice(activeTier.priceYearlyInr) : plan.priceYearlyLabel;
  const currentBilledYearly = activeTier ? `Billed ${formatPrice(activeTier.billedYearlyInr)} yearly` : plan.billedYearlyLabel;
  const currentPrice = billingCycle === "yearly" ? currentPriceYearly : currentPriceMonthly;

  const handleSubscribeClick = () => {
    if (plan.name === "Enterprise") {
      onSubscribe(plan.idBase);
      return;
    }
    const actualPlanId = billingCycle === "yearly" 
      ? `${plan.idBase}${activeTier ? activeTier.idSuffix : ''}_yearly`
      : `${plan.idBase}${activeTier ? activeTier.idSuffix : ''}`;
    onSubscribe(actualPlanId);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className={`relative flex flex-col justify-between rounded-2xl p-8 transition-all duration-300 ${
        plan.highlighted
          ? "border border-accent/30 bg-[#0d1117] shadow-[0_0_40px_rgba(59,130,246,0.08),0_12px_40px_rgba(0,0,0,0.5)]"
          : "border border-white/[0.06] bg-[#0f0f11] shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:border-white/[0.1] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
      }`}
    >
      {/* Highlighted ambient glow */}
      {plan.highlighted && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-60 rounded-full opacity-50"
          style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)" }}
        />
      )}

      {plan.highlighted && (
        <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 rounded-full bg-accent/10 border border-accent/20 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-accent shadow-[0_0_12px_rgba(59,130,246,0.15)] z-20">
          Most Popular
        </div>
      )}

      <div>
        <h3 className={`text-xl font-bold tracking-tight ${plan.highlighted ? "text-accent" : "text-white"}`}>
          {plan.name}
        </h3>
        <p className="mt-2 text-sm text-white/35">{plan.audience}</p>
        <div className="mt-6 mb-2">
          {billingCycle === "yearly" && plan.name !== "Enterprise" && (
            <div className="text-sm font-semibold text-white/25 line-through decoration-white/15 mb-1">
              {currentPriceMonthly}
            </div>
          )}
          <div className="flex items-end flex-wrap gap-2">
            <span className="text-[2.5rem] font-bold leading-none tracking-tight text-white">
              {currentPrice}
            </span>
            {plan.name !== "Enterprise" && (
              <span className="text-sm font-medium text-white/35 pb-1">/ month</span>
            )}
            {billingCycle === "yearly" && plan.name !== "Enterprise" && (
              <div className="ml-auto bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap mb-1 flex-shrink-0">
                Save 20%
              </div>
            )}
          </div>
        </div>
        
        <div className="h-5 mb-4">
         {billingCycle === "yearly" && plan.name !== "Enterprise" && (
            <span className="text-xs font-semibold text-white/25">
              {currentBilledYearly}
            </span>
         )}
        </div>

        {plan.creditTiers && (
          <div className="relative mt-2 mb-6">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full flex items-center justify-between rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-white transition-all duration-200 relative z-10 ${
                isDropdownOpen ? "border-accent/30 bg-accent/[0.04]" : "border-white/[0.08] hover:border-white/[0.12] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border border-white/15 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold text-[14px]">
                    {billingCycle === "yearly" ? parseInt(activeTier!.credits.replace(',', '')) * 12 : activeTier!.credits} credits
                  </span>
                  <span className="text-white/35 text-xs">/ {billingCycle === "yearly" ? 'yr' : 'month'}</span>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-white/35 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-xl border border-white/[0.08] bg-[#111113] p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-xl">
                  {plan.creditTiers.map((tier, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedTierIndex(idx);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                        selectedTierIndex === idx 
                          ? "bg-accent/[0.08] text-accent font-medium" 
                          : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                          selectedTierIndex === idx ? "border-accent/40" : "border-white/15"
                        }`}>
                          {selectedTierIndex === idx && <div className="h-1.5 w-1.5 rounded-full bg-accent" />}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span>
                            {billingCycle === "yearly" ? parseInt(tier.credits.replace(',', '')) * 12 : tier.credits} credits
                          </span>
                          <span className="opacity-40 text-xs">/ {billingCycle === "yearly" ? 'yr' : 'month'}</span>
                        </div>
                      </div>
                      {selectedTierIndex === idx && <Check className="h-4 w-4 text-accent" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <p className={`text-sm leading-relaxed text-white/50 ${plan.creditTiers ? 'mb-4' : 'mb-8'}`}>
          {plan.description}
        </p>

        <div className="space-y-4">
          <div className="text-[10px] font-semibold text-white/30 mb-2 uppercase tracking-[0.18em]">Includes:</div>
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent/50" />
              <span className="text-sm font-medium text-white/65">
                 {feature}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <button
          onClick={handleSubscribeClick}
          disabled={subscribing !== null}
          className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all duration-200 disabled:opacity-50 ${
            plan.highlighted
              ? "bg-accent text-white hover:bg-[#4a8cf7] shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.35)] hover:-translate-y-0.5"
              : plan.name === "Enterprise"
                ? "bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08] hover:border-white/[0.12]"
                : "bg-white text-black hover:bg-white/90 shadow-[0_4px_14px_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5"
          } relative overflow-hidden`}
        >
          {subscribing && subscribing.startsWith(plan.idBase) ? "Processing..." : plan.cta}
        </button>
      </div>
    </motion.article>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const { formatPrice } = useGeoPricing();

  const handleSubscribe = async (actualPlanId: string) => {
    if (actualPlanId === "plan_enterprise") {
      router.push("/lets-talk");
      return;
    }
    
    setSubscribing(actualPlanId);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: actualPlanId }),
      });
      if (res.status === 401) {
        router.push("/signup");
      } else if (res.ok) {
        router.push("/dashboard");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <main className="relative min-h-screen pt-6">
      {/* Close button */}
      <div className="mx-auto max-w-[1400px] px-6 relative h-0 flex justify-end">
        <div className="relative top-2 md:top-6 z-50">
          <Link
            href="/"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.06] text-white/60 hover:bg-white/[0.08] hover:text-white transition-all duration-200"
            aria-label="Close pricing and return"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <PageIntro
        eyebrow="Pricing"
        title="Simple, transparent pricing"
        description="Choose the plan that fits your business needs. Upgrade anytime as you grow."
      />

      <div className="flex justify-center mb-16">
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06]">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              billingCycle === "monthly" 
                ? "bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.08)]" 
                : "text-white/35 hover:text-white/60"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              billingCycle === "yearly" 
                ? "bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.08)]" 
                : "text-white/35 hover:text-white/60"
            }`}
          >
            Yearly
            <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[0.65rem] uppercase tracking-wider font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-[1400px] px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-4">
          {plans.map((plan, i) => (
            <PlanCard 
              key={plan.name} 
              plan={plan} 
              index={i}
              billingCycle={billingCycle} 
              subscribing={subscribing} 
              onSubscribe={handleSubscribe} 
              formatPrice={formatPrice}
            />
          ))}
        </div>

        {/* How Credits Work Link */}
        <div className="mt-20 flex justify-center">
          <Link 
            href="/how-credits-work" 
            className="group relative inline-flex items-center gap-4 rounded-2xl bg-white/[0.02] px-8 py-5 ring-1 ring-white/[0.06] hover:ring-accent/25 shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent/0 via-accent/[0.03] to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/15 group-hover:bg-accent/15 transition-colors duration-200">
              <Sparkles className="h-6 w-6" />
            </div>
            
            <div className="flex flex-col text-left">
              <span className="text-[17px] font-bold text-white transition-all duration-200">
                Wondering how credits work?
              </span>
              <span className="text-[14px] text-white/40 mt-0.5">
                Learn exactly how simple and fair our pricing is.
              </span>
            </div>
            
            <div className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-white/40 group-hover:bg-accent group-hover:text-white transition-all duration-200 transform group-hover:scale-110">
              <span className="font-bold -mt-0.5">→</span>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
