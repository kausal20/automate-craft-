"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Workflow, Zap, Send, Terminal, Play, Rocket, PanelRightClose, Link as LinkIcon, Activity } from "lucide-react";

export type FlowNode = {
  id: string;
  type: "trigger" | "process" | "action";
  label: string;
  status: "pending" | "active" | "completed";
  detail?: string;
};

interface InteractiveCanvasProps {
  nodes: FlowNode[];
  onTest: () => void;
  onDeploy: () => void;
  isDeploying: boolean;
  hasDeployed: boolean;
  isTesting: boolean;
  hasTested: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function InteractiveCanvas({
  nodes,
  onTest,
  onDeploy,
  isDeploying,
  hasDeployed,
  isTesting,
  hasTested,
  isOpen,
  onClose,
}: InteractiveCanvasProps) {

  const getIcon = (type: FlowNode["type"]) => {
    switch (type) {
      case "trigger": return <Zap className="h-4 w-4" />;
      case "process": return <LinkIcon className="h-4 w-4" />;
      case "action": return <Send className="h-4 w-4" />;
      default: return <Workflow className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: FlowNode["type"]) => {
    switch (type) {
      case "trigger": return "from-amber-500/15 to-amber-500/5 ring-amber-500/15 text-amber-400";
      case "process": return "from-accent/15 to-accent/5 ring-accent/15 text-accent";
      case "action": return "from-violet-500/15 to-violet-500/5 ring-violet-500/15 text-violet-400";
      default: return "from-white/10 to-white/5 ring-white/10 text-white/50";
    }
  };

  const [logs, setLogs] = useState<{ id: string; text: string; status: "info" | "success" | "error" }[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTesting) {
      const timeoutIds: NodeJS.Timeout[] = [];
      const steps = [
        { t: "Initializing test environment...", delay: 200, status: "info" as const },
        { t: "Executing Trigger: Form Submission (Simulated)...", delay: 800, status: "success" as const },
        { t: "Processing: AI Analysis API context connected...", delay: 1400, status: "success" as const },
        { t: "Evaluating conditions...", delay: 1900, status: "info" as const },
        { t: "Action: Delivering payload to target destination...", delay: 2200, status: "success" as const },
        { t: "Test completed without errors.", delay: 2500, status: "success" as const }
      ];

      timeoutIds.push(setTimeout(() => setLogs([]), 0));
      steps.forEach((step) => {
        const id = setTimeout(() => {
          setLogs(prev => [...prev, { id: `${step.delay}-${step.t}`, text: step.t, status: step.status }]);
        }, step.delay);
        timeoutIds.push(id);
      });

      return () => { timeoutIds.forEach(clearTimeout); };
    }
  }, [isTesting]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: "0%", opacity: 0 }}
          animate={{ width: "40%", opacity: 1 }}
          exit={{ width: "0%", opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-full shrink-0 overflow-hidden border-l border-white/[0.04] bg-gradient-to-b from-[#0a0a0c] to-[#060608]"
        >
          <div className="flex h-full w-full flex-col">

            {/* Panel Header */}
            <div className="flex h-[52px] shrink-0 items-center justify-between px-5 border-b border-white/[0.04] bg-[#0a0a0c]/90 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.06]">
                  <Workflow className="h-3.5 w-3.5 text-white/40" />
                </div>
                <span className="text-[13px] font-semibold text-white/55">Workflow Pipeline</span>
              </div>

              <div className="flex items-center gap-2">
                {hasDeployed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1 shadow-[0_0_12px_rgba(52,211,153,0.08)]"
                  >
                    <div className="relative">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                      <motion.div
                        className="absolute -inset-1 rounded-full border border-emerald-400/30"
                        animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Live</span>
                  </motion.div>
                )}
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
                  aria-label="Close panel"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Node Graph */}
            <div className="flex-1 overflow-y-auto px-5 py-8 relative custom-scrollbar">
              {/* Dot grid background */}
              <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "20px 20px" }} />
              {/* Center radial glow — breathing */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04)_0%,transparent_55%)] animate-breathe" />
              {/* Top-left accent wash */}
              <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-accent/[0.04] blur-[60px] pointer-events-none" />

              <div className="relative flex flex-col items-center max-w-sm mx-auto">
                <AnimatePresence>
                  {nodes.map((node, index) => {
                    if (node.status === "pending" && !isTesting && !hasTested && !hasDeployed) {
                      return null;
                    }

                    const isLastVisible = index === nodes.length - 1 || nodes[index + 1]?.status === "pending";
                    const isActive = node.status === "active";
                    const isCompleted = node.status === "completed";
                    const typeColor = getTypeColor(node.type);

                    return (
                      <React.Fragment key={node.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 16, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.35, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                          className="w-full group"
                        >
                          {/* 3D Card with shadow layer */}
                          <div className="relative">
                            {isActive && (
                              <div className="absolute -inset-1 rounded-2xl bg-blue-500/20 blur-xl animate-pulse pointer-events-none" />
                            )}
                            <div className={`node-card relative z-10 flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-[2px] ${
                              isActive
                                ? "border-blue-500/40 bg-gradient-to-br from-[#0f1520] via-[#0d1018] to-[#0a0c10] shadow-[0_0_30px_rgba(59,130,246,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]"
                                : isCompleted
                                  ? "border-white/[0.06] bg-gradient-to-br from-[#0f0f11] to-[#0a0a0c] shadow-[0_6px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]"
                                  : "border-white/[0.04] bg-[#0a0a0a]"
                            }`}>
                              {/* Node icon with type-specific gradient */}
                              <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${typeColor} ring-1 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all`}>
                                {isActive ? (
                                  <div className="relative">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                                    <motion.div
                                      className="absolute -inset-3 rounded-xl border border-blue-500/30"
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                    />
                                  </div>
                                ) : getIcon(node.type)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5 ${
                                  isActive ? "text-blue-400/80" : "text-white/20"
                                }`}>
                                  {node.type}
                                </p>
                                <p className={`text-[14px] font-semibold truncate ${isCompleted ? "text-white/80" : "text-white/90"}`}>
                                  {node.label}
                                </p>
                                {node.detail && (
                                  <p className="text-[12px] text-white/30 mt-0.5 truncate">{node.detail}</p>
                                )}
                              </div>

                              {/* Status indicator */}
                              <div className="shrink-0">
                                {isCompleted && (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/15">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                    </div>
                                  </motion.div>
                                )}
                                {isActive && (
                                  <div className="relative flex h-7 w-7 items-center justify-center">
                                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                                    <motion.div
                                      className="absolute inset-0 rounded-full border border-blue-500/30"
                                      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Connector with flowing particle + glow */}
                        {!isLastVisible && (
                          <div className="relative h-10 w-px my-1 overflow-hidden z-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-white/[0.03]" />
                            {(isActive || isTesting || (nodes[index + 1]?.status === "active")) && (
                              <motion.div
                                className="absolute left-1/2 h-5 w-[2px] -translate-x-1/2 bg-gradient-to-b from-blue-500 via-blue-400 to-transparent rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                                animate={{ top: ["-20px", "100%"] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: "linear", repeatDelay: 0.1 }}
                              />
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Execution Logs */}
              <AnimatePresence>
                {(isTesting || hasTested) && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-8 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#0c0c0c] to-[#080808] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]"
                  >
                    <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-white/[0.06]">
                        <Terminal className="h-3 w-3 text-white/35" />
                      </div>
                      <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Execution Logs</span>
                      {isTesting && (
                        <div className="ml-auto flex items-center gap-1.5">
                          <Activity className="h-3 w-3 text-accent/50 animate-pulse" />
                          <Loader2 className="h-3 w-3 animate-spin text-accent/40" />
                        </div>
                      )}
                      {hasTested && !isTesting && (
                        <div className="ml-auto flex items-center gap-1.5 text-emerald-400/60">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">Complete</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex flex-col gap-1.5 max-h-[200px] overflow-y-auto font-mono text-[11px] custom-scrollbar">
                      {logs.length === 0 && <span className="text-white/12">Waiting for payload...</span>}
                      {logs.map((log) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-start gap-2 py-0.5"
                        >
                          <span className="text-white/15 shrink-0 select-none mt-[1px]">{"›"}</span>
                          <span className={
                            log.status === "success" ? "text-emerald-400/70" :
                            log.status === "error" ? "text-red-400/70" : "text-white/40"
                          }>
                            {log.text}
                          </span>
                        </motion.div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Panel Footer — Test / Deploy */}
            <div className="shrink-0 border-t border-white/[0.04] bg-[#0a0a0c]/90 backdrop-blur-md px-5 py-4 flex items-center gap-3">
              {/* Test button */}
              <button
                onClick={onTest}
                disabled={isTesting || hasTested || isDeploying || hasDeployed}
                className="group relative flex items-center gap-2 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-5 py-3 text-[13px] font-semibold text-white transition-all duration-200 hover:border-white/[0.15] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-25 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-white/50" />}
                Test
              </button>

              {/* Deploy button — PRIMARY FOCUS POINT with glow */}
              <button
                onClick={onDeploy}
                disabled={!hasTested || isDeploying || hasDeployed}
                className={`group relative flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13px] font-bold transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed disabled:translate-y-0 overflow-hidden ${
                  hasDeployed
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                    : "bg-gradient-to-r from-accent to-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3),0_1px_0_rgba(255,255,255,0.15)_inset] hover:shadow-[0_8px_30px_rgba(59,130,246,0.4)] hover:translate-y-[-1px] active:translate-y-[1px]"
                }`}
              >
                {/* Shine */}
                {!hasDeployed && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                )}
                {isDeploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                {hasDeployed ? "Deployed ✓" : "Deploy Live"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
