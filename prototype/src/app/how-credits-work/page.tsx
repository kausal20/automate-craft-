import Link from "next/link";
import { ArrowLeft, Zap, BatteryCharging, RefreshCcw, LayoutTemplate, ShieldCheck, ChevronRight, CheckCircle2 } from "lucide-react";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: "How Credits Work - AutomateCraft",
  description: "Learn how the credit system works in AutomateCraft — simple, transparent, and flexible usage-based billing.",
};

export default function HowCreditsWorkPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white pt-16 pb-32 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[0%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[150px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[0%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px] opacity-40 pointer-events-none" />
      
      <div className="mx-auto max-w-5xl px-6 lg:px-8 relative z-10">
        <Link href="/pricing" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12 group">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[13px] font-semibold tracking-wide uppercase">Back to Pricing</span>
        </Link>
        
        {/* Page Header */}
        <section className="text-center space-y-6 mb-16 px-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-tr from-accent/20 to-accent/5 ring-1 ring-accent/20 mb-8 shadow-[0_0_40px_rgba(79,142,247,0.15)] relative overflow-hidden group hover:scale-110 transition-transform">
            <div className="absolute inset-0 bg-accent/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <Zap className="h-8 w-8 text-accent relative z-10" />
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 drop-shadow-sm">
            How Credits Work
          </h1>
          <p className="text-[17px] leading-relaxed text-white/60 max-w-2xl mx-auto font-medium">
            Everything in AutomateCraft runs on a simple, transparent credit system. No complicated tiers, no arbitrary execution limits — just flexible usage.
          </p>
        </section>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Box 1: What is a credit */}
          <Reveal delay={0.05}>
          <div className="lg:col-span-2 rounded-[24px] border border-white/10 bg-[#0c0c0c] p-8 sm:p-10 relative overflow-hidden group hover:border-white/20 transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start gap-6 mb-2 relative z-10">
              <div className="shrink-0 h-14 w-14 rounded-2xl bg-white/5 text-white/80 ring-1 ring-white/10 shadow-inner flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:text-emerald-400 group-hover:ring-emerald-500/20 transition-all">
                <BatteryCharging className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-3">What is a credit?</h2>
                <p className="text-white/60 leading-relaxed text-[16px] max-w-lg">
                  A credit is a small unit of usage. Every time you create or run an automation, a few credits are consumed. Think of it like fuel — the more you use the system, the more credits you spend.
                </p>
              </div>
            </div>
          </div>
          </Reveal>

          {/* Box 2: Monthly cycle */}
          <Reveal delay={0.13}>
          <div className="rounded-[24px] border border-white/10 bg-[#0c0c0c] p-8 relative overflow-hidden group hover:border-white/20 transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex flex-col h-full relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-white/5 text-white/80 ring-1 ring-white/10 flex items-center justify-center w-min mb-6 group-hover:bg-blue-500/10 group-hover:text-blue-400 group-hover:ring-blue-500/20 transition-all">
                <RefreshCcw className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-3">Monthly cycle</h2>
              <p className="text-white/60 text-[15px] leading-relaxed flex-1">
                Each plan gives you a fixed number of credits every month. They reset at the end of your billing cycle, so you start fresh each month.
              </p>
            </div>
          </div>
          </Reveal>

          {/* Box 3: How credits are used */}
          <Reveal delay={0.21}>
          <div className="lg:col-span-3 rounded-[24px] border border-accent/20 bg-gradient-to-br from-[#111] to-[#0a0a0a] p-8 sm:p-10 relative overflow-hidden hover:border-accent/40 transition-all shadow-lg">
            <div className="absolute left-0 bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            
            <div className="md:flex gap-12 items-center">
              <div className="flex-1 mb-10 md:mb-0">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/30 flex items-center justify-center">
                    <LayoutTemplate className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">How credits are used</h2>
                </div>
                
                <p className="text-white/60 leading-relaxed text-[16px] mb-8 max-w-lg">
                  Each automation uses credits based on complexity. Build cost and run cost are combined into one simple usage measure — no hidden line items.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors max-w-md">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <p className="text-[15px] text-white/80"><strong className="text-white font-semibold">Simple automation</strong> uses fewer credits</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors max-w-md">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <p className="text-[15px] text-white/80"><strong className="text-white font-semibold">Multi-step automation</strong> uses more credits</p>
                  </div>
                </div>
              </div>
              
              {/* Visual Diagram */}
              <div className="flex-[0.85] bg-[#050505] rounded-[20px] border border-white/10 p-6 shadow-2xl relative">
                <div className="absolute top-4 left-4 flex gap-1.5 opacity-30">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                
                <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-6 text-center mt-2">Example Workflow Cost</h4>
                
                <div className="space-y-3">
                  <Reveal delay={0.1}>
                  <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#111] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 text-[14px] font-medium text-white/90">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> Receives a lead
                    </div>
                    <span className="text-[12px] font-mono text-white/40 font-bold bg-white/5 px-2 py-0.5 rounded-md">BASE</span>
                  </div>
                  </Reveal>
                  <Reveal delay={0.3}>
                  <div className="w-0.5 h-4 bg-gradient-to-b from-white/10 to-transparent mx-auto relative z-10" />
                  <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#111] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 text-[14px] font-medium text-white/90">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" /> Processes Data (AI)
                    </div>
                    <span className="text-[12px] font-mono text-white/40 font-bold bg-white/5 px-2 py-0.5 rounded-md">COMPUTE</span>
                  </div>
                  </Reveal>
                  <Reveal delay={0.5}>
                  <div className="w-0.5 h-4 bg-gradient-to-b from-white/10 to-transparent mx-auto relative z-10" />
                  <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#111] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 text-[14px] font-medium text-white/90">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Sends WhatsApp Message
                    </div>
                    <span className="text-[12px] font-mono text-white/40 font-bold bg-white/5 px-2 py-0.5 rounded-md">PREMIUM</span>
                  </div>
                  </Reveal>
                </div>
                
                <div className="mt-6 pt-5 border-t border-white/5 flex justify-between items-center text-sm bg-[#111] -mx-6 -mb-6 px-6 pb-6 rounded-b-[20px]">
                  <span className="text-white/50 font-medium tracking-wide">Estimated total:</span>
                  <span className="font-bold text-accent text-[16px] tracking-tight bg-accent/10 px-3 py-1 rounded-lg border border-accent/20">
                    ~ 5–8 Credits
                  </span>
                </div>
              </div>
            </div>
            
            <p className="mt-8 text-[13px] text-white/40 md:text-left text-center flex items-center gap-2 max-w-fit mx-auto md:mx-0 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <ShieldCheck className="h-4 w-4" />
              You don&apos;t need to calculate anything — the system handles it automatically.
            </p>
          </div>
          </Reveal>

          {/* Box 4: Need more */}
          <Reveal delay={0.29}>
          <div className="lg:col-span-2 rounded-[24px] border border-emerald-500/10 bg-[#0a0e0a] p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-all hover:shadow-[0_8px_32px_rgba(16,185,129,0.1)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none group-hover:scale-150 transition-transform" />
            <div className="flex flex-col sm:flex-row items-start gap-6 h-full relative z-10">
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 flex items-center justify-center">
                <Zap className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Need more credits?</h2>
                <p className="text-white/60 leading-relaxed text-[15px] mb-5">
                  Your automations never stop unexpectedly. If you run low, you can top up anytime or upgrade your plan to get a higher monthly allowance.
                </p>
                <div className="flex flex-wrap gap-3 text-[13px] tracking-wide font-medium">
                  <span className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm">
                    Upgrade your plan
                  </span>
                  <span className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm">
                    Buy add-on credits anytime
                  </span>
                </div>
              </div>
            </div>
          </div>
          </Reveal>

          {/* Box 5: Why this system */}
          <Reveal delay={0.37}>
          <div className="rounded-[24px] border border-white/10 bg-[#0c0c0c] p-8 text-center flex flex-col items-center justify-center hover:border-white/20 transition-all group">
            <ShieldCheck className="h-10 w-10 text-white/20 mb-5 group-hover:text-white/40 transition-colors" />
            <h2 className="text-[20px] font-bold tracking-tight text-white mb-5">Why this system?</h2>
            
            <div className="flex flex-wrap justify-center gap-2 mb-6 w-full">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80 text-[13px] border border-white/10 grow justify-center">
                <span className="font-semibold tracking-wide">Simple</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80 text-[13px] border border-white/10 grow justify-center">
                <span className="font-semibold tracking-wide">Flexible</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80 text-[13px] border border-white/10 grow justify-center">
                <span className="font-semibold tracking-wide">Fair</span>
              </div>
            </div>
            
            <p className="text-[14px] text-white/50 font-medium">You only pay for what you <br /> actually use.</p>
          </div>
          </Reveal>

        </div>

        {/* Final CTA */}
        <div className="mt-20 text-center max-w-2xl mx-auto relative z-10 w-full bg-gradient-to-b from-[#151515] to-[#0a0a0a] rounded-[32px] p-12 border border-white/5 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          
          <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4 leading-tight drop-shadow-md">
            Build smarter. <br /> Use only what you need. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400">Scale when you&apos;re ready.</span>
          </h3>
          
          <div className="mt-10 mb-2">
            <Link href="/pricing" className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-white px-8 text-[15px] font-bold tracking-wide text-black transition-all hover:bg-gray-200 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.15)] group">
              View Pricing Plans
              <ChevronRight className="h-5 w-5 bg-black/10 rounded-full p-1" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
