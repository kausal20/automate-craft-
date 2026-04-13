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
    <div className="flex flex-col h-full w-full bg-[#050505] relative overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-white/30" />
          <span className="text-white/40 text-[13px] font-semibold tracking-widest uppercase">Engine Pipeline</span>
        </div>
        
        {hasDeployed && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4" />
            Live & Active
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center p-12 pt-24 custom-scrollbar relative z-0">
        
        {/* The Node Graph */}
        <div className="flex flex-col items-center max-w-md w-full mx-auto relative">
          <AnimatePresence>
            {nodes.map((node, index) => {
              // Hide pending nodes completely until they are active to feel like step-by-step building
              if (node.status === "pending" && !isTesting && !hasTested && !hasDeployed) {
                // Return null if we want to hide it completely before it is reached
                // Wait, if it's the sequence, we WANT them to pop in one by one. But the chat sequence just sets n2 completed, then n3 active. So they pop in nicely.
                return null;
              }

              const isLastVisible = index === nodes.length - 1 || nodes[index + 1]?.status === "pending";
              const isActive = node.status === 'active';
              const isCompleted = node.status === 'completed';

              return (
                <React.Fragment key={node.id}>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                    className={`w-full rounded-[18px] border p-5 flex items-start gap-4 transition-all duration-500 z-10
                      ${isCompleted ? "bg-[#111111] border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)]" : ""}
                      ${isActive ? "bg-[#18181B] border-accent/40 shadow-[0_0_40px_rgba(79,142,247,0.15)] ring-1 ring-accent/30" : ""}
                    `}
                  >
                    <div className={`mt-0.5 shrink-0 flex items-center justify-center h-11 w-11 rounded-xl
                        ${isCompleted ? "bg-white/5 text-white/50" : ""}
                        ${isActive ? "bg-accent/20 text-accent shadow-inner" : ""}
                      `}
                    >
                      {isActive ? <Loader2 className="h-5 w-5 animate-spin" /> : getIcon(node.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1.5
                        ${isCompleted ? "text-white/40" : ""}
                        ${isActive ? "text-accent" : ""}
                      `}>
                        {node.type}
                      </p>
                      <h3 className={`font-semibold text-[15px] tracking-tight truncate ${isCompleted ? "text-white/90" : "text-white"}`}>
                        {node.label}
                      </h3>
                      {node.detail && (
                        <p className={`text-[13px] mt-1.5 leading-relaxed truncate ${isCompleted ? "text-white/40" : "text-white/70"}`}>
                          {node.detail}
                        </p>
                      )}
                    </div>
                    
                    <div className="shrink-0 mt-2 flex items-center justify-center h-6 w-6">
                      {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      {isActive && <div className="h-2 w-2 rounded-full bg-accent animate-ping" />}
                    </div>
                  </motion.div>

                  {!isLastVisible && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 40 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="w-[2px] bg-gradient-to-b from-white/20 to-white/5 my-1 relative"
                    >
                      <motion.div
                         initial={{ top: 0, opacity: 1 }}
                         animate={{ top: "100%", opacity: 0 }}
                         transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                         className="absolute left-1/2 -translate-x-1/2 w-1.5 h-6 rounded-full bg-accent/80 blur-[1px]"
                      />
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
              className="mt-16 w-full max-w-md rounded-[16px] border border-white/10 bg-[#0A0A0A] overflow-hidden flex flex-col mb-24"
            >
              <div className="bg-[#111] px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-white/40" />
                <span className="text-[12px] font-semibold text-white/50 uppercase tracking-widest">Execution Logs</span>
                {isTesting && <Loader2 className="h-3 w-3 animate-spin text-white/40 ml-auto" />}
              </div>
              
              <div className="p-4 flex flex-col gap-2 min-h-[160px] max-h-[220px] overflow-y-auto font-mono text-[13px] custom-scrollbar">
                {logs.length === 0 && <span className="text-white/20">Waiting for payload...</span>}
                {logs.map((log) => (
                   <motion.div 
                     key={log.id} 
                     initial={{ opacity: 0, x: -10 }} 
                     animate={{ opacity: 1, x: 0 }}
                     className="flex items-start gap-2"
                   >
                     <span className="text-white/30 shrink-0 mt-[1px]">{">"}</span>
                     <span className={
                       log.status === "success" ? "text-emerald-400" : 
                       log.status === "error" ? "text-red-400" : "text-white/70"
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
        
        {/* Placeholder spacer if no logs to keep it centered properly */}
        {(!isTesting && !hasTested) && <div className="h-32" />}

      </div>
    </div>
  );
}
