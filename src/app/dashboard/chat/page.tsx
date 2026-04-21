"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, MessageSquare, Mail, BarChart3, FileSpreadsheet, Zap, Brain } from "lucide-react";
import { motion } from "framer-motion";

const suggestions = [
  {
    icon: MessageSquare,
    title: "WhatsApp Lead Alerts",
    description: "Auto-notify your team on WhatsApp when a new lead submits a form.",
    prompt: "When a new form is submitted, send a WhatsApp message to my team with the lead details",
    gradient: "from-emerald-500/10 to-emerald-500/5",
    accent: "text-emerald-400",
    border: "hover:border-emerald-500/30",
  },
  {
    icon: Mail,
    title: "Email Follow-Up",
    description: "Send personalized follow-up emails to new contacts automatically.",
    prompt: "When someone signs up, send them a welcome email and schedule a follow-up in 3 days",
    gradient: "from-blue-500/10 to-blue-500/5",
    accent: "text-blue-400",
    border: "hover:border-blue-500/30",
  },
  {
    icon: BarChart3,
    title: "CRM Sync Pipeline",
    description: "Push form responses into your CRM and update deal stages.",
    prompt: "Sync new form submissions to HubSpot CRM and create a new deal for each lead",
    gradient: "from-violet-500/10 to-violet-500/5",
    accent: "text-violet-400",
    border: "hover:border-violet-500/30",
  },
  {
    icon: FileSpreadsheet,
    title: "Sheets Data Logger",
    description: "Log every event or submission into a structured Google Sheet.",
    prompt: "Log every form submission into a Google Sheet with timestamp, name, email, and message",
    gradient: "from-amber-500/10 to-amber-500/5",
    accent: "text-amber-400",
    border: "hover:border-amber-500/30",
  },
];

export default function ChatEntryPage() {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ultraThinking, setUltraThinking] = useState(false);
  const router = useRouter();

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!prompt.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const chatId = Math.random().toString(36).slice(2, 10);
    router.push(`/dashboard/chat/${chatId}?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  const handleSuggestionClick = (text: string) => {
    setPrompt(text);
    setIsSubmitting(true);
    const chatId = Math.random().toString(36).slice(2, 10);
    router.push(`/dashboard/chat/${chatId}?prompt=${encodeURIComponent(text)}`);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[760px]"
      >
        {/* Hero */}
        <div className="mx-auto max-w-[640px] text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1.5">
            <Zap className="h-3.5 w-3.5 text-accent" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              Workspace
            </span>
          </div>
          <h1 className="text-[2.7rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
            Build your automation
          </h1>
          <p className="mt-5 text-[0.98rem] leading-8 text-white/45">
            Start with a plain-language instruction. The workspace will turn it
            into a structured automation flow you can configure and deploy.
          </p>
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="mx-auto mt-12 max-w-[720px]">
          <div className="rounded-[18px] border border-[#2D2D2D] bg-[#1C1C1C] px-5 py-5 shadow-[0_16px_32px_rgba(28,28,28,0.12)] transition-all duration-300 ease-out focus-within:border-accent focus-within:shadow-[0_0_0_4px_rgba(79,142,247,0.08),0_18px_38px_rgba(28,28,28,0.14)]">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Describe your automation..."
                className="min-h-[92px] w-full resize-none border-none bg-transparent pb-12 pr-14 text-[1rem] leading-[1.6] text-white outline-none placeholder:text-white/34"
              />

              <button
                type="submit"
                disabled={!prompt.trim() || isSubmitting}
                className={`absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                  prompt.trim() && !isSubmitting
                    ? "bg-accent text-white hover:scale-[1.05] hover:bg-[#5b95fb]"
                    : "bg-[#2D2D2D] text-white/36"
                }`}
                aria-label="Start workspace"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 border-t border-white/8 pt-3 flex items-center justify-between">
              <p className="text-xs font-medium text-white/34">
                Type your automation and press enter
              </p>

              {/* Ultra Thinking Toggle */}
              <button
                type="button"
                onClick={() => setUltraThinking((v) => !v)}
                className={`group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-300 ${
                  ultraThinking
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                    : "border-white/[0.08] bg-white/[0.03] text-white/35 hover:border-white/[0.14] hover:text-white/60"
                }`}
                aria-label="Toggle Ultra Thinking mode"
                aria-pressed={ultraThinking}
              >
                {/* Animated glow dot */}
                <span className="relative flex h-1.5 w-1.5">
                  {ultraThinking && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    ultraThinking ? "bg-violet-400" : "bg-white/20"
                  }`} />
                </span>
                <Brain className="h-3 w-3" />
                Ultra Thinking
              </button>
            </div>
          </div>
        </form>

        {/* Suggestion Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-10 max-w-[720px]"
        >
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25">
            Quick Start Templates
          </p>
          <div className="grid grid-cols-2 gap-3">
            {suggestions.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => handleSuggestionClick(s.prompt)}
                  className={`group relative flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-gradient-to-br ${s.gradient} p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] ${s.border}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ${s.accent} ring-1 ring-white/10`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white/90 group-hover:text-white transition-colors">
                      {s.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/40 line-clamp-2">
                      {s.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
