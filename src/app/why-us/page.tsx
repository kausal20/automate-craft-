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
    <main className="min-h-screen bg-white">
      <PageIntro
        eyebrow="Why Us"
        title="Automation should feel operational, not experimental."
        description="AutomateCraft is built for teams that want AI workflows to be understandable, manageable, and dependable from the start."
      />

      <section className="section-space section-muted pt-0">
        <div className="site-container grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <Reveal>
            <div>
              <p className="eyebrow">Mission</p>
              <h2 className="section-title mt-6">
                Help businesses automate repetitive work with less operational friction.
              </h2>
              <p className="mt-7 text-[0.97rem] leading-8 text-subtle">
                The goal is not to add another layer of software. The goal is to
                replace manual handoffs with workflows that are easier to understand,
                configure, and maintain.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <article className="card-surface rounded-[24px] p-8">
              <p className="text-[1.02rem] leading-8 text-subtle">
                Teams trust automation when the trigger is visible, the setup is
                explicit, and the execution history is easy to scan. That is the
                standard AutomateCraft is designed around.
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="section-space bg-white">
        <div className="site-container grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Reveal>
            <article className="card-surface rounded-[24px] p-8 lg:min-h-[340px]">
              <p className="eyebrow">Why Choose Us</p>
              <h2 className="mt-6 text-[2.3rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-[2.9rem]">
                Clear creation, calm execution, and fewer moving parts.
              </h2>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {principles.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-sm leading-7 text-subtle">{item}</span>
                  </div>
                ))}
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="space-y-8">
              <article className="card-surface rounded-[24px] p-8">
                <p className="eyebrow">Problem</p>
                <p className="mt-5 text-[0.97rem] leading-8 text-subtle">
                  Manual repetitive work slows teams down, creates inconsistent
                  follow-ups, and makes execution harder to track.
                </p>
              </article>

              <article className="card-surface rounded-[24px] p-8">
                <p className="eyebrow">Solution</p>
                <p className="mt-5 text-[0.97rem] leading-8 text-subtle">
                  AI-powered automation with clear triggers, setup requirements,
                  connection status, and dependable logs for every run.
                </p>
              </article>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
