import type { SVGProps } from "react";
import { CheckCircle2 } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";

const principles = [
  "Simple automation creation",
  "No coding required",
  "Fast execution",
  "Scalable workflows",
];

export default function WhyUsPage() {
  return (
    <main className="min-h-screen">
      <PageIntro
        eyebrow="Why Us"
        title="Automation should feel operational, not experimental."
        description="AutomateCraft is built for teams that want AI workflows to be understandable, manageable, and dependable from the start."
      />

      <section className="section-space section-muted pt-0">
        <div className="site-container grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Mission
              </span>
              <h2 className="section-title mt-6">
                Help businesses automate repetitive work with less operational friction.
              </h2>
              <p className="mt-7 text-[0.97rem] leading-8 text-white/45">
                The goal is not to add another layer of software. The goal is to
                replace manual handoffs with workflows that are easier to understand,
                configure, and maintain.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <article className="card-glass rounded-[24px] p-8">
              <p className="text-[1.02rem] leading-8 text-white/50">
                Teams trust automation when the trigger is visible, the setup is
                explicit, and the execution history is easy to scan. That is the
                standard AutomateCraft is designed around.
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="section-space">
        <div className="site-container grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Reveal>
            <article className="card-glass rounded-[24px] p-8 lg:min-h-[340px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Why Choose Us
              </span>
              <h2 className="mt-6 text-[2.3rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-[2.9rem]">
                Clear creation, calm execution, and fewer moving parts.
              </h2>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {principles.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent/60" />
                    <span className="text-sm leading-7 text-white/50">{item}</span>
                  </div>
                ))}
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="space-y-6">
              <article className="card-glass rounded-[24px] p-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  Problem
                </span>
                <p className="mt-5 text-[0.97rem] leading-8 text-white/50">
                  Manual repetitive work slows teams down, creates inconsistent
                  follow-ups, and makes execution harder to track.
                </p>
              </article>

              <article className="card-glass rounded-[24px] p-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  Solution
                </span>
                <p className="mt-5 text-[0.97rem] leading-8 text-white/50">
                  AI-powered automation with clear triggers, setup requirements,
                  connection status, and dependable logs for every run.
                </p>
              </article>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="section-space pb-32">
        <div className="site-container">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Core Capabilities
              </span>
              <h2 className="mt-6 text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[3.2rem]">
                Everything you need to automate faster.
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Conversational AI Building",
                description: "Just type what you want to automate. Our agentic AI translates plain English into production-ready workflow logic in seconds.",
                icon: (props: SVGProps<SVGSVGElement>) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
              },
              {
                title: "Real-Time Pipeline Editor",
                description: "Visualize every step. The 40% slide-in panel lets you review and tweak API routes, target destinations, and execution parameters live.",
                icon: (props: SVGProps<SVGSVGElement>) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25A2.25 2.25 0 0110.5 15.75V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
              },
              {
                title: "Immutable Execution Logs",
                description: "Never guess why something failed. Every execution state is permanently logged with clear success/fail status markers for rapid debugging.",
                icon: (props: SVGProps<SVGSVGElement>) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
              }
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
    </main>
  );
}
