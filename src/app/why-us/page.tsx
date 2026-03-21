import { CheckCircle2, Shield, Sparkles, TrendingUp, Workflow } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";

const reasons = [
  {
    title: "Simple automation creation",
    description: "Write intent in plain language and get a structured workflow quickly.",
    icon: Sparkles,
  },
  {
    title: "No coding required",
    description: "Operations teams can launch automations without engineering effort.",
    icon: Workflow,
  },
  {
    title: "Fast execution",
    description: "Automations run with clear statuses and low operational overhead.",
    icon: TrendingUp,
  },
  {
    title: "Scalable workflows",
    description: "From a few daily runs to enterprise volume, the flow stays readable.",
    icon: Shield,
  },
];

export default function WhyUsPage() {
  return (
    <main className="min-h-screen bg-white">
      <PageIntro
        eyebrow="Why Us"
        title="Built for teams that need automation to be practical."
        description="AutomateCraft focuses on clarity, reliability, and execution visibility so the product feels operational from day one."
      />

      <section className="section-space bg-[#F9FAFB] pt-0">
        <div className="site-container grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                Mission
              </p>
              <h2 className="mt-6 text-[2.4rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-[3rem]">
                Help businesses automate repetitive work using AI.
              </h2>
              <p className="mt-6 text-base leading-8 text-subtle">
                The goal is not more software. The goal is cleaner operations
                with fewer manual handoffs and better visibility for teams.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="card-surface rounded-2xl p-8">
              <p className="text-sm leading-8 text-subtle">
                AutomateCraft turns business intent into workflows that teams can
                understand, configure, and trust. Every run is logged, every
                integration is explicit, and every decision stays visible.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-space bg-white">
        <div className="site-container grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <Reveal>
            <div className="grid gap-8 md:grid-cols-2">
              {reasons.map((reason, index) => (
                <article key={reason.title} className={`card-surface card-hover rounded-2xl p-6 ${index === 0 ? "md:col-span-2" : ""}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <reason.icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-foreground">{reason.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-subtle">{reason.description}</p>
                </article>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                Why Choose Us
              </p>
              <h2 className="mt-6 text-[2.2rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-[2.8rem]">
                Designed to stay calm even as workflows scale.
              </h2>
              <p className="mt-6 text-base leading-8 text-subtle">
                The interface avoids clutter so teams can focus on activation and
                execution instead of navigating heavy builder screens.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-space border-y border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="site-container grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="card-surface rounded-2xl p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Problem
              </p>
              <p className="mt-4 text-sm leading-8 text-subtle">
                Manual repetitive work slows teams down and creates avoidable
                errors across handoffs.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="card-surface rounded-2xl p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Solution
              </p>
              <p className="mt-4 text-sm leading-8 text-subtle">
                AI-powered workflows with clear triggers, setup fields, and
                execution logs that teams can trust.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Secure", "Reliable", "Business Ready"].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-foreground/70"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
