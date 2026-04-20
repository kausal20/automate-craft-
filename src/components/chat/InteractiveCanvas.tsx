"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, Workflow, Link as LinkIcon, Zap, Send, Terminal, ShieldCheck, XCircle } from "lucide-react";

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
}

export function InteractiveCanvas({
  nodes,
  onTest,
  onDeploy,
  isDeploying,
  hasDeployed,
  isTesting,
  hasTested
}: InteractiveCanvasProps) {
  
  const getIcon = (type: FlowNode["type"]) => {
    switch (type) {
      case "trigger": return <Zap className="h-5 w-5" />;
      case "process": return <LinkIcon className="h-5 w-5" />;
      case "action": return <Send className="h-5 w-5" />;
      default: return <Workflow className="h-5 w-5" />;
    }
  };

  const [logs, setLogs] = useState<{ id: string; text: string; status: "info" | "success" | "error" }[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTesting) {
      setLogs([]);
      let timeoutIds: NodeJS.Timeout[] = [];
      const steps = [
        { t: "Initializing test environment...", delay: 200, status: "info" as const },
        { t: "Executing Trigger: Form Submission (Simulated)...", delay: 800, status: "success" as const },
        { t: "Processing: AI Analysis API context connected...", delay: 1400, status: "success" as const },
        { t: "Evaluating conditions...", delay: 1900, status: "info" as const },
        { t: "Action: Delivering payload to target destination...", delay: 2200, status: "success" as const },
        { t: "Test completed without errors.", delay: 2500, status: "success" as const }
      ];

      steps.forEach((step) => {
        const id = setTimeout(() => {
          setLogs(prev => [...prev, { id: Math.random().toString(), text: step.t, status: step.status }]);
        }, step.delay);
        timeoutIds.push(id);
      });

      return () => {
        timeoutIds.forEach(clearTimeout);
      };
    }
  }, [isTesting]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#050505] font-sans">
      {/* Enhanced dot grid with center radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.025) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]" />

      {/* Top header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 pointer-events-none">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06]">
            <Workflow className="h-3.5 w-3.5 text-white/30" />
          </div>
          <span className="text-white/35 text-[13px] font-semibold tracking-widest uppercase">Engine Pipeline</span>
        </div>
        
        {hasDeployed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/[0.06] border border-emerald-500/15 text-emerald-400 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium backdrop-blur-sm pointer-events-auto"
          >
            <div className="relative">
              <ShieldCheck className="h-3.5 w-3.5" />
              <motion.div
                className="absolute -inset-1 rounded-full border border-emerald-500/30"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            Live & Active
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center p-12 pt-24 custom-scrollbar relative z-0">
        
        {/* The Node Graph */}
        <div className="flex flex-col items-center max-w-md w-full mx-auto relative">
          <AnimatePresence>
            {nodes.map((node, index) => {
              if (node.status === "pending" && !isTesting && !hasTested && !hasDeployed) {
                return null;
              }

              const isLastVisible = index === nodes.length - 1 || nodes[index + 1]?.status === "pending";
              const isActive = node.status === 'active';
              const isCompleted = node.status === 'completed';

              return (
                <React.Fragment key={node.id}>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`group z-10 flex w-full items-start gap-4 rounded-[18px] border p-5 transition-all duration-300
                      ${isCompleted ? "bg-[#0a0a0a]/80 border-white/[0.06] shadow-[0_4px_32px_rgba(0,0,0,0.4)] hover:border-white/10" : ""}
                      ${isActive ? "bg-[#0c0c0c] border-accent/30 shadow-[0_4px_32px_rgba(59,130,246,0.08)]" : ""}
                    `}
                  >
                    {/* Active glow aura */}
                    {isActive && (
                      <div className="absolute -inset-[1px] rounded-[18px] bg-gradient-to-r from-accent/10 via-transparent to-accent/10 pointer-events-none" />
                    )}
                    {/* Completed subtle green glow */}
                    {isCompleted && (
                      <div className="absolute -top-6 -left-6 h-12 w-12 rounded-full bg-emerald-500/5 blur-[20px] pointer-events-none" />
                    )}

                    <div className={`relative mt-0.5 shrink-0 flex items-center justify-center h-11 w-11 rounded-xl transition-all duration-300
                        ${isCompleted ? "bg-white/[0.03] text-white/50 ring-1 ring-white/[0.06]" : ""}
                        ${isActive ? "bg-accent/15 text-accent ring-1 ring-accent/20" : ""}
                      `}
                    >
                      {isActive ? (
                        <div className="relative">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {/* Orbiting ring */}
                          <motion.div
                            className="absolute -inset-2 rounded-xl border border-accent/20"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                      ) : getIcon(node.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 relative">
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 transition-colors
                        ${isCompleted ? "text-white/30" : ""}
                        ${isActive ? "text-accent" : ""}
                      `}>
                        {node.type}
                      </p>
                      <h3 className={`font-semibold text-[15px] tracking-tight truncate transition-colors ${isCompleted ? "text-white/85" : "text-white"}`}>
                        {node.label}
                      </h3>
                      {node.detail && (
                        <p className={`text-[13px] mt-1.5 leading-relaxed truncate transition-colors ${isCompleted ? "text-white/35" : "text-white/60"}`}>
                          {node.detail}
                        </p>
                      )}
                    </div>
                    
                    <div className="shrink-0 mt-2 flex items-center justify-center h-6 w-6">
                      {isCompleted && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </motion.div>
                      )}
                      {isActive && (
                        <div className="relative">
                          <div className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                          <motion.div
                            className="absolute -inset-1 rounded-full border border-accent/30"
                            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Connector line — animated gradient with flow dot */}
                  {!isLastVisible && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 44 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="relative w-[2px] my-1 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-white/8 to-white/[0.03]" />
                      {/* Flowing dot animation */}
                      <motion.div
                        className="absolute left-1/2 h-3 w-[2px] -translate-x-1/2 bg-gradient-to-b from-accent/60 to-transparent rounded-full"
                        animate={{ top: ["-12px", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
                      />
                      {/* Center node */}
                      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40" />
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Execution Logs Area (Testing State) */}
        <AnimatePresence>
          {(isTesting || hasTested) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-16 w-full max-w-md rounded-[18px] border border-white/[0.06] bg-[#080808] overflow-hidden flex flex-col mb-24 shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="bg-[#0c0c0c] px-4 py-3 border-b border-white/[0.04] flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.03] ring-1 ring-white/[0.06]">
                  <Terminal className="h-3 w-3 text-white/35" />
                </div>
                <span className="text-[12px] font-semibold text-white/40 uppercase tracking-widest">Execution Logs</span>
                {isTesting && <Loader2 className="h-3 w-3 animate-spin text-accent/50 ml-auto" />}
                {hasTested && !isTesting && (
                  <div className="ml-auto flex items-center gap-1.5 text-emerald-400/70">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Complete</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 flex flex-col gap-1.5 min-h-[160px] max-h-[220px] overflow-y-auto font-mono text-[12px] custom-scrollbar">
                {logs.length === 0 && <span className="text-white/15">Waiting for payload...</span>}
                {logs.map((log, i) => (
                   <motion.div 
                     key={log.id} 
                     initial={{ opacity: 0, x: -12 }} 
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ duration: 0.2 }}
                     className="flex items-start gap-2 py-0.5"
                   >
                     <span className="text-white/20 shrink-0 mt-[1px] select-none">{">"}</span>
                     <span className={
                       log.status === "success" ? "text-emerald-400/80" : 
                       log.status === "error" ? "text-red-400/80" : "text-white/55"
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
        
        {/* Placeholder spacer */}
        {(!isTesting && !hasTested) && <div className="h-32" />}

      </div>
    </div>
  );
}
