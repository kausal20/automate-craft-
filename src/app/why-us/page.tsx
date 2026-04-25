"use client";

import type { SVGProps } from "react";
import { CheckCircle2, XCircle, MinusCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";
import { motion } from "framer-motion";

/* ─── Use Case Data ─── */
const useCases = [
  {
    emoji: "📩",
    title: "Lead Capture → CRM",
    desc: "Form fills auto-create CRM contacts and trigger welcome emails.",
  },
  {
    emoji: "🔔",
    title: "Alert on Urgent Tickets",
    desc: "Slack/WhatsApp alerts when support tickets are marked high-priority.",
  },
  {
    emoji: "📊",
    title: "Data Sync to Sheets",
    desc: "New orders or signups logged to Google Sheets in real-time.",
  },
  {
    emoji: "📧",
    title: "Scheduled Follow-ups",
    desc: "Automatic email sequences triggered by user inactivity.",
  },
];

/* ─── Comparison Data ─── */
type Check = "yes" | "no" | "partial";
const comparisonRows: { feature: string; us: Check; zapier: Check; make: Check; manual: Check }[] = [
  { feature: "AI-powered builder (no code)", us: "yes", zapier: "no", make: "no", manual: "no" },
  { feature: "Plain English prompts", us: "yes", zapier: "no", make: "no", manual: "no" },
  { feature: "Setup in under 3 minutes", us: "yes", zapier: "partial", make: "no", manual: "no" },
  { feature: "Visual workflow preview", us: "yes", zapier: "yes", make: "yes", manual: "no" },
  { feature: "Execution logs per step", us: "yes", zapier: "partial", make: "yes", manual: "no" },
  { feature: "Credit-based pricing (no per-task fee)", us: "yes", zapier: "no", make: "partial", manual: "yes" },
  { feature: "Built-in form generation", us: "yes", zapier: "no", make: "no", manual: "no" },
  { feature: "WhatsApp integration", us: "yes", zapier: "partial", make: "yes", manual: "partial" },
];

function CheckIcon({ status }: { status: Check }) {
  if (status === "yes") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "partial") return <MinusCircle className="h-4 w-4 text-amber-400/60" />;
  return <XCircle className="h-4 w-4 text-white/15" />;
}

export default function WhyUsPage() {
  return (
    <main className="min-h-screen">
      <PageIntro
        eyebrow="Why Us"
        title="Automation should feel operational, not experimental."
        description="AutomateCraft is built for teams that want AI workflows to be understandable, manageable, and dependable from the start."
      />

      {/* ── Problem → Solution ── */}
      <section className="section-space section-muted pt-0">
        <div className="site-container grid gap-6 md:grid-cols-2">
          <Reveal>
            <article className="card-glass rounded-[24px] p-8 h-full border-red-500/[0.06]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/8 ring-1 ring-red-500/15 mb-5">
                <XCircle className="h-5 w-5 text-red-400/70" />
              </div>
              <h3 className="text-lg font-semibold text-white/80 mb-3">The problem</h3>
              <p className="text-[15px] leading-7 text-white/40">
                Manual repetitive work slows teams down. Copy-pasting data between apps, sending follow-up messages by hand, and checking spreadsheets for updates — it wastes hours every week and leads to inconsistent results.
              </p>
            </article>
          </Reveal>
          <Reveal delay={0.08}>
            <article className="card-glass rounded-[24px] p-8 h-full border-emerald-500/[0.06]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/8 ring-1 ring-emerald-500/15 mb-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400/70" />
              </div>
              <h3 className="text-lg font-semibold text-white/80 mb-3">Our solution</h3>
              <p className="text-[15px] leading-7 text-white/40">
                Describe what you need in plain English. AutomateCraft&apos;s AI builds the entire workflow — triggers, actions, connections — in under 3 minutes. You review, test, and deploy. No code, no drag-and-drop complexity.
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="section-space">
        <div className="site-container">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Comparison
              </span>
              <h2 className="mt-6 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[2.8rem]">
                How we stack up.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-white/35">
                We&apos;re not trying to replace every tool. We&apos;re built for teams that want the fastest path from idea to running automation.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="py-4 pl-6 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-white/30">Feature</th>
                    <th className="px-4 py-4 text-center">
                      <span className="text-[12px] font-bold text-accent">AutomateCraft</span>
                    </th>
                    <th className="px-4 py-4 text-center text-[12px] font-semibold text-white/30">Zapier</th>
                    <th className="px-4 py-4 text-center text-[12px] font-semibold text-white/30">Make</th>
                    <th className="px-4 py-4 pr-6 text-center text-[12px] font-semibold text-white/30">Manual</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-white/[0.03] ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"} hover:bg-white/[0.02] transition-colors`}>
                      <td className="py-3.5 pl-6 pr-4 text-[13px] text-white/60">{row.feature}</td>
                      <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><CheckIcon status={row.us} /></div></td>
                      <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><CheckIcon status={row.zapier} /></div></td>
                      <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><CheckIcon status={row.make} /></div></td>
                      <td className="px-4 py-3.5 pr-6 text-center"><div className="flex justify-center"><CheckIcon status={row.manual} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="section-space section-muted">
        <div className="site-container">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Use Cases
              </span>
              <h2 className="mt-6 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[2.8rem]">
                Built for real workflows.
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((uc, i) => (
              <Reveal key={uc.title} delay={i * 0.06}>
                <article className="card-glass rounded-2xl p-6 h-full group hover:border-white/[0.1] transition-all duration-300">
                  <span className="text-2xl">{uc.emoji}</span>
                  <h3 className="mt-3 text-[15px] font-semibold text-white/80 group-hover:text-white transition-colors">{uc.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-white/35">{uc.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Capabilities ── */}
      <section className="section-space">
        <div className="site-container">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Core Capabilities
              </span>
              <h2 className="mt-6 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[2.8rem]">
                Everything you need to automate faster.
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Conversational AI Builder",
                description: "Type what you want in plain English. Our AI translates it into a production-ready workflow in seconds — no drag-and-drop complexity.",
                icon: (props: SVGProps<SVGSVGElement>) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>,
              },
              {
                title: "Live Workflow Preview",
                description: "See every step before you deploy. The slide-in panel lets you review triggers, actions, and parameters — then test with one click.",
                icon: (props: SVGProps<SVGSVGElement>) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
              },
              {
                title: "Step-by-Step Execution Logs",
                description: "Never guess why something failed. Every run is logged with clear status markers, input/output data, and timing for rapid debugging.",
                icon: (props: SVGProps<SVGSVGElement>) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
              },
            ].map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.1}>
                <article className="card-glass rounded-[2rem] p-8 h-full relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-white/[0.03] ring-1 ring-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.4)] mb-6 group-hover:ring-accent/20 group-hover:bg-accent/5 transition-all duration-300">
                    <feature.icon className="h-6 w-6 text-white/40 group-hover:text-accent transition-colors duration-300" />
                  </div>
                  <h3 className="text-[1.2rem] font-bold tracking-tight text-white/90 mb-3 group-hover:text-white transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/40 group-hover:text-white/50 transition-colors duration-300">
                    {feature.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-space pb-32">
        <div className="site-container">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ready to stop doing it manually?
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-white/35">
                Start building automations in plain English. No credit card required.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-8 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_32px_rgba(59,130,246,0.35)] hover:-translate-y-0.5"
                >
                  Get started free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-8 text-[15px] font-medium text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
