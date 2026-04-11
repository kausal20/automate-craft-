"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

type Plan = {
  idBase: string;
  name: string;
  priceMonthly: string;
  priceYearly: string;
  billedYearly: string;
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
    priceMonthly: "₹999",
    priceYearly: "₹833",
    billedYearly: "Billed ₹9,990 yearly",
    audience: "For individuals starting out",
    description: "Perfect for beginners who want to automate simple tasks and explore AI automation.",
    features: [
      "500 Credits/month",
      "Basic automations",
      "Email support",
    ],
    cta: "Get Started",
  },
  {
    idBase: "plan_plus",
    name: "Plus",
    priceMonthly: "₹2000",
    priceYearly: "₹1666",
    billedYearly: "Billed ₹19,990 yearly",
    audience: "For growing teams",
    description: "Ideal for businesses automating leads, follow-ups, and customer communication.",
    features: [
      "1,500 Credits/month",
      "WhatsApp + Email + CRM",
      "Faster execution",
      "Priority support",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    idBase: "plan_pro",
    name: "Pro",
    priceMonthly: "₹3500",
    priceYearly: "₹2916",
    billedYearly: "Billed ₹34,990 yearly",
    audience: "For advanced users",
    description: "Best for scaling businesses running multiple automations daily.",
    features: [
      "3,000 Credits/month",
      "Advanced workflows",
      "Priority execution speed",
      "Advanced analytics",
      "Dedicated support",
    ],
    cta: "Get Started",
  },
  {
    idBase: "plan_enterprise",
    name: "Enterprise",
    priceMonthly: "Let's Talk",
    priceYearly: "Let's Talk",
    billedYearly: "Custom yearly billing",
    audience: "For high-scale needs",
    description: "For teams that need fully customized automation solutions and infrastructure.",
    features: [
      "Custom credits",
      "Unlimited workflows",
      "Dedicated infrastructure",
      "Custom integrations",
      "Account manager",
    ],
    cta: "Contact Us",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    if (plan.idBase === "plan_enterprise") {
      router.push("/lets-talk");
      return;
    }

    const actualPlanId = billingCycle === "yearly" ? `${plan.idBase}_yearly` : plan.idBase;
    
    setSubscribing(plan.idBase);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: actualPlanId }),
      });
      // Redirect to dashboard or signup based on auth status
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
      {/* Close button aligned with content max-width */}
      <div className="mx-auto max-w-[1400px] px-6 relative h-0 flex justify-end">
        <div className="relative top-2 md:top-6 z-50">
          <Link
            href="/"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 transition-colors"
            aria-label="Close pricing and return"
          >
            <X className="h-6 w-6" />
          </Link>
        </div>
      </div>

      <PageIntro
        eyebrow="Pricing"
        title="Simple, transparent pricing"
        description="Choose the plan that fits your business needs. Upgrade anytime as you grow."
      />

      <div className="flex justify-center mb-16">
        <div className="flex items-center gap-3 p-1 rounded-full bg-white/5 ring-1 ring-white/10">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              billingCycle === "monthly" 
                ? "bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.1)]" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              billingCycle === "yearly" 
                ? "bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.1)]" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Yearly
            <span className="px-2 py-0.5 rounded-md bg-accent/20 text-accent text-[0.65rem] uppercase tracking-wider font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-[1400px] px-6 pb-24">
        <div className="grid gap-8 lg:grid-cols-4">
          {plans.map((plan, i) => (
            <motion.article
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, ease: "easeOut" }}
              whileHover={{ y: -6 }}
              className={`relative flex flex-col justify-between rounded-2xl bg-[#0f0f0f] p-8 transition-all duration-300 ${
                plan.highlighted
                  ? "border-[2px] border-white/20 shadow-[0_12px_40px_rgb(0,0,0,0.6)]"
                  : "border border-white/5 shadow-[0_4px_24px_rgb(0,0,0,0.4)] hover:border-white/10 hover:shadow-[0_12px_40px_rgb(0,0,0,0.7)]"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-bold uppercase tracking-wider text-black">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-white/40">{plan.audience}</p>
                <div className="mt-6 mb-2">
                  <span className="text-[2.5rem] font-bold leading-none tracking-tight text-white">
                    {billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly}
                  </span>
                  {plan.name !== "Enterprise" && (
                    <span className="text-sm font-medium text-white/40">/month</span>
                  )}
                </div>
                
                <div className="h-5 mb-6">
                 {billingCycle === "yearly" && plan.name !== "Enterprise" && (
                    <span className="text-xs font-semibold text-white/30">
                      {plan.billedYearly}
                    </span>
                 )}
                </div>

                <p className="mb-8 text-sm leading-relaxed text-white/70">
                  {plan.description}
                </p>

                <div className="space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-sm font-medium text-white/60">
                         {/* Show 12x credits visually if yearly */}
                         {billingCycle === "yearly" && feature.includes("Credits") ? (
                           <>
                              {parseInt(feature.split(' ')[0]) * 12} {feature.split(' ').slice(1).join(' ')} <span className="text-xs ml-1 text-black/40">/yr</span>
                           </>
                         ) : (
                           feature
                         )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10">
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={subscribing !== null}
                  className={`w-full rounded-full py-4 text-sm font-bold transition-all disabled:opacity-50 ${
                    plan.highlighted
                      ? "bg-white text-black hover:bg-white/90 shadow-[0_4px_14px_0_rgba(255,255,255,0.1)] hover:-translate-y-0.5"
                      : plan.name === "Enterprise"
                        ? "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                        : "bg-white text-black hover:bg-white/90 shadow-[0_4px_14px_0_rgba(255,255,255,0.1)] hover:-translate-y-0.5"
                  } shadow-md`}
                >
                  {subscribing === plan.idBase ? "Processing..." : plan.cta}
                </button>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mx-auto mt-24 max-w-3xl rounded-[2rem] bg-white/5 p-10 ring-1 ring-white/10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 shadow-sm ring-1 ring-white/10">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white">What are credits?</h3>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <h4 className="font-bold text-white">Automation Creation</h4>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">
                    Whenever you generate a new automation utilizing AI, it utilizes a one-time fixed cost.<br className="hidden sm:block" />
                    <strong>1 Automation Generate = 5 Credits</strong>
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-white">Automation Execution</h4>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">
                    Whenever an active automation successfully executes limits are consumed. Certain powerful integrations like WhatsApp cost more.<br className="hidden sm:block" />
                    <strong>Base Execution = 5 Credits</strong> (+2 WhatsApp, +1 Email, +1 CRM)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
