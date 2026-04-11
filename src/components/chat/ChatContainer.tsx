"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, TerminalSquare, ChevronDown, Home, Settings2, Box, Cpu, CheckCircle2, Zap, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { InteractiveCanvas, type FlowNode } from "./InteractiveCanvas";

// --------------
// MESSAGE CARDS
// --------------

function UserMessage({ content }: { content: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full justify-end mb-6"
    >
      <div className="bg-[#121212] border border-[#222] text-white rounded-[18px] p-3.5 max-w-[85%] text-[14px] shadow-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </motion.div>
  );
}

function AiMessage({ content }: { content: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full justify-start mb-6"
    >
      <div className="text-gray-100 max-w-[95%] text-[14px] leading-relaxed whitespace-pre-wrap py-1">
        {content}
      </div>
    </motion.div>
  );
}

function CustomSetupCard({ onComplete }: { onComplete: (msg: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className="flex w-full justify-start mb-6"
    >
      <div className="w-full max-w-[95%] rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
            <Settings2 className="h-4 w-4 text-[#3B82F6]" />
          </div>
          <h3 className="font-semibold text-white/90 text-[15px]">Configure your automation</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2 block">Action Payload Details</label>
            <input 
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="e.g. Include user email and phone..." 
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-[#3B82F6]/50 transition-colors"
            />
          </div>
          
          <button 
            onClick={() => onComplete(val || "Default Payload configuration")}
            className="w-full bg-white text-black font-semibold rounded-xl py-3 text-[14px] hover:bg-gray-200 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CustomProgressCard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className="flex w-full justify-start mb-6"
    >
      <div className="w-full max-w-[95%] rounded-2xl border border-[#3B82F6]/20 bg-[#3B82F6]/5 p-5 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
            <Cpu className="h-4 w-4 text-[#3B82F6]" />
          </div>
          <h3 className="font-semibold text-white/90 text-[15px]">Building your automation...</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[13px] text-white/60">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Parsed Context
          </div>
          <div className="flex items-center gap-3 text-[13px] text-white/60">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Trigger Configured
          </div>
          <div className="flex items-center gap-3 text-[13px] text-[#3B82F6] font-medium">
            <div className="h-4 w-4 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" /> Wiring Output Actions
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CustomReadyCard({ 
  onTest, 
  onDeploy, 
  onModify,
  isTesting,
  hasTested,
  isDeploying,
  hasDeployed
}: { 
  onTest:()=>void; onDeploy:()=>void; onModify:()=>void; 
  isTesting:boolean; hasTested:boolean; isDeploying:boolean; hasDeployed:boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className="flex w-full justify-start mb-6"
    >
      <div className="w-full max-w-[95%] rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold text-white/90 text-[15px]">Automation is ready</h3>
            <span className="text-[12px] text-emerald-400 font-medium">Pipeline successfully generated</span>
          </div>
        </div>

        <div className="bg-[#050505] rounded-xl p-3 border border-white/5 mb-5 space-y-2">
          <div className="text-[12px] text-white/50 flex justify-between"><span>Trigger:</span> <span className="text-white">Form Submission</span></div>
          <div className="text-[12px] text-white/50 flex justify-between"><span>Process:</span> <span className="text-white">AI Analysis</span></div>
          <div className="text-[12px] text-white/50 flex justify-between"><span>Action:</span> <span className="text-white">Send Notification</span></div>
        </div>
        
        <div className="flex flex-col gap-2">
          <button 
            onClick={onTest} disabled={isTesting || hasTested || isDeploying || hasDeployed}
            className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] border border-white/10 text-white font-medium rounded-xl py-2.5 text-[13px] hover:bg-[#252525] disabled:opacity-50 transition-colors"
          >
            {hasTested ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Box className="h-4 w-4" />}
            {hasTested ? "Test Passed" : isTesting ? "Testing..." : "Test Workflow"}
          </button>
          
          <button 
            onClick={onDeploy} disabled={!hasTested || isDeploying || hasDeployed}
            className={`w-full flex items-center justify-center gap-2 font-medium rounded-xl py-2.5 text-[13px] transition-colors
              ${hasDeployed ? "bg-emerald-500/20 text-emerald-500 pointer-events-none" : "bg-white text-black hover:bg-gray-200 disabled:opacity-30"}
            `}
          >
            {hasDeployed ? "Live & Active" : isDeploying ? "Deploying..." : "Deploy Automation"}
          </button>

          <button 
            onClick={onModify} disabled={isDeploying}
            className="w-full flex items-center justify-center gap-2 bg-transparent text-white/40 font-medium rounded-xl py-2 text-[12px] mt-1 hover:text-white/80 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Modify Workflow
          </button>
        </div>
      </div>
    </motion.div>
  );
}


// --------------
// CORE CONTAINER
// --------------

type Message = {
  id: string;
  role: "user" | "ai" | "system" | "ui_setup" | "ui_progress" | "ui_ready";
  content: string;
};

type ChatSequenceStep = "boot" | "wait_message" | "ready" | "deployed";
type WorkspaceState = "understanding" | "collecting_inputs" | "ready_to_build" | "canvas_visible";

interface ChatContainerProps {
  chatId: string;
  initialPrompt?: string;
}

const stopWords = ["the", "a", "an", "is", "for", "to", "when", "on", "and", "in", "it"];
function generateTitle(prompt: string): string {
  if (!prompt) return "New Automation";
  const words = prompt.split(" ").filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));
  if (words.length === 0) return "New Automation";
  const titleWords = words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return titleWords.join(" ");
}

export function ChatContainer({ chatId, initialPrompt }: ChatContainerProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [chatTitle] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`chat_${chatId}`);
      if (saved && JSON.parse(saved).chatTitle) return JSON.parse(saved).chatTitle;
    }
    return generateTitle(initialPrompt || "");
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`chat_${chatId}`);
      if (saved) return JSON.parse(saved).messages;
    }
    return initialPrompt 
      ? [
          { id: "init-user", role: "user", content: initialPrompt },
          { id: "init-sys", role: "system", content: "Understanding your automation..." }
        ]
      : [];
  });

  const [step, setStep] = useState<ChatSequenceStep>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`chat_${chatId}`);
      if (saved) return JSON.parse(saved).step;
    }
    return "boot";
  });

  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`chat_${chatId}`);
      if (saved) return JSON.parse(saved).workspaceState;
    }
    return "understanding";
  });
  
  const [nodes, setNodes] = useState<FlowNode[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`chat_${chatId}`);
      if (saved) return JSON.parse(saved).nodes;
    }
    return [
      { id: "n1", type: "trigger", label: "Form Submission", status: "completed", detail: "Awaiting incoming form data" },
      { id: "n2", type: "process", label: "AI Analysis", status: "pending" },
      { id: "n3", type: "action", label: "Send Notification", status: "pending" }
    ];
  });

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Canvas State tracking
  const [isTesting, setIsTesting] = useState(false);
  const [hasTested, setHasTested] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hasDeployed, setHasDeployed] = useState(false);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, step, workspaceState, isTesting, hasTested, isDeploying, hasDeployed]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `chat_${chatId}`,
        JSON.stringify({ messages, step, workspaceState, nodes, chatTitle })
      );
    }
  }, [messages, step, workspaceState, nodes, chatTitle, chatId]);

  const addMessage = (role: Message["role"], content: string) => {
    setMessages(p => [...p, { id: Math.random().toString(36).substring(7), role, content }]);
  };

  const removeMessageByRole = (role: Message["role"]) => {
    setMessages(p => p.filter(m => m.role !== role));
  };

  // 1. Initial boot hook
  useEffect(() => {
    const isInitialBoot = step === "boot" && workspaceState === "understanding";
    if (!isInitialBoot) return;

    const runBootSequence = async () => {
      setNodes(n => n.map(x => x.id === "n2" ? { ...x, status: "active" } : x));
      
      await new Promise(r => setTimeout(r, 2000)); // Artificial understanding delay
      
      removeMessageByRole("system");
      setWorkspaceState("collecting_inputs");
      addMessage("ai", "I've structured the base nodes. Let's configure the specific payload required to execute this.");
      addMessage("ui_setup", "card");
      setStep("wait_message");
    };

    runBootSequence();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Setup Card Complete
  const handleSetupComplete = async (payloadDetails: string) => {
    removeMessageByRole("ui_setup");
    addMessage("user", payloadDetails);
    
    setWorkspaceState("ready_to_build");
    addMessage("ui_progress", "card");
    
    await new Promise(r => setTimeout(r, 3000));
    
    removeMessageByRole("ui_progress");
    setWorkspaceState("canvas_visible");
    
    setNodes(n => n.map(x => x.id === "n2" ? { ...x, status: "completed", detail: "Logic parsed" } : x));
    setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "completed", detail: payloadDetails } : x));
    
    addMessage("ui_ready", "card");
    setStep("ready");
  };

  // 3. Action Handlers Flow
  const handleTest = async () => {
    setIsTesting(true);
    await new Promise(r => setTimeout(r, 2500));
    setIsTesting(false);
    setHasTested(true);
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsDeploying(false);
    setHasDeployed(true);
    setStep("deployed");
    addMessage("ai", "Automation is live! It is now actively listening for incoming triggers and processing live data.");
  };

  const handleModify = () => {
    removeMessageByRole("ui_ready");
    setHasTested(false);
    setHasDeployed(false);
    setStep("boot");
    setWorkspaceState("understanding");
    addMessage("ai", "I'm ready to restructure the pipeline. Let me know what you'd like to change.");
  };

  // Chat Input Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const input = inputText.trim();
    setInputText("");
    addMessage("user", input);

    if (step === "ready" || step === "deployed") {
      await new Promise(r => setTimeout(r, 500));
      addMessage("ai", "Noted. Flow updates received.");
      handleModify(); // Recycles flow
    } else if (step === "wait_message") {
      // If user types instead of clicking setup continue
      handleSetupComplete(input);
    }
  };

  const isInputDisabled = workspaceState === "ready_to_build" || workspaceState === "understanding";
  
  // Compute exactly what visual state the canvas should render
  const computeCanvasState = () => {
    if (isTesting) return "testing";
    if (workspaceState === "understanding" || workspaceState === "collecting_inputs") return "understanding";
    if (workspaceState === "ready_to_build") return "building";
    return "ready";
  };

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden relative justify-start">
      
      {/* 40% CHAT PANE - Permanently mounted */}
      <div className="relative flex flex-col z-20 shadow-2xl h-full border-white/5 border-r w-[40%] min-w-[360px] max-w-[500px] bg-[#0c0c0c]">
        
        {/* Chat Header */}
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#222] px-6 sticky top-0 z-20 bg-[#0c0c0c]">
          <div className="relative flex items-center" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 -ml-2 text-white/80 hover:bg-white/5 transition-colors focus:outline-none"
            >
              <TerminalSquare className="h-4 w-4 text-white/50" />
              <span className="text-[14px] font-semibold tracking-wide">
                {chatTitle}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-white/40 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-[#222] bg-[#1a1a1a] shadow-2xl overflow-hidden py-1 z-50"
                >
                  <a href="/" className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                    <Home className="h-4 w-4 text-white/40" />
                    Go to Homepage
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto px-6 pb-28 pt-6 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <React.Fragment key={msg.id}>
                {msg.role === "user" && <UserMessage content={msg.content} />}
                {msg.role === "ai" && <AiMessage content={msg.content} />}
                {msg.role === "ui_setup" && <CustomSetupCard onComplete={handleSetupComplete} />}
                {msg.role === "ui_progress" && <CustomProgressCard />}
                {msg.role === "ui_ready" && (
                  <CustomReadyCard 
                    onTest={handleTest} onDeploy={handleDeploy} onModify={handleModify}
                    isTesting={isTesting} hasTested={hasTested} isDeploying={isDeploying} hasDeployed={hasDeployed}
                  />
                )}
              </React.Fragment>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-4 shrink-0" />
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c] to-transparent pt-12 pb-6 px-6 z-10 pointer-events-none">
          <form 
            onSubmit={(e) => handleSubmit(e)}
            className={`w-full flex items-center gap-3 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] pl-4 pr-1.5 py-1.5 shadow-xl transition-all pointer-events-auto
              ${isInputDisabled ? "opacity-50" : "focus-within:border-[#444] focus-within:bg-[#1f1f1f]"}
            `}
            onClick={() => !isInputDisabled && document.getElementById('chat-input')?.focus()}
          >
            <input
              id="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isInputDisabled ? "Thinking..." : "Type your response..."}
              disabled={isInputDisabled}
              className="flex-1 h-10 bg-transparent text-[14px] text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isInputDisabled}
              className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl bg-white text-black disabled:opacity-30 disabled:bg-white/10 disabled:text-white transition-all focus:outline-none"
            >
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>

      {/* 60% RIGHT PANE - LIVE CANVAS */}
      <div className="flex-1 flex flex-col relative z-0 h-full border-l border-white/5">
        <InteractiveCanvas
          nodes={nodes}
          hasDeployed={hasDeployed}
          canvasState={computeCanvasState()}
        />
      </div>

    </div>
  );
}
