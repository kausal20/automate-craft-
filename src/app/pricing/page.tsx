"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";

type Plan = {
  name: string;
  priceINR: string;
  priceUSD: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  layout: "small" | "large" | "full";
};

const plans: Plan[] = [
  {
    name: "Starter",
    priceINR: "Rs 1,499",
    priceUSD: "$19",
    features: [
      "1,000 credits/month",
      "5 automations",
      "Basic integrations",
      "Standard support",
    ],
    cta: "Get Started",
    href: "/signup",
    layout: "small",
  },
  {
    name: "Plus",
    priceINR: "Rs 4,999",
    priceUSD: "$59",
    features: [
      "5,000 credits/month",
      "20 automations",
      "Advanced integrations",
      "Faster execution",
    ],
    cta: "Choose Plus",
    href: "/signup",
    highlighted: true,
    layout: "large",
  },
  {
    name: "Pro",
    priceINR: "Rs 12,999",
    priceUSD: "$149",
    features: [
      "20,000 credits/month",
      "Unlimited automations",
      "Priority execution",
      "Advanced logs",
    ],
    cta: "Go Pro",
    href: "/signup",
    layout: "small",
  },
  {
    name: "Enterprise",
    priceINR: "Custom pricing",
    priceUSD: "Custom pricing",
    features: [
      "Unlimited usage",
      "Custom automation setup",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "/lets-talk",
    layout: "full",
  },
];

function getLayoutClasses(layout: Plan["layout"]) {
  if (layout === "large") {
    return "col-span-12 xl:col-span-6";
  }

  if (layout === "full") {
    return "col-span-12";
  }

  return "col-span-12 md:col-span-6 xl:col-span-3";
}

export default function PricingPage() {
  const [currency, setCurrency] = useState<"INR" | "USD">("USD");

  return (
    <main className="min-h-screen bg-white">
      <PageIntro
        eyebrow="Pricing"
        title="Simple pricing that scales with your automation volume."
        description="Choose a plan that fits your current workflows and still leaves space for growth."
      >
        <div className="card-surface inline-flex items-center rounded-full border-[#E5E7EB] p-1">
          <button
            onClick={() => setCurrency("INR")}
            className={`button-hover rounded-full px-5 py-2 text-sm font-semibold ${
              currency === "INR"
                ? "bg-foreground text-white"
                : "text-foreground/60"
            }`}
          >
            INR
          </button>
          <button
            onClick={() => setCurrency("USD")}
            className={`button-hover rounded-full px-5 py-2 text-sm font-semibold ${
              currency === "USD"
                ? "bg-foreground text-white"
                : "text-foreground/60"
            }`}
          >
            USD
          </button>
        </div>
      </PageIntro>

      <section className="section-space bg-[#F9FAFB] pt-0">
        <div className="site-container">
          <div className="grid grid-cols-12 gap-8">
            {plans.map((plan, index) => {
              const price = currency === "INR" ? plan.priceINR : plan.priceUSD;

              return (
                <Reveal key={plan.name} delay={index * 0.06} className={getLayoutClasses(plan.layout)}>
                  <article
                    className={`card-surface card-hover flex h-full flex-col rounded-2xl p-6 ${
                      plan.highlighted ? "border-accent/35 bg-accent/[0.04]" : ""
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                        {plan.name}
                      </p>
                      <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
                        {price}
                      </h2>
                      <p className="mt-3 text-sm text-subtle">
                        {price.toLowerCase().includes("custom")
                          ? "Tailored for your business."
                          : "Per month"}
                      </p>
                    </div>

                    <ul className="mt-8 flex-1 space-y-3.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2.5 text-sm text-subtle">
                          <Check className="mt-1 h-4 w-4 shrink-0 text-accent" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={plan.href}
                      className={`button-hover mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-semibold ${
                        plan.highlighted
                          ? "border-transparent bg-foreground text-white hover:bg-black/85"
                          : "border-[#E5E7EB] bg-white text-foreground"
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
