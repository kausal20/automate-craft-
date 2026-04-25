"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, ArrowRight, CheckCircle2, Loader2, Rocket,
  FlaskConical, MessageSquare, PanelRightOpen, Eye,
} from "lucide-react";
import Image from "next/image";

/* ─── Phase machine ─── */
type Phase =
  | "typing"        // 1. User types prompt
  | "ai-question"   // 2. AI asks clarifying question
  | "user-answer"   // 3. User answers
  | "thinking"      // 4. AI processes
  | "panel-open"    // 5. Side panel slides open with preview
  | "building"      // 6. Building progress
  | "ready"         // 7. Test & Deploy
  | "deployed"      // 8. Live
  | "pause";        // 9. Reset loop

const PROMPT = "Notify my team on Slack when a support ticket is marked urgent";
const AI_QUESTION = "Which Slack channel should I send urgent ticket alerts to?";
const USER_ANSWER = "#support-escalations";

const THINKING_STEPS = [
  "Mapping ticket webhook trigger",
  "Configuring Slack integration",
  "Building filter: priority = urgent",
  "Generating message template",
];

const PREVIEW_NODES = [
  { label: "Webhook Trigger", sub: "On ticket.updated", color: "text-amber-400", bg: "bg-amber-400/10" },
  { label: "Filter", sub: "priority == urgent", color: "text-rose-400", bg: "bg-rose-400/10" },
  { label: "Slack Message", sub: "#support-escalations", color: "text-blue-400", bg: "bg-blue-400/10" },
];

