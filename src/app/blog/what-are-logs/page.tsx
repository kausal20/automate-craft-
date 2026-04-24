import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What Are Logs? | AutomateCraft Blog",
  description:
    "A beginner-friendly guide to understanding automation logs — what they are, why they matter, and how to use them to keep your workflows running smoothly.",
};

export default function WhatAreLogsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── Top bar ── */}
      <header className="border-b border-white/[0.04]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard/logs"
            className="flex items-center gap-2 text-[13px] font-medium text-white/40 hover:text-white transition-colors"
          >
            ← Back to Activity
          </Link>
          <span className="rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent/70">
            Guide
          </span>
        </div>
      </header>

      {/* ── Article ── */}
      <article className="mx-auto max-w-3xl px-6 py-14">
        {/* Title block */}
        <div className="mb-12">
          <p className="text-[12px] font-bold uppercase tracking-widest text-accent/60">
            AutomateCraft Blog
          </p>
          <h1 className="mt-3 text-[2.2rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.8rem]">
            What Are Logs? 📋
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/45">
            A simple, no-jargon guide to understanding what happens every time your automation runs — and how to use that information to your advantage.
          </p>
          <div className="mt-5 flex items-center gap-4 text-[12px] text-white/25">
            <span>5 min read</span>
            <span>·</span>
            <span>Updated April 2026</span>
          </div>
        </div>

        {/* Content */}
        <div className="prose-custom space-y-10 text-[15px] leading-[1.8] text-white/60">

          {/* Section 1 */}
          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-white/90">
              🤔 So, what exactly are logs?
            </h2>
            <p>
              Think of logs as a <strong className="text-white/80">diary for your automations</strong>. Every time a workflow runs — whether it sends an email, updates a spreadsheet, or posts a message — each step gets recorded automatically.
            </p>
            <p className="mt-4">
              Just like checking your bank statement to see where your money went, you can check logs to see exactly what your automation did, step by step.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-white/90">
              🎯 Why should you care?
            </h2>
            <p>
              Automations save you hours of work. But what happens when something goes wrong? Without logs, you&apos;d be guessing. With logs, you get:
            </p>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-emerald-400">✅</span>
                <span><strong className="text-white/80">Proof it worked</strong> — See exactly which steps completed successfully.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-red-400">🔴</span>
                <span><strong className="text-white/80">Where it broke</strong> — If something fails, the log tells you exactly which step had the problem.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-amber-400">⏱️</span>
                <span><strong className="text-white/80">How long it took</strong> — Monitor performance and catch slow steps before they become a problem.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-accent">📊</span>
                <span><strong className="text-white/80">What data flowed through</strong> — See the actual input and output of each run.</span>
              </li>
            </ul>
          </section>

          {/* Section 3 - Visual guide */}
          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-white/90">
              🗺️ Reading your Activity page
            </h2>
            <p>
              When you open the <strong className="text-white/80">Activity</strong> page in your dashboard, here&apos;s what you&apos;ll see:
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-[13px] font-semibold text-white/80">📈 Stats at the top</p>
                <p className="mt-2 text-[13px] text-white/45">
                  Four cards showing your total runs, completed, failed, and currently active automations. A quick health check at a glance.
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-[13px] font-semibold text-white/80">🔍 Search &amp; Filter</p>
                <p className="mt-2 text-[13px] text-white/45">
                  Use the search bar to find a specific automation by name, or filter by status — show only completed, failed, or running automations.
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-[13px] font-semibold text-white/80">📝 Run history</p>
                <p className="mt-2 text-[13px] text-white/45">
                  Each row represents one automation run. Click any row to expand it and see the step-by-step breakdown of what happened, plus the input data and output result.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 - Statuses */}
          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-white/90">
              🚦 Understanding status colors
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06]">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-5 py-3 font-semibold text-white/50">Status</th>
                    <th className="px-5 py-3 font-semibold text-white/50">What it means</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <tr>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-emerald-400 font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/50">Everything worked perfectly. All steps ran without issues. 🎉</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-red-400 font-semibold">
                        <span className="h-2 w-2 rounded-full bg-red-400" /> Failed
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/50">Something went wrong. Expand the row to see which step caused the issue. 🔧</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-amber-400 font-semibold">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" /> Running
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/50">This automation is currently in progress. Check back in a moment. ⏳</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 - Troubleshooting */}
          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-white/90">
              🛠️ What to do when something fails
            </h2>
            <ol className="mt-4 space-y-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">1</span>
                <span><strong className="text-white/80">Click the failed run</strong> to expand it and see the step-by-step details.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">2</span>
                <span><strong className="text-white/80">Look for the red step</strong> — that&apos;s where the problem happened.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">3</span>
                <span><strong className="text-white/80">Read the error message</strong> — it usually tells you exactly what went wrong (e.g., &quot;API key expired&quot; or &quot;Sheet not found&quot;).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">4</span>
                <span><strong className="text-white/80">Check the input data</strong> — sometimes the automation received unexpected or missing data.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">5</span>
                <span><strong className="text-white/80">Fix and re-run</strong> — make the change in your automation setup and trigger it again.</span>
              </li>
            </ol>
          </section>

          {/* Section 6 - Pro tips */}
          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-white/90">
              💡 Pro tips
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                <span className="text-lg">🔄</span>
                <div>
                  <p className="text-[13px] font-semibold text-white/75">Hit Refresh regularly</p>
                  <p className="mt-1 text-[12px] text-white/40">If you just triggered an automation, click Refresh to see the latest results.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                <span className="text-lg">🔎</span>
                <div>
                  <p className="text-[13px] font-semibold text-white/75">Use search to find specific runs</p>
                  <p className="mt-1 text-[12px] text-white/40">Type any keyword — automation name, error message, or step name — to quickly locate what you&apos;re looking for.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                <span className="text-lg">📋</span>
                <div>
                  <p className="text-[13px] font-semibold text-white/75">Check input/output data</p>
                  <p className="mt-1 text-[12px] text-white/40">The &quot;Input Data&quot; and &quot;Output&quot; sections in each run show you exactly what went in and what came out. Useful for debugging.</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl border border-accent/15 bg-accent/[0.04] p-8 text-center">
            <p className="text-[18px] font-semibold text-white/85">Ready to check your automations? 🚀</p>
            <p className="mt-2 text-[14px] text-white/45">
              Head back to your Activity page to see your latest runs.
            </p>
            <Link
              href="/dashboard/logs"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] hover:bg-[#5c95fb] transition-all active:scale-[0.98]"
            >
              Go to Activity →
            </Link>
          </section>
        </div>
      </article>
    </div>
  );
}
