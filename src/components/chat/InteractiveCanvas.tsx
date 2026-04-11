"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, Workflow, Link as LinkIcon, Zap, Send, BrainCircuit, Terminal } from "lucide-react";

export type FlowNode = {
  id: string;
  type: "trigger" | "process" | "action";
  label: string;
  status: "pending" | "active" | "completed";
  detail?: string;
};

interface InteractiveCanvasProps {
  nodes: FlowNode[];
  canvasState: "understanding" | "building" | "ready" | "testing";
  hasDeployed?: boolean;
}

export function InteractiveCanvas({
  nodes,
  canvasState,
  hasDeployed
}: InteractiveCanvasProps) {
  
  const getIcon = (type: FlowNode["type"]) => {
    switch (type) {
      case "trigger": return <Zap className="h-5 w-5" />;
      case "process": return <LinkIcon className="h-5 w-5" />;
      case "action": return <Send className="h-5 w-5" />;
      default: return <Workflow className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] relative overflow-hidden shrink-0">
      {/* Background Dots */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      {/* Top Bar Area */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-white/30" />
          <span className="text-white/40 text-[13px] font-semibold tracking-widest uppercase">Live Automation Canvas</span>
        </div>
        
        {hasDeployed && canvasState === "ready" && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Live & Active
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex items-center justify-center p-12 custom-scrollbar relative z-0">
        <AnimatePresence mode="wait">
          
          {canvasState === "understanding" && (
            <motion.div 
              key="understanding"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="relative"
              >
                <div className="absolute inset-0 bg-[#3B82F6] blur-[60px] opacity-20 rounded-full"></div>
                <BrainCircuit className="h-16 w-16 text-white/40 relative z-10" strokeWidth={1.5} />
              </motion.div>
              <p className="text-white/30 text-[13px] tracking-[0.2em] uppercase">Listening to chat...</p>
            </motion.div>
          )}

          {canvasState === "building" && (
            <motion.div 
              key="building"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 w-full max-w-sm"
            >
              <div className="w-full h-px bg-white/10 relative overflow-hidden mb-8">
                <motion.div 
                   animate={{ x: ["-100%", "200%"] }}
                   transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                   className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent"
                />
              </div>
              
              <div className="flex gap-4">
                {[1, 2, 3].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ opacity: [0.1, 0.4, 0.1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                    className="h-12 w-12 rounded-xl border border-white/10 bg-white/[0.02]"
                  />
                ))}
              </div>
              <p className="text-[#3B82F6]/60 text-[13px] tracking-[0.2em] mt-8 uppercase font-medium">Assembling Nodes</p>
            </motion.div>
          )}

          {(canvasState === "ready" || canvasState === "testing") && (
            <motion.div 
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center max-w-sm w-full mx-auto"
            >
              {nodes.map((node, index) => {
                const isLast = index === nodes.length - 1;
                const isActive = node.status === 'active';
                const isCompleted = node.status === 'completed';
                const isPending = node.status === 'pending';

                return (
                  <React.Fragment key={node.id}>
                    <motion.div 
                      className={`w-full rounded-xl border p-5 flex items-start gap-4 bg-[#111111] transition-all duration-500 shadow-xl
                        ${isCompleted ? "border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.03)]" : ""}
                        ${isActive ? "border-[#3B82F6]/50 shadow-[0_0_30px_rgba(59,130,246,0.1)] ring-1 ring-[#3B82F6]/50" : ""}
                        ${isPending ? "border-[#222222] opacity-40 shadow-none" : ""}
                      `}
                    >
                      <div className={`mt-0.5 shrink-0 flex items-center justify-center h-10 w-10 rounded-lg
                          ${isCompleted ? "bg-[#222222] text-white" : ""}
                          ${isActive ? "bg-[#3B82F6]/20 text-[#3B82F6]" : ""}
                          ${isPending ? "bg-[#1A1A1A] text-white/20" : ""}
                        `}
                      >
                        {isActive ? <Loader2 className="h-5 w-5 animate-spin" /> : getIcon(node.type)}
                      </div>
                      
                      <div className="flex-1">
                        <p className={`text-[11px] font-bold uppercase tracking-wider mb-1
                          ${isCompleted ? "text-white/40" : ""}
                          ${isActive ? "text-[#3B82F6]" : ""}
                          ${isPending ? "text-white/20" : ""}
                        `}>
                          {node.type} step
                        </p>
                        <h3 className={`font-medium text-[15px] ${isPending ? "text-white/40" : "text-white"}`}>
                          {node.label}
                        </h3>
                        {node.detail && (
                          <p className={`text-[13px] mt-2 leading-relaxed ${isPending ? "text-white/20" : "text-white/60"}`}>
                            {node.detail}
                          </p>
                        )}
                      </div>
                      
                      <div className="shrink-0 mt-0.5">
                        {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                        {isActive && <Circle className="h-5 w-5 text-transparent" />}
                        {isPending && <Circle className="h-5 w-5 text-[#333]" />}
                      </div>
                    </motion.div>

                    {!isLast && (
                      <div className="w-px bg-gradient-to-b from-white/20 to-transparent my-1 relative h-8">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/20 bg-[#0A0A0A]"></div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* TEST LOGS OVERLAY */}
              {canvasState === "testing" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                  className="w-full bg-[#0c0c0c] border border-[#222] rounded-xl overflow-hidden p-4"
                >
                  <div className="flex items-center gap-2 mb-3 border-b border-[#222] pb-3">
                    <Terminal className="h-4 w-4 text-[#3B82F6]" />
                    <span className="text-[12px] font-mono text-white/50 uppercase tracking-wider">Execution Logs</span>
                  </div>
                  <div className="font-mono text-[12px] text-emerald-400/80 leading-relaxed space-y-1.5 flex flex-col">
                    <motion.span initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 0.2}}>→ [Trigger] Payload received</motion.span>
                    <motion.span initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 0.8}}>→ [Process] Analyzed via GPT-4o</motion.span>
                    <motion.span initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 1.4}}>→ [Action] Notification dispatched perfectly</motion.span>
                    <motion.span initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 2.0}} className="text-white mt-2 pt-2 border-t border-[#222]">Simulation complete: 0 errors.</motion.span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
