import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  PencilLine,
  PlayCircle,
  PlugZap,
  ScrollText,
} from "lucide-react";
import HeroSection from "@/components/HeroSection";
import Reveal from "@/components/Reveal";
import WorkflowDiagram from "@/components/home/WorkflowDiagram";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseMode } from "@/lib/env";

const steps = [
  {
    title: "Describe automation",
    description: "Write the workflow in plain language.",
    icon: PencilLine,
  },
  {
    title: "Connect tools",
    description: "Attach only the apps required for execution.",
    icon: PlugZap,
  },
  {
    title: "Run with visibility",
    description: "Track every execution with readable logs.",
    icon: PlayCircle,
  },
];

const featureList = [
  "AI workflow generation with structured outputs",
  "Dynamic setup forms based on required integrations",
  "Automation lifecycle control from one dashboard",
  "Execution history with clear step-level logs",
];

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  titleClassName = "",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
  titleClassName?: string;
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
        {eyebrow}
      </p>
      <h2
        className={`mt-6 text-[2.4rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-[3rem] ${titleClassName}`}
      >
        {title}
      </h2>
      <p className="mt-6 text-base leading-8 text-subtle">{description}</p>
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="relative flex min-h-screen flex-col">
      <HeroSection user={user} socialAuthEnabled={isSupabaseMode()} />

      <section className="section-space relative z-10 bg-white">
        <div className="site-container">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="How It Works"
              title="Three clean steps from prompt to live automation."
              description="AutomateCraft keeps the flow simple so the user always knows what happens next."
            />
          </Reveal>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08}>
                <article className="card-surface card-hover rounded-2xl p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-subtle">{step.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space relative z-10 border-y border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="site-container grid gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <Reveal>
            <div>
              <SectionHeading
                eyebrow="Workflow"
                title="Capture → Process → Notify"
                titleClassName="md:whitespace-nowrap"
                description="The workflow stays visible before activation so teams can validate the path before it runs in production."
              />

              <div className="mt-8 space-y-4">
                {[
                  "Google Form submission triggers the flow.",
                  "AI extracts values and required message fields.",
                  "WhatsApp sends internal update and customer greeting.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <p className="text-sm leading-7 text-subtle">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <WorkflowDiagram />
          </Reveal>
        </div>
      </section>

      <section className="section-space relative z-10 bg-white">
        <div className="site-container grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <Reveal>
            <div className="grid gap-8 md:grid-cols-2">
              <article className="card-surface card-hover md:col-span-2 rounded-2xl p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  Platform
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  Built for operations, not demos.
                </h3>
                <p className="mt-4 text-sm leading-7 text-subtle">
                  Generate on the homepage, then manage automations from the
                  dashboard with full lifecycle controls.
                </p>
              </article>

              <article className="card-surface card-hover rounded-2xl p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <PlugZap className="h-4 w-4" />
                </div>
                <h4 className="mt-5 text-lg font-semibold text-foreground">
                  Integrations
                </h4>
                <p className="mt-3 text-sm leading-7 text-subtle">
                  Connection state is tracked per user.
                </p>
              </article>

              <article className="card-surface card-hover rounded-2xl p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <ScrollText className="h-4 w-4" />
                </div>
                <h4 className="mt-5 text-lg font-semibold text-foreground">Logs</h4>
                <p className="mt-3 text-sm leading-7 text-subtle">
                  Every run is stored with step-level detail.
                </p>
              </article>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div>
              <SectionHeading
                eyebrow="Features"
                title="Everything important is easy to scan."
                description="The interface is intentionally minimal: fewer blocks, cleaner spacing, and clear actions at each stage."
              />

              <ul className="mt-8 space-y-4">
                {featureList.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-sm leading-7 text-subtle">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-space relative z-10 border-y border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="site-container">
          <Reveal>
            <div className="card-surface rounded-2xl p-8 md:p-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <h2 className="text-[2.5rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-[3rem]">
                    Start automating your business with less friction.
                  </h2>
                  <p className="mt-6 text-base leading-8 text-subtle">
                    Generate your automation from the homepage, then manage
                    configuration, execution, and logs from a calmer dashboard.
                  </p>
                </div>

                <div className="flex">
                  <Link
                    href="/#home"
                    className="button-hover inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-white hover:bg-black/85"
                  >
                    Generate Automation
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
