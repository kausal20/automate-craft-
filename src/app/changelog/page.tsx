import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — AutomateCraft",
  description: "What's new in AutomateCraft. Latest updates, features, and improvements.",
};

const entries = [
  {
    date: "Apr 24, 2026",
    tag: "improvement",
    title: "Upgraded product demo on login page",
    desc: "New 6-step animated demo shows the full workflow: prompt → AI question → answer → side panel → preview → deploy.",
  },
  {
    date: "Apr 24, 2026",
    tag: "fix",
    title: "Navigation now visible on all pages",
    desc: "Navbar with Pricing, Why Us, and auth links is now consistently visible on every public page.",
  },
  {
    date: "Apr 22, 2026",
    tag: "improvement",
    title: "Redesigned chat interface",
    desc: "Professional IDE-style chat with 40% / 60% split panel for workflow preview. Added AI thinking indicator and streaming responses.",
  },
  {
    date: "Apr 21, 2026",
    tag: "feature",
    title: "Pricing page with FAQ & trust badges",
    desc: "Four-tier pricing cards with monthly/yearly toggle, Razorpay trust badges, and collapsible FAQ section.",
  },
  {
    date: "Apr 20, 2026",
    tag: "feature",
    title: "Ultra Thinking mode",
    desc: "Toggle for deeper AI analysis when building complex multi-step automations. Available on Plus plans and above.",
  },
  {
    date: "Apr 19, 2026",
    tag: "improvement",
    title: "Split-screen login redesign",
    desc: "New two-step auth flow with Google/Email options and interactive right-hand panel showcasing product capabilities.",
  },
];

const tagColors: Record<string, { bg: string; text: string }> = {
  feature: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  improvement: { bg: "bg-accent/10", text: "text-accent" },
  fix: { bg: "bg-amber-500/10", text: "text-amber-400" },
};

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-3xl px-6 py-28 lg:py-36">
        <div className="mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
            Changelog
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">What&apos;s new</h1>
          <p className="mt-4 text-sm text-white/35">Latest updates, features, and fixes shipped to AutomateCraft.</p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.06]" />

          <div className="space-y-10">
            {entries.map((entry) => {
              const colors = tagColors[entry.tag] || tagColors.feature;
              return (
                <div key={entry.title} className="relative pl-8">
                  {/* Dot */}
                  <div className="absolute left-0 top-2 h-[15px] w-[15px] rounded-full border-2 border-white/[0.08] bg-[#09090b]">
                    <div className="absolute inset-[3px] rounded-full bg-accent/50" />
                  </div>

                  <p className="text-[12px] font-medium text-white/25">{entry.date}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                      {entry.tag}
                    </span>
                    <h3 className="text-[16px] font-semibold text-white/85">{entry.title}</h3>
                  </div>
                  <p className="mt-2 text-[14px] leading-7 text-white/40">{entry.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
