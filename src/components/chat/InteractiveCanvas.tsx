"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, Workflow, Link as LinkIcon, Zap, Send } from "lucide-react";

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

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-white/30" />
          <span className="text-white/40 text-[13px] font-semibold tracking-widest uppercase">Live Automation Canvas</span>
        </div>
        
        {hasDeployed && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Live & Active
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex items-center justify-center p-12 custom-scrollbar relative z-0">
        <div className="flex flex-col items-center max-w-sm w-full mx-auto pb-32">
          {nodes.map((node, index) => {
            const isLast = index === nodes.length - 1;
            const isActive = node.status === 'active';
            const isCompleted = node.status === 'completed';
            const isPending = node.status === 'pending';

            return (
              <React.Fragment key={node.id}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", bounce: 0.4 }}
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
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 32 }}
                    className="w-px bg-gradient-to-b from-white/20 to-transparent my-1 relative"
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/20 bg-[#0A0A0A]"></div>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {nodes.length > 0 && nodes.every(n => n.status === "completed") && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent flex justify-center gap-4 z-10"
        >
          <button 
            onClick={onTest}
            disabled={isTesting || hasTested || isDeploying || hasDeployed}
            className="px-6 py-2.5 rounded-lg border border-white/10 bg-[#1A1A1A] text-white hover:bg-[#252525] disabled:opacity-50 transition-colors font-medium text-[14px] flex items-center gap-2"
          >
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayIconMock />}
            {hasTested ? "Test Passed" : isTesting ? "Running Test..." : "Test Automation"}
          </button>
          
          <button 
            onClick={onDeploy}
            disabled={!hasTested || isDeploying || hasDeployed}
            className={`px-6 py-2.5 rounded-lg border flex items-center gap-2 font-medium text-[14px] shadow-lg transition-colors
              ${hasDeployed ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" : ""}
              ${!hasDeployed && !isDeploying && hasTested ? "bg-white text-black border-transparent hover:bg-gray-200" : ""}
              ${!hasTested ? "bg-[#1E1E1E] border-white/5 text-white/30 cursor-not-allowed" : ""}
            `}
          >
            {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : hasDeployed ? <CheckCircle2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {hasDeployed ? "Automation is live" : isDeploying ? "Deploying..." : "Deploy Automation"}
          </button>
        </motion.div>
      )}
    </div>
  );
}

function PlayIconMock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );
}
