"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Zap,
  ArrowRight,
  Settings2,
  CheckCircle2,
  Loader2,
  Rocket,
  FlaskConical,
  Play,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";

/* ─── Timeline Definition ─── */
const DEMO_PROMPT = "Send a WhatsApp message when a new lead fills out my form";

type Phase =
  | "idle"
  | "typing"
  | "thinking"
  | "analysis"
  | "form"
  | "building"
  | "ready"
  | "deployed";

const THINKING_STEPS = [
  "Parsing natural language input",
  "Identifying trigger event",
  "Mapping action path",
  "Resolving data schema",
];

const FORM_FIELDS = [
  { label: "WhatsApp Number", value: "+91 98765 43210" },
  { label: "Message Template", value: "Hi {{name}}, thanks for signing up!" },
  { label: "Priority", value: "High" },
];

/* ─── Main Component ─── */
export default function AnimatedProductDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: "-100px" });

  const [phase, setPhase] = useState<Phase>("idle");
  const [typedChars, setTypedChars] = useState(0);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [analysisVisible, setAnalysisVisible] = useState(0);
  const [formFieldsDone, setFormFieldsDone] = useState(0);
  const [buildProgress, setBuildProgress] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Auto-play when in view
  useEffect(() => {
    if (isInView && !hasPlayed && phase === "idle") {
      const t = setTimeout(() => startDemo(), 600);
      return () => clearTimeout(t);
    }
  }, [isInView, hasPlayed, phase]);

  const reset = () => {
    setPhase("idle");
    setTypedChars(0);
    setThinkingStep(0);
    setAnalysisVisible(0);
    setFormFieldsDone(0);
    setBuildProgress(0);
    setHasPlayed(false);
  };

  const startDemo = () => {
    setHasPlayed(true);
    setPhase("typing");
    setTypedChars(0);
  };

  // Phase: Typing
  useEffect(() => {
    if (phase !== "typing") return;
    if (typedChars >= DEMO_PROMPT.length) {
      const t = setTimeout(() => setPhase("thinking"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypedChars((c) => c + 1), 35);
    return () => clearTimeout(t);
  }, [phase, typedChars]);

  // Phase: Thinking
  useEffect(() => {
    if (phase !== "thinking") return;
    if (thinkingStep >= THINKING_STEPS.length) {
      const t = setTimeout(() => setPhase("analysis"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setThinkingStep((s) => s + 1), 600);
    return () => clearTimeout(t);
  }, [phase, thinkingStep]);

  // Phase: Analysis
  useEffect(() => {
    if (phase !== "analysis") return;
    if (analysisVisible >= 3) {
      const t = setTimeout(() => setPhase("form"), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setAnalysisVisible((v) => v + 1), 500);
    return () => clearTimeout(t);
  }, [phase, analysisVisible]);

  // Phase: Form auto-fill
  useEffect(() => {
    if (phase !== "form") return;
    if (formFieldsDone >= FORM_FIELDS.length) {
      const t = setTimeout(() => setPhase("building"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setFormFieldsDone((f) => f + 1), 700);
    return () => clearTimeout(t);
  }, [phase, formFieldsDone]);

  // Phase: Building
  useEffect(() => {
    if (phase !== "building") return;
    if (buildProgress >= 100) {
      const t = setTimeout(() => setPhase("ready"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setBuildProgress((p) => Math.min(p + 8, 100)), 80);
    return () => clearTimeout(t);
  }, [phase, buildProgress]);

  // Phase: Ready -> Deploy
  useEffect(() => {
    if (phase !== "ready") return;
    const t = setTimeout(() => setPhase("deployed"), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  const displayedPrompt = DEMO_PROMPT.slice(0, typedChars);
  const isActive = phase !== "idle";

  return (
    <section ref={containerRef} className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
            See It In Action
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Watch automation build itself
          </h2>
          <p className="mt-4 text-[1rem] leading-7 text-white/35 max-w-xl mx-auto">
            From prompt to live workflow in under 60 seconds — no editing, no
            code, no video tricks. This is real.
          </p>
        </div>

        {/* Demo Window */}
        <div className="relative mx-auto max-w-3xl">
          {/* Browser chrome */}
          <div className="rounded-t-xl border border-white/[0.06] border-b-0 bg-[#111] px-4 py-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] text-white/25">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/40" />
                app.automatecraft.com/chat
              </div>
            </div>
            {/* Replay button */}
            {phase === "deployed" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={reset}
                className="flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Replay
              </motion.button>
            )}
          </div>

          {/* Chat body */}
          <div className="rounded-b-xl border border-white/[0.06] bg-[#0a0a0c] overflow-hidden min-h-[420px] flex flex-col">
            <div className="flex-1 p-5 space-y-4 overflow-hidden">
              {/* Idle state */}
              {phase === "idle" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-4 py-16"
                >
                  <button
                    onClick={startDemo}
                    className="group flex items-center gap-3 rounded-full bg-accent/10 border border-accent/20 px-6 py-3 text-[14px] font-semibold text-accent transition-all hover:bg-accent/15 hover:border-accent/30"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 group-hover:bg-accent/30 transition-colors">
                      <Play className="h-3.5 w-3.5 ml-0.5" />
                    </div>
                    Watch the demo
                  </button>
                  <p className="text-[12px] text-white/20">
                    Auto-plays · No video · Pure code animation
                  </p>
                </motion.div>
              )}

              {/* User message */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className="rounded-2xl rounded-br-md bg-white/[0.04] border border-white/[0.06] px-4 py-2.5 max-w-[85%]">
                      <p className="text-[13px] text-white/85">
                        {displayedPrompt}
                        {phase === "typing" && (
                          <span className="inline-block w-[2px] h-[14px] bg-accent ml-0.5 mb-[-2px] animate-pulse" />
                        )}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI response area */}
              <AnimatePresence mode="wait">
                {/* Thinking */}
                {(phase === "thinking" || phase === "analysis" || phase === "form" || phase === "building" || phase === "ready" || phase === "deployed") && (
                  <motion.div
                    key="ai-block"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3"
                  >
                    {/* AI Avatar */}
                    <div className="shrink-0 h-7 w-7 rounded-full bg-[#111] border border-white/[0.06] flex items-center justify-center overflow-hidden mt-0.5">
                      <Image
                        src="/logo-new.png"
                        alt="AI"
                        width={16}
                        height={16}
                        className="opacity-70"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Thinking card */}
                      {phase === "thinking" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="rounded-xl border border-white/[0.06] bg-[#0e0e10] p-3.5"
                        >
                          <div className="flex items-center gap-2 mb-2.5">
                            <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                            <span className="text-[13px] font-semibold text-white/70">
                              Analyzing your automation
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {THINKING_STEPS.map((step, i) => (
                              <motion.div
                                key={step}
                                initial={{ opacity: 0, x: -4 }}
                                animate={{
                                  opacity: i < thinkingStep ? 1 : 0.3,
                                  x: 0,
                                }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-2"
                              >
                                {i < thinkingStep ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <div className="h-3 w-3 flex items-center justify-center">
                                    <div className="h-1.5 w-1.5 rounded-full bg-accent/40 animate-pulse" />
                                  </div>
                                )}
                                <span
                                  className={`text-[12px] ${i < thinkingStep ? "text-white/40" : "text-white/20"}`}
                                >
                                  {step}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Analysis results */}
                      {(phase === "analysis" || phase === "form" || phase === "building" || phase === "ready" || phase === "deployed") && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <p className="text-[11px] text-white/25 mb-2">
                            I analyzed your request and identified:
                          </p>
                          <div className="space-y-1.5">
                            {[
                              { label: "Trigger", value: "New form submission", icon: Zap, color: "text-amber-400", bg: "bg-amber-400/8" },
                              { label: "Action", value: "Send WhatsApp message", icon: ArrowRight, color: "text-violet-400", bg: "bg-violet-400/8" },
                              { label: "Setup", value: "Phone · Template · Priority", icon: Settings2, color: "text-accent", bg: "bg-accent/8" },
                            ].map((item, i) => (
                              <AnimatePresence key={item.label}>
                                {i < analysisVisible && (
                                  <motion.div
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3.5 py-2"
                                  >
                                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${item.bg}`}>
                                      <item.icon className={`h-3 w-3 ${item.color}`} />
                                    </div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/20 mr-1.5">
                                      {item.label}
                                    </span>
                                    <span className="text-[12px] text-white/60">
                                      {item.value}
                                    </span>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Form card */}
                      {(phase === "form" || phase === "building" || phase === "ready" || phase === "deployed") && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-white/[0.06] bg-[#0e0e10] overflow-hidden"
                        >
                          <div className="px-4 pt-4 pb-3">
                            <p className="text-[11px] text-accent/50 mb-1">
                              I need a few details to continue
                            </p>
                            <p className="text-[14px] font-semibold text-white/85">
                              Setup Configuration
                            </p>
                          </div>
                          <div className="px-4 pb-4 space-y-2.5">
                            {FORM_FIELDS.map((field, i) => (
                              <motion.div key={field.label}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <div
                                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i < formFieldsDone ? "bg-emerald-400" : "bg-white/10"}`}
                                  />
                                  <span className="text-[11px] text-white/35">
                                    {field.label}
                                  </span>
                                </div>
                                <div
                                  className={`rounded-lg border px-3 py-2 text-[12px] transition-all ${
                                    i < formFieldsDone
                                      ? "border-emerald-500/15 text-white/60"
                                      : "border-white/[0.06] text-white/15"
                                  }`}
                                >
                                  {i < formFieldsDone ? field.value : "..."}
                                </div>
                              </motion.div>
                            ))}
                            {/* Submit */}
                            <div className="flex justify-end pt-1">
                              <div
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                                  formFieldsDone >= FORM_FIELDS.length
                                    ? "bg-accent text-white"
                                    : "bg-white/[0.04] text-white/20"
                                }`}
                              >
                                Continue <ArrowRight className="h-3 w-3" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Building */}
                      {phase === "building" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="rounded-xl border border-white/[0.06] bg-[#0e0e10] p-3.5"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                            <span className="text-[13px] font-semibold text-white/70">
                              Building your workflow
                            </span>
                            <span className="ml-auto text-[11px] font-mono text-white/15">
                              {buildProgress}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <motion.div
                              className="h-full bg-accent/60 rounded-full"
                              style={{ width: `${buildProgress}%` }}
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Ready */}
                      {(phase === "ready" || phase === "deployed") && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-white/[0.06] bg-[#0e0e10] p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/8">
                                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-white/85">
                                  Automation ready
                                </p>
                                <p className="text-[10px] text-white/25">
                                  Review and deploy
                                </p>
                              </div>
                            </div>
                            <div
                              className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                                phase === "deployed"
                                  ? "bg-emerald-400/8 text-emerald-400 border border-emerald-400/15"
                                  : "bg-accent/8 text-accent/70 border border-accent/15"
                              }`}
                            >
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${phase === "deployed" ? "bg-emerald-400 animate-pulse" : "bg-accent"}`}
                              />
                              {phase === "deployed" ? "Live" : "Ready"}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-all ${
                                phase === "deployed"
                                  ? "border border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-400/70"
                                  : "border border-white/[0.06] bg-white/[0.02] text-white/40"
                              }`}
                            >
                              {phase === "deployed" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <FlaskConical className="h-3 w-3" />
                              )}
                              {phase === "deployed" ? "Passed" : "Test"}
                            </div>
                            <motion.div
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold ${
                                phase === "deployed"
                                  ? "bg-emerald-500 text-white"
                                  : "bg-accent text-white"
                              }`}
                              animate={
                                phase === "ready"
                                  ? { scale: [1, 1.02, 1] }
                                  : {}
                              }
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                              }}
                            >
                              <Rocket className="h-3 w-3" />
                              {phase === "deployed" ? "Live!" : "Deploy"}
                            </motion.div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Prompt bar */}
            <div className="border-t border-white/[0.04] px-4 py-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                <span className="text-[13px] text-white/15 flex-1">
                  Describe what you want to automate...
                </span>
                <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center">
                  <ArrowRight className="h-3 w-3 text-white/20" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="mt-6 text-center text-[12px] text-white/15">
          ↑ This is a live code animation, not a video. What you see is exactly
          what happens in the product.
        </p>
      </div>
    </section>
  );
}
