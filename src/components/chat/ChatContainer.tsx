"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ChevronDown, CheckCircle2, Home, Star, PenLine, Paperclip, Mic, X, Sparkles, Copy, Check, Pencil, Lightbulb, TrendingUp, Zap, MessageSquarePlus, Workflow, Mail, FileSpreadsheet } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { InteractiveCanvas, type FlowNode } from "./InteractiveCanvas";
import { FormCard, type FieldDef } from "./FormCard";
import { ProgressCard } from "./ProgressCard";
import { ReadyCard } from "./ReadyCard";

type FormDef = {
  title: string;
  description: string;
  fields: FieldDef[];
};

type Message = {
  id: string;
  role: "user" | "ai" | "system" | "thinking";
  content: string;
  state?: WorkspaceState;
  form?: FormDef;
  isReadyCard?: boolean;
  isFormSubmitted?: boolean;
  formValues?: Record<string, any>;
  timestamp?: number;
};

type ChatSequenceStep = "boot" | "wait_message" | "ready" | "deployed";
type WorkspaceState = "understanding" | "collecting_inputs" | "ready_to_build" | "canvas_visible";

interface ChatContainerProps {
  chatId: string;
  initialPrompt?: string;
}

type ChatIndexEntry = {
  chatId: string;
  title: string;
  updatedAt: string;
  isStarred: boolean;
};

const CHAT_INDEX_KEY = "chat_index_v1";

function readChatIndex(): ChatIndexEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ChatIndexEntry[]) : [];
  } catch {
    return [];
  }
}

function writeChatIndex(next: ChatIndexEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_INDEX_KEY, JSON.stringify(next));
    // storage doesn't fire in same tab; emit for realtime UI.
    window.dispatchEvent(new Event("chat-index-updated"));
  } catch {
    // ignore
  }
}

const stopWords = ["the", "a", "an", "is", "for", "to", "when", "on", "and", "in", "it"];
function generateTitle(prompt: string): string {
  const normalizedPrompt = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  if (!normalizedPrompt.trim()) return "New Automation";
  if (normalizedPrompt.includes("whatsapp")) return "WhatsApp Automation";
  if (normalizedPrompt.includes("email") && normalizedPrompt.includes("alert")) return "Email Alerts";
  if (normalizedPrompt.includes("email")) return "Email Automation";
  if (normalizedPrompt.includes("lead")) return "Lead Automation";
  if (normalizedPrompt.includes("crm")) return "CRM Workflow";
  if (normalizedPrompt.includes("sheet") || normalizedPrompt.includes("sheets")) return "Sheets Sync";
  if (normalizedPrompt.includes("form")) return "Form Automation";

  const words = normalizedPrompt
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));

  if (words.length === 0) return "New Automation";
  const resultWords = words.slice(0, 3).map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  if (resultWords.length === 1) resultWords.push("Workflow");
  return resultWords.join(" ");
}

