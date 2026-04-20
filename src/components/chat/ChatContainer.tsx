"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ChevronDown, CheckCircle2, Home, Star, PenLine, Paperclip, Mic, X, Sparkles, Copy, Check, Pencil, Zap, MessageSquarePlus, Workflow, Mail, FileSpreadsheet, PanelRight } from "lucide-react";
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

const SUGGESTION_CHIPS = [
  { icon: Workflow, label: "Automate my email workflow" },
  { icon: FileSpreadsheet, label: "Sync Sheets to CRM" },
  { icon: Mail, label: "Send alerts on form submit" },
  { icon: Zap, label: "Connect WhatsApp to pipeline" },
];

function renderStructuredAiContent(content: string) {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  const headingMatch = lines[0]?.match(/^\*\*(.*?)\*\*$/);
  const heading = headingMatch ? headingMatch[1] : null;

  const remaining = headingMatch ? lines.slice(1) : lines;
  const bullets = remaining
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, ""));
  const bodyLines = remaining.filter((line) => !line.startsWith("- "));
  const summary = bodyLines[0] ?? "";
  const details = bodyLines.slice(1);

  return (
    <div className="space-y-2">
      {heading && (
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/[0.08]">
            <Zap className="h-3 w-3 text-accent" />
          </div>
          <span className="text-[14px] font-semibold text-white">{heading}</span>
        </div>
      )}
      {summary && <p className="text-[13px] leading-relaxed text-white/50">{summary}</p>}

      {details.length > 0 && (
        <div className="space-y-1 text-[13px] leading-relaxed text-white/55">
          {details.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
      )}

      {bullets.length > 0 && (
        <div className="space-y-1.5 mt-1">
          {bullets.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-2 text-[13px] text-white/60">
              <CheckCircle2 className="h-3 w-3 text-accent/60 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
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
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [ultraThinking, setUltraThinking] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const isStarterPlan = true;

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

  // Open panel automatically when canvas becomes visible
  useEffect(() => {
    if (workspaceState === "canvas_visible") {
      setIsPanelOpen(true);
    }
  }, [workspaceState]);

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
      addMessage("system", "Building your automation...");
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
      addMessage("system", "Building your automation...");
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
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden">

      {/* ─── Main Chat Area ─── */}
      <div className="relative flex h-full flex-1 flex-col min-w-0">

        {/* Header */}
        <div className="flex h-[52px] shrink-0 items-center justify-between px-5 border-b border-white/[0.04] bg-[#0a0a0a]">
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
                  className="h-8 w-[170px] rounded-lg border border-white/10 bg-[#151515] px-3 text-[13px] font-semibold text-white outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/20"
                />
              ) : (
                <>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 -ml-2 text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <span className="text-[14px] font-semibold">{chatTitle}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-white/25 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDraftTitle(chatTitle); setIsDropdownOpen(false); setIsEditingTitle(true); }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/[0.04] hover:text-white/50"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                  </button>
                </>
              )}

              {ultraThinking && (
                <div className="ml-2 flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent/[0.04] px-2 py-0.5">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent/70">Ultra</span>
                </div>
              )}
            </div>

            <AnimatePresence>
              {isDropdownOpen && !isEditingTitle && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-white/[0.06] bg-[#111]/95 shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden py-1 z-50 backdrop-blur-xl"
                >
                  <button
                    onClick={() => { setIsStarred((current) => !current); setIsDropdownOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <Star className={`h-3.5 w-3.5 ${isStarred ? "fill-current text-accent" : "text-white/30"}`} />
                    {isStarred ? "Unstar" : "Star"}
                  </button>
                  <Link href="/" className="flex px-3.5 py-2 text-[13px] font-medium text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white items-center gap-2.5">
                    <Home className="h-3.5 w-3.5 text-white/30" />
                    Home
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right side: panel toggle */}
          <div className="flex items-center gap-2">
            {isCanvasVisible && (
              <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className={`flex h-8 items-center gap-2 rounded-lg px-3 text-[12px] font-medium transition-all duration-200 ${
                  isPanelOpen
                    ? "bg-accent/[0.08] text-accent border border-accent/15"
                    : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.05] hover:text-white/60"
                }`}
              >
                <PanelRight className="h-3.5 w-3.5" />
                Workflow
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="relative flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-3xl px-5 pb-40 pt-6">

              {/* Empty state */}
              {!hasMessages && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center justify-center pt-[20vh]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] mb-4">
                    <MessageSquarePlus className="h-5 w-5 text-white/30" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-white/70 mb-1">Start a new automation</h3>
                  <p className="text-[13px] text-white/30 mb-8 text-center max-w-[280px]">
                    Describe what you want to automate and we&apos;ll build it for you.
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-[400px]">
                    {SUGGESTION_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        onClick={() => handleSuggestionClick(chip.label)}
                        className="group flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.08]"
                      >
                        <chip.icon className="h-3.5 w-3.5 text-white/20 group-hover:text-accent/50 transition-colors shrink-0" />
                        <span className="text-[12px] text-white/40 group-hover:text-white/65 transition-colors leading-snug">{chip.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`mb-6 ${msg.role === "user" ? "flex justify-end" : msg.role === "system" ? "flex justify-center" : ""}`}
                  >
                    {/* ── USER MESSAGE ── */}
                    {msg.role === "user" && (
                      <div
                        className="max-w-[75%]"
                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        <div className="rounded-2xl rounded-br-md bg-white/[0.05] border border-white/[0.06] px-4 py-3 text-[14px] leading-relaxed text-white/85 whitespace-pre-wrap">
                          {msg.content}
                        </div>

                        <div className="flex items-center justify-end gap-1 mt-1.5 mr-1">
                          <AnimatePresence>
                            {hoveredMsgId === msg.id && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-0.5"
                              >
                                <button
                                  onClick={() => handleCopy(msg.id, msg.content)}
                                  className="px-1.5 py-0.5 rounded text-[11px] text-white/30 hover:text-white/60 transition-colors"
                                >
                                  {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400 inline" /> : <Copy className="h-3 w-3 inline" />}
                                </button>
                                <button
                                  onClick={() => handleEdit(msg.content)}
                                  className="px-1.5 py-0.5 rounded text-[11px] text-white/30 hover:text-white/60 transition-colors"
                                >
                                  <Pencil className="h-3 w-3 inline" />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {msg.timestamp && (
                            <span className="text-[10px] text-white/15">{formatRelativeTime(msg.timestamp)}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── AI MESSAGE ── */}
                    {msg.role === "ai" && (
                      <div className="w-full">
                        {/* Inline state badge */}
                        {msg.state && !msg.form && !msg.isReadyCard && (
                          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.05] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium text-white/30">
                            <CheckCircle2 className="h-3 w-3" />
                            {msg.state === "collecting_inputs" && "Collecting Inputs"}
                            {msg.state === "ready_to_build" && "Building"}
                            {msg.state === "canvas_visible" && "Ready"}
                          </div>
                        )}

                        {/* AI text content — with accent left border */}
                        {!msg.form && !msg.isReadyCard && (
                          <div className="border-l-2 border-accent/20 pl-4 py-1">
                            {renderStructuredAiContent(msg.content)}
                            {msg.timestamp && (
                              <span className="mt-2 block text-[10px] text-white/15">{formatRelativeTime(msg.timestamp)}</span>
                            )}
                          </div>
                        )}

                        {/* Form Card */}
                        {msg.form && !msg.isFormSubmitted && (
                          <div className="mt-2">
                            <FormCard
                              title={msg.form.title}
                              description={msg.form.description}
                              fields={msg.form.fields}
                              onSubmit={(values) => handleFormSubmit(msg.id, values)}
                            />
                          </div>
                        )}

                        {msg.form && msg.isFormSubmitted && (
                          <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span className="text-[13px] text-white/60">Configuration saved. Building workflow...</span>
                          </div>
                        )}

                        {/* Ready Card */}
                        {msg.isReadyCard && (
                          <div className="mt-2">
                            <ReadyCard
                              title="Automation Summary"
                              description="The workflow has been built. You can test and deploy from the workflow panel."
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
                      </div>
                    )}

                    {/* ── THINKING STATE ── */}
                    {msg.role === "thinking" && (
                      <div className="w-full">
                        <ProgressCard steps={msg.content.split('\n')} />
                      </div>
                    )}

                    {/* ── SYSTEM MESSAGES ── */}
                    {msg.role === "system" && (
                      msg.content.toLowerCase().includes("building your automation") ||
                      msg.content.toLowerCase().includes("applying configuration") ? (
                        <div className="w-full">
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 relative overflow-hidden">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent"
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="relative flex items-center gap-3">
                              <Zap className="h-4 w-4 text-accent/50 shrink-0" />
                              <span className="text-[13px] font-medium text-white/50">{msg.content}</span>
                              <div className="ml-auto flex gap-1">
                                {[0, 1, 2].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="h-1 w-1 rounded-full bg-accent/40"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.02] px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="h-1 w-1 rounded-full bg-accent/40"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                          <span className="text-[12px] font-medium text-white/35">{msg.content}</span>
                        </div>
                      )
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>
        </div>

        {/* ─── Floating Input Bar ─── */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent px-5 pb-5 pt-12 pointer-events-none">
          <form
            onSubmit={handleSubmit}
            className={`w-full max-w-3xl flex flex-col gap-2 rounded-2xl border bg-[#111]/90 backdrop-blur-xl px-4 py-3 shadow-[0_-4px_30px_rgba(0,0,0,0.3)] transition-all duration-200 pointer-events-auto
              ${isInputDisabled ? "opacity-50 border-white/[0.04]" : "border-white/[0.06] focus-within:border-white/[0.1]"}
            `}
          >
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSubmit();
                }
              }}
              placeholder={isInputDisabled ? "Thinking..." : "Describe your automation..."}
              disabled={isInputDisabled}
              className="caret-accent w-full min-h-[44px] max-h-[160px] resize-none bg-transparent text-[14px] text-white outline-none placeholder:text-white/20 disabled:cursor-not-allowed"
            />

            {/* Bottom Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/30 hover:bg-white/[0.04] hover:text-white/50 transition-all"
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
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                      ultraThinking
                        ? "bg-accent/[0.08] text-accent ring-1 ring-accent/20"
                        : "text-white/25 hover:text-white/45"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    Ultra
                  </button>

                  <AnimatePresence>
                    {showUpgradePopup && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute bottom-[calc(100%+8px)] left-0 w-56 rounded-xl border border-white/[0.06] bg-[#111]/95 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-50 backdrop-blur-xl"
                      >
                        <button
                          type="button"
                          onClick={() => setShowUpgradePopup(false)}
                          className="absolute right-2 top-2 rounded-md p-1 text-white/25 hover:bg-white/[0.04] hover:text-white/50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="text-[12px] text-white/60 pr-4 leading-relaxed">
                          Ultra Thinking is available in Plus and above.
                        </p>
                        <Link
                          href="/pricing"
                          onClick={() => setShowUpgradePopup(false)}
                          className="mt-2.5 block w-full rounded-lg bg-white py-1.5 text-center text-[12px] font-bold text-black transition-all hover:bg-white/90"
                        >
                          Upgrade
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Attached files */}
                {attachedFiles.map(file => (
                   <div key={file.name} className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] text-[11px] px-2 py-1 rounded-md text-white/50">
                     <span className="truncate max-w-[100px]">{file.name}</span>
                     <button type="button" onClick={() => removeFile(file.name)} className="hover:text-white text-white/25">
                       <X className="h-3 w-3" />
                     </button>
                   </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                    isRecording
                      ? "bg-red-500/10 text-red-400"
                      : "text-white/25 hover:bg-white/[0.04] hover:text-white/45"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Use microphone"}
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="submit"
                  disabled={(!inputText.trim() && attachedFiles.length === 0) || isInputDisabled}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-black disabled:opacity-15 disabled:bg-white/[0.06] disabled:text-white transition-all active:scale-95"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ─── Side Panel (Push-Left) ─── */}
      <InteractiveCanvas
        nodes={nodes}
        onTest={handleTest}
        onDeploy={handleDeploy}
        isDeploying={isDeploying}
        hasDeployed={hasDeployed}
        isTesting={isTesting}
        hasTested={hasTested}
        isOpen={isPanelOpen && isCanvasVisible}
        onClose={() => setIsPanelOpen(false)}
      />

    </div>
  );
}