export default function LoginDemoPlayer() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);
  const [aiTyped, setAiTyped] = useState(0);
  const [ansTyped, setAnsTyped] = useState(0);
  const [thinkStep, setThinkStep] = useState(0);
  const [buildPct, setBuildPct] = useState(0);
  const [nodesVisible, setNodesVisible] = useState(0);

  const reset = useCallback(() => {
    setPhase("typing"); setTyped(0); setAiTyped(0); setAnsTyped(0);
    setThinkStep(0); setBuildPct(0); setNodesVisible(0);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [phase, typed, aiTyped, ansTyped, thinkStep, buildPct, nodesVisible]);

  // 1. Typing prompt
  useEffect(() => {
    if (phase !== "typing") return;
    if (typed >= PROMPT.length) { const t = setTimeout(() => setPhase("ai-question"), 500); return () => clearTimeout(t); }
    const t = setTimeout(() => setTyped(c => c + 1), 28);
    return () => clearTimeout(t);
  }, [phase, typed]);

  // 2. AI question typewriter
  useEffect(() => {
    if (phase !== "ai-question") return;
    if (aiTyped >= AI_QUESTION.length) { const t = setTimeout(() => setPhase("user-answer"), 800); return () => clearTimeout(t); }
    const t = setTimeout(() => setAiTyped(c => c + 1), 22);
    return () => clearTimeout(t);
  }, [phase, aiTyped]);

  // 3. User answer typewriter
  useEffect(() => {
    if (phase !== "user-answer") return;
    if (ansTyped >= USER_ANSWER.length) { const t = setTimeout(() => setPhase("thinking"), 500); return () => clearTimeout(t); }
    const t = setTimeout(() => setAnsTyped(c => c + 1), 45);
    return () => clearTimeout(t);
  }, [phase, ansTyped]);

  // 4. Thinking steps
  useEffect(() => {
    if (phase !== "thinking") return;
    if (thinkStep >= THINKING_STEPS.length) { const t = setTimeout(() => setPhase("panel-open"), 400); return () => clearTimeout(t); }
    const t = setTimeout(() => setThinkStep(s => s + 1), 450);
    return () => clearTimeout(t);
  }, [phase, thinkStep]);

  // 5. Panel open + nodes appear
  useEffect(() => {
    if (phase !== "panel-open") return;
    if (nodesVisible >= PREVIEW_NODES.length) { const t = setTimeout(() => setPhase("building"), 600); return () => clearTimeout(t); }
    const t = setTimeout(() => setNodesVisible(n => n + 1), 500);
    return () => clearTimeout(t);
  }, [phase, nodesVisible]);

  // 6. Building
  useEffect(() => {
    if (phase !== "building") return;
    if (buildPct >= 100) { const t = setTimeout(() => setPhase("ready"), 300); return () => clearTimeout(t); }
    const t = setTimeout(() => setBuildPct(p => Math.min(p + 8, 100)), 50);
    return () => clearTimeout(t);
  }, [phase, buildPct]);

  // 7. Ready -> Deployed
  useEffect(() => { if (phase === "ready") { const t = setTimeout(() => setPhase("deployed"), 2000); return () => clearTimeout(t); } }, [phase]);
  // 8. Deployed -> Pause
  useEffect(() => { if (phase === "deployed") { const t = setTimeout(() => setPhase("pause"), 2500); return () => clearTimeout(t); } }, [phase]);
  // 9. Pause -> Restart
  useEffect(() => { if (phase === "pause") { const t = setTimeout(() => reset(), 1500); return () => clearTimeout(t); } }, [phase, reset]);

  const showPanel = ["panel-open","building","ready","deployed","pause"].includes(phase);
  const pastThinking = ["panel-open","building","ready","deployed","pause"].includes(phase);
  const pastAnswer = ["thinking","panel-open","building","ready","deployed","pause"].includes(phase);
  const pastQuestion = ["user-answer","thinking","panel-open","building","ready","deployed","pause"].includes(phase);

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-xl border border-white/[0.04]">

      {/* Main layout: chat + side panel */}
      <div className="relative z-10 flex h-full w-full flex-col">
        {/* Label */}
        <div className="shrink-0 pt-4 pb-2 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent/[0.06] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.24em] text-accent">
            Live Preview
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 flex min-h-0 px-4 pb-3 gap-0">
          {/* ═══ LEFT: Chat panel ═══ */}
          <motion.div
            animate={{ flex: showPanel ? "0 0 48%" : "1 1 100%" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col min-h-0 min-w-0"
          >
            {/* Chrome bar */}
            <div className="rounded-t-lg border border-white/[0.06] border-b-0 bg-[#111] px-2.5 py-1.5 flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-white/8" />
                <div className="h-1.5 w-1.5 rounded-full bg-white/8" />
                <div className="h-1.5 w-1.5 rounded-full bg-white/8" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1 rounded bg-white/[0.03] px-2 py-0.5 text-[8px] text-white/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/40" />
                  app.automatecraft.com
                </div>
              </div>
            </div>

            {/* Chat body */}
            <div className="rounded-b-lg border border-white/[0.06] bg-[#0a0a0c] flex-1 flex flex-col min-h-0 overflow-hidden">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-hide">

                {/* 1. User prompt */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5 max-w-[92%]">
                    <p className="text-[10px] leading-relaxed text-white/80">
                      {PROMPT.slice(0, typed)}
                      {phase === "typing" && <span className="inline-block w-[1.5px] h-[11px] bg-accent ml-0.5 mb-[-2px] animate-pulse" />}
                    </p>
                  </div>
                </div>

                {/* 2. AI asks question */}
                <AnimatePresence>
                  {phase !== "typing" && (
                    <motion.div key="ai-q" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-1.5">
                      <div className="shrink-0 h-5 w-5 rounded-full bg-[#111] border border-white/[0.06] flex items-center justify-center overflow-hidden mt-0.5">
                        <Image src="/logo-new.png" alt="AI" width={12} height={12} className="opacity-70" style={{ width: "auto", height: "auto" }} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Question bubble */}
                        <div className="rounded-2xl rounded-bl-md bg-accent/[0.04] border border-accent/[0.08] px-2.5 py-1.5">
                          <div className="flex items-center gap-1 mb-1">
                            <MessageSquare className="h-2.5 w-2.5 text-accent/50" />
                            <span className="text-[8px] font-bold uppercase tracking-wider text-accent/40">Follow-up</span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-white/70">
                            {AI_QUESTION.slice(0, aiTyped)}
                            {phase === "ai-question" && <span className="inline-block w-[1.5px] h-[11px] bg-accent/60 ml-0.5 mb-[-2px] animate-pulse" />}
                          </p>
                        </div>

                        {/* Thinking (after answer) */}
                        {phase === "thinking" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-white/[0.05] bg-[#0e0e10] p-2.5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Loader2 className="h-2.5 w-2.5 text-accent animate-spin" />
                              <span className="text-[10px] font-semibold text-white/50">Building your automation</span>
                            </div>
                            <div className="space-y-0.5">
                              {THINKING_STEPS.map((step, i) => (
                                <div key={step} className="flex items-center gap-1.5">
                                  {i < thinkStep ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" /> :
                                    <div className="h-2.5 w-2.5 flex items-center justify-center"><div className="h-1 w-1 rounded-full bg-accent/40 animate-pulse" /></div>}
                                  <span className={`text-[9px] ${i < thinkStep ? "text-white/35" : "text-white/15"}`}>{step}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {/* Panel opened message */}
                        {pastThinking && (
                          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] px-2.5 py-2">
                            <PanelRightOpen className="h-3 w-3 text-emerald-400" />
                            <span className="text-[9px] text-emerald-400/80 font-medium">Workflow preview opened →</span>
                          </motion.div>
                        )}

                        {/* Building progress */}
                        {phase === "building" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-white/[0.05] bg-[#0e0e10] p-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Loader2 className="h-2.5 w-2.5 text-accent animate-spin" />
                              <span className="text-[10px] font-semibold text-white/50">Configuring workflow</span>
                              <span className="ml-auto text-[8px] font-mono text-white/12">{buildPct}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.03] overflow-hidden">
                              <div className="h-full bg-accent/50 rounded-full transition-all" style={{ width: `${buildPct}%` }} />
                            </div>
                          </motion.div>
                        )}

                        {/* Ready / Deploy */}
                        {(phase === "ready" || phase === "deployed" || phase === "pause") && (
                          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-white/[0.05] bg-[#0e0e10] p-2.5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3 text-accent" />
                                <span className="text-[10px] font-semibold text-white/80">Automation ready</span>
                              </div>
                              <div className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider ${
                                (phase === "deployed" || phase === "pause")
                                  ? "bg-emerald-400/8 text-emerald-400 border border-emerald-400/15"
                                  : "bg-accent/8 text-accent/70 border border-accent/15"
                              }`}>
                                <div className={`h-1 w-1 rounded-full ${(phase === "deployed" || phase === "pause") ? "bg-emerald-400 animate-pulse" : "bg-accent"}`} />
                                {(phase === "deployed" || phase === "pause") ? "Live" : "Ready"}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[8px] font-semibold ${
                                (phase === "deployed" || phase === "pause")
                                  ? "border border-emerald-500/12 bg-emerald-500/[0.04] text-emerald-400/60"
                                  : "border border-white/[0.05] bg-white/[0.02] text-white/30"
                              }`}>
                                {(phase === "deployed" || phase === "pause") ? <><CheckCircle2 className="h-2.5 w-2.5" /> Passed</> : <><FlaskConical className="h-2.5 w-2.5" /> Test</>}
                              </div>
                              <motion.div className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[8px] font-semibold ${
                                (phase === "deployed" || phase === "pause") ? "bg-emerald-500 text-white" : "bg-accent text-white"
                              }`} animate={phase === "ready" ? { scale: [1, 1.03, 1] } : {}} transition={{ duration: 1.2, repeat: Infinity }}>
                                <Rocket className="h-2.5 w-2.5" />
                                {(phase === "deployed" || phase === "pause") ? "Live!" : "Deploy"}
                              </motion.div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3. User answer */}
                {pastQuestion && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                    <div className="rounded-2xl rounded-br-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5 max-w-[85%]">
                      <p className="text-[10px] leading-relaxed text-white/80 font-mono">
                        {phase === "user-answer" ? (
                          <>{USER_ANSWER.slice(0, ansTyped)}<span className="inline-block w-[1.5px] h-[11px] bg-accent ml-0.5 mb-[-2px] animate-pulse" /></>
                        ) : USER_ANSWER}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input bar */}
              <div className="border-t border-white/[0.03] px-2.5 py-1.5 shrink-0">
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5">
                  <span className="text-[9px] text-white/12 flex-1">Describe your automation...</span>
                  <div className="h-4 w-4 rounded-full bg-white/[0.05] flex items-center justify-center">
                    <ArrowRight className="h-2 w-2 text-white/15" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══ RIGHT: Side panel (slides in) ═══ */}
          <AnimatePresence>
            {showPanel && (
              <motion.div
                key="side-panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "52%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col min-h-0 ml-1.5 overflow-hidden"
              >
                {/* Panel chrome */}
                <div className="rounded-t-lg border border-white/[0.06] border-b-0 bg-[#0d0d10] px-2.5 py-1.5 flex items-center gap-2 shrink-0">
                  <Eye className="h-3 w-3 text-accent/50" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-white/30">Workflow Preview</span>
                  <div className="ml-auto flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/50" />
                    <span className="text-[7px] text-emerald-400/50 font-medium">Live</span>
                  </div>
                </div>

                {/* Panel body */}
                <div className="rounded-b-lg border border-white/[0.06] bg-[#08080b] flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                    {/* Title */}
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-white/60">Urgent Ticket → Slack Alert</p>
                      <p className="text-[8px] text-white/20 mt-0.5">3 nodes · Webhook trigger</p>
                    </div>

                    {/* Flow nodes */}
                    {PREVIEW_NODES.map((node, i) => (
                      <AnimatePresence key={node.label}>
                        {i < nodesVisible && (
                          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                            {/* Connector line */}
                            {i > 0 && (
                              <div className="flex justify-center -mt-1 mb-1">
                                <div className="w-px h-4 bg-white/[0.06] relative">
                                  <motion.div className="absolute inset-x-0 top-0 w-px bg-accent/30"
                                    initial={{ height: 0 }} animate={{ height: "100%" }} transition={{ duration: 0.3 }} />
                                </div>
                              </div>
                            )}
                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 hover:border-white/[0.1] transition-colors">
                              <div className="flex items-center gap-2">
                                <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${node.bg}`}>
                                  <Zap className={`h-3 w-3 ${node.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] font-semibold text-white/70">{node.label}</p>
                                  <p className="text-[8px] text-white/25 font-mono truncate">{node.sub}</p>
                                </div>
                                <CheckCircle2 className="h-3 w-3 text-emerald-400/40 shrink-0" />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ))}

                    {/* Config summary */}
                    {(phase === "building" || phase === "ready" || phase === "deployed" || phase === "pause") && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-xl border border-white/[0.04] bg-white/[0.01] p-2.5">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-white/20 mb-1.5">Configuration</p>
                        <div className="space-y-1">
                          {[
                            { k: "Channel", v: "#support-escalations" },
                            { k: "Filter", v: "priority == urgent" },
                            { k: "Message", v: "🚨 {{ticket.title}} from {{customer}}" },
                          ].map(item => (
                            <div key={item.k} className="flex items-center gap-2">
                              <span className="text-[8px] text-white/25 w-12 shrink-0">{item.k}</span>
                              <span className="text-[8px] text-white/50 font-mono truncate">{item.v}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Test results */}
                    {(phase === "deployed" || phase === "pause") && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-2 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-[9px] font-semibold text-emerald-400/80">Test passed</span>
                        </div>
                        <p className="text-[8px] text-emerald-400/40 font-mono">
                          → Message delivered to #support-escalations in 1.2s
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Caption */}
        <p className="text-center text-[8px] text-white/8 pb-2 shrink-0">
          ↑ This is exactly how the product works
        </p>
      </div>
    </div>
  );
}