function readStoredChat(chatId: string) {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(`chat_${chatId}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function sanitizeCustomTitle(value: string) {
  return value.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const ENGAGEMENT_TIPS = [
  "AutomateCraft workflows run 24/7 with zero downtime.",
  "You can chain up to 12 services in a single automation.",
  "Every deployment gets a live audit trail for debugging.",
  "Ultra Thinking mode unlocks advanced multi-step reasoning.",
];

const SUGGESTION_CHIPS = [
  { icon: Workflow, label: "Automate my email workflow" },
  { icon: FileSpreadsheet, label: "Sync Sheets to CRM" },
  { icon: Mail, label: "Send alerts on form submit" },
  { icon: Zap, label: "Connect WhatsApp to pipeline" },
];

function renderStructuredAiContent(content: string) {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  const headingMatch = lines[0]?.match(/^\*\*(.*?)\*\*$/);
  const heading = headingMatch ? headingMatch[1] : "Automation Update";

  const remaining = headingMatch ? lines.slice(1) : lines;
  const bullets = remaining
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, ""));
  const bodyLines = remaining.filter((line) => !line.startsWith("- "));
  const summary = bodyLines[0] ?? "System output is ready.";
  const details = bodyLines.slice(1);

  return (
    <div className="rounded-[18px] border border-white/[0.06] bg-[#0c0c0c] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="flex">
        {/* Animated gradient accent stripe */}
        <div className="w-[2px] shrink-0 bg-gradient-to-b from-accent via-cyan-400 to-accent/30" />
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/[0.08] ring-1 ring-accent/10">
              <Zap className="h-3.5 w-3.5 text-accent" />
            </div>
            <span className="text-[15px] font-semibold tracking-wide text-white">{heading}</span>
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-white/50">{summary}</p>

          {details.length > 0 && (
            <div className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-white/65">
              {details.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          )}

          {bullets.length > 0 && (
            <div className="mt-3 space-y-2">
              {bullets.map((item, index) => (
                <div key={`${item}-${index}`} className="flex items-center gap-2.5 text-[13px] text-white/70">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/[0.06] ring-1 ring-accent/10">
                    <CheckCircle2 className="h-3 w-3 text-accent" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatContainer({ chatId, initialPrompt }: ChatContainerProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
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

  const [chatTitle, setChatTitle] = useState<string>(() => {
    const saved = readStoredChat(chatId);
    if (saved?.chatTitle) return saved.chatTitle as string;
    return generateTitle(initialPrompt || "");
  });
  const [draftTitle, setDraftTitle] = useState(chatTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isStarred, setIsStarred] = useState<boolean>(() => {
    const saved = readStoredChat(chatId);
    return Boolean(saved?.isStarred);
  });

  useEffect(() => {
    if (!isEditingTitle) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isEditingTitle]);

  const saveTitle = () => {
    const nextTitle = sanitizeCustomTitle(draftTitle);
    if (!nextTitle) {
      setDraftTitle(chatTitle);
      setIsEditingTitle(false);
      return;
    }
    setChatTitle(nextTitle);
    setDraftTitle(nextTitle);
    setIsEditingTitle(false);
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = readStoredChat(chatId);
    if (saved?.messages) return saved.messages as Message[];
    return initialPrompt 
      ? [
          { id: "init-user", role: "user", content: initialPrompt, timestamp: Date.now() },
          { id: "init-sys", role: "system", content: "Understanding your automation...", timestamp: Date.now() }
        ]
      : [];
  });

  const [step, setStep] = useState<ChatSequenceStep>(() => {
    const saved = readStoredChat(chatId);
    if (saved?.step) return saved.step as ChatSequenceStep;
    return "boot";
  });

  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() => {
    const saved = readStoredChat(chatId);
    if (saved?.workspaceState) return saved.workspaceState as WorkspaceState;
    return "understanding";
  });
  
  const [nodes, setNodes] = useState<FlowNode[]>(() => {
    const saved = readStoredChat(chatId);
    if (saved?.nodes) return saved.nodes as FlowNode[];
    return [
      { id: "n1", type: "trigger", label: "Form Submission", status: "completed", detail: "Awaiting incoming form data" },
      { id: "n2", type: "process", label: "AI Analysis", status: "pending" },
      { id: "n3", type: "action", label: "Send Notification", status: "pending" }
    ];
  });

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isTesting, setIsTesting] = useState(false);
  const [hasTested, setHasTested] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hasDeployed, setHasDeployed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [ultraThinking, setUltraThinking] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const isStarterPlan = true; // Mocked state for testing

  // Relative time ticker
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
        };
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };
        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Microphone text-to-speech is not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  const removeFile = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, step, workspaceState]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `chat_${chatId}`,
        JSON.stringify({ messages, step, workspaceState, nodes, chatTitle, isStarred })
      );

      const now = new Date().toISOString();
      const previous = readChatIndex().filter((entry) => entry && entry.chatId);
      const nextEntry: ChatIndexEntry = { chatId, title: chatTitle, updatedAt: now, isStarred };
      const merged = [nextEntry, ...previous.filter((entry) => entry.chatId !== chatId)]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 10);
      writeChatIndex(merged);
    }
  }, [messages, step, workspaceState, nodes, chatTitle, isStarred, chatId]);

  const addMessage = (role: Message["role"], content: string, state?: WorkspaceState, form?: FormDef, isReadyCard?: boolean) => {
    setMessages(p => [...p, { id: Math.random().toString(36).substring(7), role, content, state, form, isReadyCard, timestamp: Date.now() }]);
  };

  const removeMessageByRole = (role: Message["role"]) => {
    setMessages(p => p.filter(m => m.role !== role));
  };

  useEffect(() => {
    const isInitialBoot = step === "boot" && workspaceState === "understanding";
    if (!isInitialBoot) return;

    const runBootSequence = async () => {
      setNodes(n => n.map(x => x.id === "n2" ? { ...x, status: "active" } : x));
      
      removeMessageByRole("system");
      addMessage("thinking", "Analyzing your automation...");
      await new Promise(r => setTimeout(r, 1200));

      removeMessageByRole("thinking");
      addMessage("thinking", "Analyzing your automation...\n✓ Trigger detected");
      await new Promise(r => setTimeout(r, 1000));

      removeMessageByRole("thinking");
      addMessage("thinking", "Analyzing your automation...\n✓ Trigger detected\n✓ Action detected");
      await new Promise(r => setTimeout(r, 1200));

      removeMessageByRole("thinking");
      
      const defaultPhone = initialPrompt?.match(/\+?\d{10,14}/)?.[0] || "";
      
      setWorkspaceState("collecting_inputs");
      addMessage(
        "ai", 
        "**Automation Structure Ready**\nI've configured an AI form handler to push data forward.\n\nPlease complete the setup below to finalize your execution flow.",
        "collecting_inputs",
        {
          title: "WhatsApp Configuration",
          description: "Enter the target destination details",
          fields: [
            { key: "phone", label: "Target Phone Number", type: "text", placeholder: "+1 (555) 000-0000", defaultValue: defaultPhone },
            { key: "message", label: "Message Content", type: "text", placeholder: "Hello, we received your form data!..." },
            { key: "priority", label: "Alert Priority", type: "select", options: [{label: "Standard", value: "standard"}, {label: "High Priority", value: "high"}] },
            { key: "enableLogging", label: "Enable Audit Logging", type: "toggle", defaultValue: true }
          ]
        }
      );
      setStep("wait_message");
    };

    runBootSequence();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormSubmit = async (messageId: string, values: Record<string, any>) => {
    setMessages(p => p.map(m => m.id === messageId ? { ...m, isFormSubmitted: true, formValues: values } : m));
    
    let inputSummary = values.phone || "the specified target";

    if (ultraThinking) {
      addMessage("system", "Using advanced reasoning mode...");
      await new Promise(r => setTimeout(r, 600));
    }

    if (step === "wait_message") {
      setWorkspaceState("ready_to_build");
      addMessage("system", "Applying configuration to nodes...");
      setNodes(n => n.map(x => x.id === "n2" ? { ...x, status: "completed", detail: "Configured via GPT-4o" } : x));
      
      await new Promise(r => setTimeout(r, 1500));
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "active" } : x));
      
      await new Promise(r => setTimeout(r, 1500));
      removeMessageByRole("system");
      setWorkspaceState("canvas_visible");
      
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "completed", detail: `Sending to ${inputSummary}` } : x));
      addMessage(
        "ai", 
        "Automation Ready", 
        "canvas_visible",
        undefined,
        true
      );
      setStep("ready");
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const handleEdit = (text: string) => {
    setInputText(text);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() && attachedFiles.length === 0) return;

    let input = inputText.trim();
    if (attachedFiles.length > 0) {
      input += `\n[Attached Files: ${attachedFiles.map(f => f.name).join(", ")}]`;
    }
    setInputText("");
    setAttachedFiles([]);
    addMessage("user", input);

    if (ultraThinking) {
      addMessage("system", "Using advanced reasoning mode...");
      await new Promise(r => setTimeout(r, 600));
    }

    if (step === "wait_message") {
      setWorkspaceState("ready_to_build");
      addMessage("system", "Structuring workflow logic...");
      setNodes(n => n.map(x => x.id === "n2" ? { ...x, status: "completed", detail: "Configured via GPT-4o" } : x));
      
      await new Promise(r => setTimeout(r, 1500));
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "active" } : x));
      
      await new Promise(r => setTimeout(r, 1500));
      removeMessageByRole("system");
      setWorkspaceState("canvas_visible");
      
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "completed", detail: `Sending to ${input}` } : x));
      addMessage(
        "ai", 
        "Automation Ready", 
        "canvas_visible",
        undefined,
        true
      );
      setStep("ready");

    } else if (step === "ready" || step === "deployed") {
      await new Promise(r => setTimeout(r, 800));
      addMessage("ai", "**Modification Applied**\nKeep in mind that live modifications to the pipeline will require running tests again!");
      setHasTested(false);
      setHasDeployed(false);
      
      setWorkspaceState("ready_to_build");
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "active", detail: "Updating target..." } : x));
      
      await new Promise(r => setTimeout(r, 1500));
      setWorkspaceState("canvas_visible");
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "completed", detail: "Updated action node" } : x));
      
      setStep("ready");
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    await new Promise(r => setTimeout(r, 2500));
    setIsTesting(false);
    setHasTested(true);
    addMessage("ai", "**Tests Passed**\nAll logical steps resolved without errors. You are ready to deploy.");
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsDeploying(false);
    setHasDeployed(true);
    setStep("deployed");
    addMessage("ai", "**Deployment Complete**\nYour automation is now live and waiting for incoming triggers.");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
  };

  const isInputDisabled = workspaceState === "ready_to_build" || workspaceState === "understanding";
  const isCanvasVisible = workspaceState === "canvas_visible";
  const stateSteps: Array<{ key: WorkspaceState; label: string }> = [
    { key: "understanding", label: "Understanding" },
    { key: "collecting_inputs", label: "Collecting Inputs" },
    { key: "ready_to_build", label: "Building" },
    { key: "canvas_visible", label: "Ready" },
  ];
  const activeStateIndex = stateSteps.findIndex((stepItem) => stepItem.key === workspaceState);
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden relative">

      {/* Glass Header — Full Width */}
      <div className="absolute top-0 left-0 w-full flex h-[60px] shrink-0 items-center justify-between px-6 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="relative flex items-center" ref={dropdownRef}>
          <div className="flex items-center gap-1">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); saveTitle(); }
                  if (event.key === "Escape") { setDraftTitle(chatTitle); setIsEditingTitle(false); }
                }}
                className="h-8 w-[170px] rounded-lg border border-white/10 bg-[#151515] px-3 text-[13px] font-semibold tracking-wide text-white outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/20"
              />
            ) : (
              <>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 -ml-2 text-white/78 transition-colors hover:bg-white/[0.04] hover:text-white focus:outline-none"
                >
                  <span className="text-[14px] font-semibold tracking-wide">{chatTitle}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => { setDraftTitle(chatTitle); setIsDropdownOpen(false); setIsEditingTitle(true); }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/30 transition-colors hover:bg-white/[0.04] hover:text-white/60"
                >
                  <PenLine className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {ultraThinking && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="ml-2 flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent/[0.04] px-2 py-0.5"
              >
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-[0_0_6px_rgba(79,142,247,0.8)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent/80">Ultra Mode</span>
              </motion.div>
            )}
          </div>
          
          <AnimatePresence>
            {isDropdownOpen && !isEditingTitle && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-white/[0.06] bg-[#111]/95 shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden py-1 z-50 backdrop-blur-xl"
              >
                <button
                  onClick={() => { setIsStarred((current) => !current); setIsDropdownOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <Star className={`h-3.5 w-3.5 ${isStarred ? "fill-current text-accent" : "text-white/35"}`} />
                  {isStarred ? "Unstar Project" : "Star Project"}
                </button>
                <Link href="/" className="flex px-4 py-2.5 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white">
                  Go to Homepage
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Left Workspace Panel */}
      <div className="relative z-20 flex h-full w-[38%] min-w-[420px] flex-col border-r border-white/[0.04] bg-[#0a0a0a] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">


        {/* State progress bar — connected line with glowing active node */}
        <div className="absolute left-0 right-0 top-[60px] z-30 px-5">
          <div className="w-full rounded-xl border border-white/[0.05] bg-[#0c0c0c]/90 p-3.5 backdrop-blur-sm">
            <div className="flex items-center">
              {stateSteps.map((stepItem, index) => {
                const isActive = index === activeStateIndex;
                const isCompleted = index < activeStateIndex;
                return (
                  <React.Fragment key={stepItem.key}>
                    {/* Connector line */}
                    {index > 0 && (
                      <div className="flex-1 h-[2px] mx-1.5">
                        <div className={`h-full rounded-full transition-all duration-500 ${index <= activeStateIndex ? "bg-gradient-to-r from-accent/60 to-accent/40" : "bg-white/[0.05]"}`} />
                      </div>
                    )}
                    {/* Node */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative">
                        <div
                          className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                            isActive ? "bg-accent shadow-[0_0_8px_rgba(59,130,246,0.6)]" : isCompleted ? "bg-white/60" : "bg-white/15"
                          }`}
                        />
                        {isActive && (
                          <motion.div
                            className="absolute -inset-1 rounded-full border border-accent/30"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${
                          isActive ? "text-accent" : isCompleted ? "text-white/60" : "text-white/25"
                        }`}
                      >
                        {stepItem.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Messages area with gradient fade overlays */}
        <div className="relative flex-1 overflow-hidden">
          {/* Top gradient fade */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
          
          <div className="h-full overflow-y-auto px-5 pb-32 pt-[132px] custom-scrollbar">
            {/* Suggestion chips — when empty */}
            {!hasMessages && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center justify-center h-full -mt-20"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/[0.06] ring-1 ring-accent/10 mb-5">
                  <MessageSquarePlus className="h-6 w-6 text-accent/70" />
                </div>
                <h3 className="text-[16px] font-semibold text-white/80 mb-1.5">Start a new automation</h3>
                <p className="text-[13px] text-white/35 mb-8 text-center max-w-[280px]">
                  Describe what you want to automate and we&apos;ll build it for you.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-[360px]">
                  {SUGGESTION_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleSuggestionClick(chip.label)}
                      className="group flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.04] hover:border-white/10"
                    >
                      <chip.icon className="h-3.5 w-3.5 text-white/25 group-hover:text-accent/60 transition-colors shrink-0" />
                      <span className="text-[12px] text-white/45 group-hover:text-white/70 transition-colors leading-snug">{chip.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex w-full mb-8 ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}
                >
                  {/* ───── USER MESSAGE ───── */}
                  {msg.role === "user" && (
                    <div
                      className="flex items-start gap-3 max-w-[85%]"
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                    >
                      <div className="flex-1 flex flex-col items-end gap-1">
                        <div className="relative w-full whitespace-pre-wrap rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-[14px] leading-relaxed text-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                          {msg.content}
                        </div>

                        {/* Floating action toolbar — appears on hover */}
                        <AnimatePresence>
                          {hoveredMsgId === msg.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.15 }}
                              className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-[#111]/90 px-1 py-0.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-sm mr-1"
                            >
                              <button 
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                              >
                                {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                {copiedId === msg.id ? <span className="text-emerald-400">Copied</span> : "Copy"}
                              </button>
                              <div className="w-px h-3 bg-white/[0.06]" />
                              <button 
                                onClick={() => handleEdit(msg.content)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Timestamp */}
                        {msg.timestamp && (
                          <span className="text-[10px] text-white/20 mr-1 font-medium">{formatRelativeTime(msg.timestamp)}</span>
                        )}
                      </div>
                      {/* User avatar */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/[0.08] text-[11px] font-bold text-accent ring-1 ring-accent/15">
                        U
                      </div>
                    </div>
                  )}

                  {/* ───── AI MESSAGE ───── */}
                  {msg.role === "ai" && (
                    <div className="w-full flex-1 max-w-[95%] text-[15px] leading-relaxed py-1">
                      {msg.state && !msg.form && !msg.isReadyCard && (
                        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/40">
                          <CheckCircle2 className="h-3 w-3" />
                          {msg.state === "understanding" && "Understanding"}
                          {msg.state === "collecting_inputs" && "Collecting Inputs"}
                          {msg.state === "ready_to_build" && "Building Automation"}
                          {msg.state === "canvas_visible" && "Ready"}
                        </div>
                      )}
                      
                      {!msg.form && !msg.isReadyCard && renderStructuredAiContent(msg.content)}
                      
                      {msg.form && !msg.isFormSubmitted && (
                        <div className="mt-2 font-sans">
                          <FormCard
                            title={msg.form.title}
                            description={msg.form.description}
                            fields={msg.form.fields}
                            onSubmit={(values) => handleFormSubmit(msg.id, values)}
                          />
                        </div>
                      )}
                      
                      {msg.form && msg.isFormSubmitted && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-2 mb-2 inline-flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                        >
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          <span className="text-[14px] text-white/70">
                            Configuration saved. Ready to deploy.
                          </span>
                        </motion.div>
                      )}

                      {msg.isReadyCard && (
                        <div className="mt-2">
                          <ReadyCard 
                            title="Automation Summary"
                            description="The canvas map has been built. You can test the end-to-end flow to ensure logic fires correctly without errors."
                            trigger={nodes.find((node) => node.type === "trigger")?.label}
                            action={nodes.find((node) => node.type === "action")?.label}
                            explanation={nodes.find((node) => node.type === "action")?.detail || "Workflow route is configured and ready for validation."}
                            isTesting={isTesting}
                            hasTested={hasTested}
                            isDeploying={isDeploying}
                            hasDeployed={hasDeployed}
                            onTest={handleTest}
                            onDeploy={handleDeploy}
                            onModify={() => {
                              const input = document.querySelector('textarea');
                              if (input) input.focus();
                            }}
                          />
                        </div>
                      )}

                      {/* AI message timestamp */}
                      {msg.timestamp && !msg.form && !msg.isReadyCard && (
                        <span className="mt-2 block text-[10px] text-white/20 font-medium">{formatRelativeTime(msg.timestamp)}</span>
                      )}
                    </div>
                  )}

                  {/* ───── THINKING STATE ───── */}
                  {msg.role === "thinking" && (
                    <div className="w-full">
                      <ProgressCard steps={msg.content.split('\n')} />
                    </div>
                  )}

                  {/* ───── SYSTEM MESSAGES ───── */}
                  {msg.role === "system" && (
                    msg.content.toLowerCase().includes("structuring workflow logic") ||
                    msg.content.toLowerCase().includes("applying configuration") ? (
                      <div className="w-full max-w-[85%] space-y-3">
                        <div className="rounded-[18px] border border-white/[0.06] bg-[#0c0c0c] p-4 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                          {/* Shimmer effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent"
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          />
                          <div className="relative">
                            <div className="text-[14px] font-semibold text-white">Building your automation...</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {["Connecting services", "Generating workflow", "Finalizing logic"].map((item, i) => (
                                <motion.div
                                  key={item}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5"
                                >
                                  <div className="mr-2 h-1.5 w-1.5 animate-pulse rounded-full bg-accent/60" />
                                  <span className="text-[12px] text-white/55">{item}</span>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* Engagement tip card */}
                        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400/50" />
                            <p className="text-[12px] leading-relaxed text-white/35">
                              {ENGAGEMENT_TIPS[Math.floor(Math.random() * ENGAGEMENT_TIPS.length)]}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 rounded-full border border-white/[0.05] bg-white/[0.015] px-3 py-1.5 backdrop-blur-sm">
                        {/* Animated typing dots */}
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="h-1 w-1 rounded-full bg-accent/50"
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                        <span className="text-[12px] font-medium tracking-wide text-white/40">{msg.content}</span>
                      </div>
                    )
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* ───── FLOATING INPUT BAR ───── */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent px-5 pb-5 pt-14 pointer-events-none">
          <form 
            onSubmit={handleSubmit}
            className={`w-full flex flex-col gap-2 rounded-2xl border bg-[#0c0c0c]/90 backdrop-blur-xl p-4 shadow-[0_-4px_40px_rgba(0,0,0,0.4)] transition-all duration-300 pointer-events-auto
              ${isInputDisabled ? "opacity-50 border-white/[0.04]" : "border-white/[0.06] focus-within:border-accent/25 focus-within:shadow-[0_0_40px_rgba(59,130,246,0.06)] hover:border-white/10"}
            `}
          >
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-1">
              <div className="relative">
                <div className={`h-2 w-2 rounded-full transition-all duration-300 ${isInputDisabled ? "bg-white/25" : "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"}`} />
                {!isInputDisabled && (
                  <motion.div
                    className="absolute -inset-0.5 rounded-full border border-cyan-400/30"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              <span className={`text-[12px] font-medium transition-colors ${isInputDisabled ? "text-white/25" : "text-cyan-400/70"}`}>
                {isInputDisabled ? "Agent is thinking..." : "Agent is waiting..."}
              </span>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSubmit();
                }
              }}
              placeholder={isInputDisabled ? "Thinking..." : "Message Agent..."}
              disabled={isInputDisabled}
              className="caret-accent w-full min-h-[48px] max-h-[200px] resize-none bg-transparent text-[15px] pt-1 text-white outline-none placeholder:text-white/20 disabled:cursor-not-allowed px-1 custom-scrollbar"
            />

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-all duration-200 border border-transparent hover:border-white/[0.06]"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileAttach}
                  multiple 
                />

                {/* Ultra Thinking Toggle */}
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (isStarterPlan) {
                        setShowUpgradePopup(true);
                      } else {
                        setUltraThinking(!ultraThinking);
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-300 ${
                      ultraThinking
                        ? "bg-accent/[0.08] text-accent ring-1 ring-accent/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                        : "bg-white/[0.02] text-white/35 hover:bg-white/[0.04] hover:text-white/60 border border-white/[0.04]"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Ultra Thinking
                  </button>

                  <AnimatePresence>
                    {showUpgradePopup && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute bottom-[calc(100%+12px)] left-0 w-64 rounded-xl border border-white/[0.06] bg-[#111]/95 p-4 shadow-[0_12px_48px_rgba(0,0,0,0.6)] z-50 origin-bottom-left backdrop-blur-xl"
                      >
                        <button
                          type="button"
                          onClick={() => setShowUpgradePopup(false)}
                          className="absolute right-2 top-2 rounded-md p-1 text-white/30 hover:bg-white/[0.04] hover:text-white/60"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <p className="text-[13px] text-white/70 pr-4 leading-relaxed">
                          Ultra Thinking is available in Plus and above plans.
                        </p>
                        <Link
                          href="/pricing"
                          onClick={() => setShowUpgradePopup(false)}
                          className="mt-3 block w-full rounded-lg bg-white py-1.5 text-center text-[13px] font-bold text-black transition-all duration-200 hover:bg-white/90 shadow-md"
                        >
                          Upgrade to Plus
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Show attached files */}
                {attachedFiles.map(file => (
                   <div key={file.name} className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.06] text-xs px-2.5 py-1.5 rounded-lg text-white/60">
                     <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                     <button type="button" onClick={() => removeFile(file.name)} className="hover:text-white text-white/30">
                       <X className="h-3.5 w-3.5" />
                     </button>
                   </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 border ${
                    isRecording 
                      ? "bg-red-500/8 text-red-400 border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.15)]" 
                      : "bg-white/[0.02] border-white/[0.04] text-white/35 hover:bg-white/[0.04] hover:text-white/60"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Use microphone"}
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="submit"
                  disabled={(!inputText.trim() && attachedFiles.length === 0) || isInputDisabled}
                  className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-black disabled:opacity-20 disabled:bg-white/[0.06] disabled:text-white transition-all duration-200 focus:outline-none hover:bg-white/90 active:scale-95"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right Workspace Panel */}
      <div className="h-full w-[62%] pt-[60px]">
        <InteractiveCanvas 
          nodes={nodes}
          onTest={handleTest}
          onDeploy={handleDeploy}
          isDeploying={isDeploying}
          hasDeployed={hasDeployed}
          isTesting={isTesting}
          hasTested={hasTested}
        />
      </div>

    </div>
  );
}
