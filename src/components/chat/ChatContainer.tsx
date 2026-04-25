"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ChevronDown, CheckCircle2, Home, Star, PenLine, Paperclip, Mic, X, Sparkles, Copy, Check, Pencil, Zap, MessageSquarePlus, Workflow, Mail, FileSpreadsheet, PanelRight, Clock, Activity, Bot } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { InteractiveCanvas, type FlowNode } from "./InteractiveCanvas";
import { FormCard, type FieldDef, type FieldValue } from "./FormCard";
import { ProgressCard } from "./ProgressCard";
import { ReadyCard } from "./ReadyCard";
import { EngineAnalysisCard } from "./EngineAnalysisCard";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { SystemStatusBar, type SystemPhase } from "./SystemStatusBar";

type FormDef = {
  title: string;
  description: string;
  fields: FieldDef[];
};

type EngineCards = {
  trigger: string;
  action: string;
  setupFields: string[];
};

type Message = {
  id: string;
  role: "user" | "ai" | "system" | "thinking";
  content: string;
  state?: WorkspaceState;
  form?: FormDef;
  isReadyCard?: boolean;
  isFormSubmitted?: boolean;
  formValues?: Record<string, FieldValue>;
  timestamp?: number;
  engineCards?: EngineCards;
};

type ChatSequenceStep = "boot" | "wait_message" | "ready" | "deployed";
type WorkspaceState = "understanding" | "collecting_inputs" | "ready_to_build" | "canvas_visible";

type StoredChat = {
  chatTitle?: string;
  isStarred?: boolean;
  messages?: Message[];
  step?: ChatSequenceStep;
  workspaceState?: WorkspaceState;
  nodes?: FlowNode[];
};

type SpeechRecognitionResultEventLike = {
  results: {
    [index: number]: {
      0: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

interface ChatContainerProps {
  chatId: string;
  initialPrompt?: string;
  ultraThinking?: boolean;
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

function readStoredChat(chatId: string): StoredChat | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(`chat_${chatId}`);
    return saved ? (JSON.parse(saved) as StoredChat) : null;
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
  { icon: Workflow, label: "Email Workflow", desc: "Automate my email follow-up workflow" },
  { icon: FileSpreadsheet, label: "Sheets → CRM", desc: "Sync Google Sheets data to my CRM" },
  { icon: Mail, label: "Form Alerts", desc: "Send alerts when a form is submitted" },
  { icon: Zap, label: "WhatsApp Pipeline", desc: "Connect WhatsApp to my lead pipeline" },
];

/* ── AI Avatar component ── */
function AiAvatar() {
  /* LOGIC EXPLAINED:
  The chat workspace used multiple flat black fills, which made the page feel
  empty. The shared chat surface classes move the shell, header, and composer
  onto a blue-black graphite palette so the UI stays majorly black but gains
  depth and separation. */
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/10 shadow-[0_0_12px_rgba(59,130,246,0.08)]">
      <Image src="/logo-new.png" alt="AI" width={18} height={18} className="object-contain" />
    </div>
  );
}

/* ── Recent Activity Panel ── */
function RecentActivityPanel() {
  const [recentChats, setRecentChats] = useState<ChatIndexEntry[]>([]);

  useEffect(() => {
    const entries = readChatIndex()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
    setRecentChats(entries);
  }, []);

  if (recentChats.length === 0) return null;

  const lastChat = recentChats[0];
  const otherChats = recentChats.slice(1);

  function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 w-full max-w-[420px] space-y-3"
    >
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/15">Recent</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Last automation preview card */}
      <a
        href={`/dashboard/chat/${lastChat.chatId}`}
        className="group flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-gradient-to-r from-white/[0.025] to-white/[0.01] px-4 py-3.5 transition-all duration-250 hover:border-accent/15 hover:bg-accent/[0.03] hover:shadow-[0_4px_20px_rgba(59,130,246,0.06)]"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/[0.06] ring-1 ring-accent/[0.08] group-hover:ring-accent/20 transition-all">
          <Activity className="h-4 w-4 text-accent/50 group-hover:text-accent/80 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white/70 truncate group-hover:text-white/90 transition-colors">
            {lastChat.title}
          </p>
          <p className="text-[11px] text-white/25 mt-0.5">
            {timeAgo(lastChat.updatedAt)} {lastChat.isStarred ? "· ★" : ""}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1 rounded-md border border-white/[0.04] bg-white/[0.02] px-2 py-0.5">
          <span className="text-[10px] font-medium text-white/25 group-hover:text-white/40 transition-colors">Open</span>
        </div>
      </a>

      {/* Other recent items — compact list */}
      {otherChats.length > 0 && (
        <div className="space-y-1">
          {otherChats.map((chat) => (
            <a
              key={chat.chatId}
              href={`/dashboard/chat/${chat.chatId}`}
              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/[0.03]"
            >
              <Clock className="h-3 w-3 text-white/12 shrink-0" />
              <span className="text-[12px] text-white/30 truncate flex-1 group-hover:text-white/50 transition-colors">
                {chat.title}
              </span>
              <span className="text-[10px] text-white/15 shrink-0">{timeAgo(chat.updatedAt)}</span>
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function renderStructuredAiContent(content: string, isStreaming: boolean = false) {
  if (!content) return null;
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  
  const isHeadingLine = lines[0]?.startsWith("**");
  const headingMatch = lines[0]?.match(/^\*\*(.*?)(?:\*\*|$)/);
  const heading = headingMatch ? headingMatch[1] : null;

  const remaining = isHeadingLine ? lines.slice(1) : lines;
  const bullets = remaining
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, ""));
  const bodyLines = remaining.filter((line) => !line.startsWith("- "));
  const summary = bodyLines[0] ?? "";
  const details = bodyLines.slice(1);

  const cursor = <span className="inline-block ml-1 w-1.5 h-[14px] bg-accent/80 animate-pulse align-middle shadow-[0_0_8px_rgba(59,130,246,0.6)] rounded-sm" />;

  return (
    <div className="space-y-2">
      {heading && (
        <p className="text-[14px] font-semibold text-white/85">
          {heading}
        </p>
      )}
      {heading && !summary && !details.length && !bullets.length && isStreaming && cursor}

      {summary && (
        <p className="text-[13px] leading-relaxed text-white/50">
          {summary}
          {!details.length && !bullets.length && isStreaming && cursor}
        </p>
      )}

      {details.length > 0 && (
        <div className="space-y-1 text-[13px] leading-relaxed text-white/45">
          {details.map((line, index) => (
            <p key={`${line}-${index}`}>
              {line}
              {index === details.length - 1 && !bullets.length && isStreaming && cursor}
            </p>
          ))}
        </div>
      )}

      {bullets.length > 0 && (
        <div className="space-y-1.5 mt-1">
          {bullets.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-start gap-2 text-[13px] text-white/50">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent/40 shrink-0" />
              <span>
                {item}
                {index === bullets.length - 1 && isStreaming && cursor}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StreamContent({ content, timestamp }: { content: string, timestamp?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  useEffect(() => {
    const isNew = Date.now() - (timestamp || 0) < 2000;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isNew || prefersReduced) {
      setDisplayed(content);
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    let index = 0;
    const speed = 18;
    const timer = setInterval(() => {
      index += 2;
      if (index > content.length) index = content.length;
      setDisplayed(content.slice(0, index));
      if (index === content.length) {
        setIsStreaming(false);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [content, timestamp]);

  return renderStructuredAiContent(displayed, isStreaming);
}

export function ChatContainer({ chatId, initialPrompt, ultraThinking: ultraThinkingProp = false }: ChatContainerProps) {
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

  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasTested, setHasTested] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hasDeployed, setHasDeployed] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const [ultraThinking, setUltraThinking] = useState(ultraThinkingProp);
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
      const browserWindow = window as SpeechRecognitionWindow;
      const SpeechRecognition =
        browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
        };
        recognitionRef.current.onerror = (event) => {
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

  const addMessage = (role: Message["role"], content: string, state?: WorkspaceState, form?: FormDef, isReadyCard?: boolean, engineCards?: EngineCards) => {
    setMessages(p => [...p, { id: Math.random().toString(36).substring(7), role, content, state, form, isReadyCard, engineCards, timestamp: Date.now() }]);
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

      // Phase 1: Parse natural language
      addMessage("thinking", "Analyzing your automation...\nParsing natural language input");
      await new Promise(r => setTimeout(r, 1500));

      // Phase 2: Identify trigger
      removeMessageByRole("thinking");
      addMessage("thinking", "Analyzing your automation...\n✓ Parsed natural language input\nIdentifying trigger event");
      await new Promise(r => setTimeout(r, 1200));

      // Phase 3: Map action path
      removeMessageByRole("thinking");
      addMessage("thinking", "Analyzing your automation...\n✓ Parsed natural language input\n✓ Trigger event identified\nMapping action path");
      await new Promise(r => setTimeout(r, 1200));

      // Phase 4: Resolve data schema
      removeMessageByRole("thinking");
      addMessage("thinking", "Analyzing your automation...\n✓ Parsed natural language input\n✓ Trigger event identified\n✓ Action path mapped\nResolving data schema");
      await new Promise(r => setTimeout(r, 1000));

      // Phase 5: Complete analysis
      removeMessageByRole("thinking");
      addMessage("thinking", "Analyzing your automation...\n✓ Parsed natural language input\n✓ Trigger event identified\n✓ Action path mapped\n✓ Data schema resolved");
      await new Promise(r => setTimeout(r, 800));

      removeMessageByRole("thinking");

      const defaultPhone = initialPrompt?.match(/\+?\d{10,14}/)?.[0] || "";

      // Phase 6: Show structured engine cards + form
      setWorkspaceState("collecting_inputs");
      addMessage(
        "ai",
        "",
        "collecting_inputs",
        {
          title: "Setup Configuration",
          description: "Enter the target destination details",
          fields: [
            { key: "phone", label: "Target Phone Number", type: "text", placeholder: "+1 (555) 000-0000", defaultValue: defaultPhone },
            { key: "message", label: "Message Content", type: "text", placeholder: "Hello, we received your form data!..." },
            { key: "priority", label: "Alert Priority", type: "select", options: [{label: "Standard", value: "standard"}, {label: "High Priority", value: "high"}] },
            { key: "enableLogging", label: "Enable Audit Logging", type: "toggle", defaultValue: true }
          ]
        },
        false,
        {
          trigger: "New form submission",
          action: "Send notification",
          setupFields: ["Phone number", "Message content", "Priority level"]
        }
      );
      setStep("wait_message");
    };

    runBootSequence();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormSubmit = async (messageId: string, values: Record<string, FieldValue>) => {
    setMessages(p => p.map(m => m.id === messageId ? { ...m, isFormSubmitted: true, formValues: values } : m));

    const inputSummary = values.phone || "the specified target";

    if (ultraThinking) {
      addMessage("system", "Using advanced reasoning mode...");
      await new Promise(r => setTimeout(r, 600));
    }

    if (step === "wait_message") {
      setWorkspaceState("ready_to_build");
      
      addMessage("thinking", "Building your automation...\nInitializing workflow engine");
      setNodes(n => n.map(x => x.id === "n2" ? { ...x, status: "completed", detail: "Configured via GPT-4o" } : x));

      await new Promise(r => setTimeout(r, 1300));
      removeMessageByRole("thinking");
      addMessage("thinking", "Building your automation...\n✓ Workflow engine initialized\nApplying configuration");
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "active" } : x));

      await new Promise(r => setTimeout(r, 1100));
      removeMessageByRole("thinking");
      addMessage("thinking", "Building your automation...\n✓ Workflow engine initialized\n✓ Configuration applied\nConnecting action nodes");

      await new Promise(r => setTimeout(r, 1100));
      removeMessageByRole("thinking");
      addMessage("thinking", "Building your automation...\n✓ Workflow engine initialized\n✓ Configuration applied\n✓ Action nodes connected\nValidating pipeline");

      await new Promise(r => setTimeout(r, 900));
      removeMessageByRole("thinking");
      
      setWorkspaceState("canvas_visible");

      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "completed", detail: `Sending to ${inputSummary}` } : x));
      addMessage(
        "ai",
        "",
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
      
      addMessage("thinking", "Building your automation...\nInitializing workflow engine");
      setNodes(n => n.map(x => x.id === "n2" ? { ...x, status: "completed", detail: "Configured via GPT-4o" } : x));

      await new Promise(r => setTimeout(r, 1300));
      removeMessageByRole("thinking");
      addMessage("thinking", "Building your automation...\n✓ Workflow engine initialized\nApplying configuration");
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "active" } : x));

      await new Promise(r => setTimeout(r, 1100));
      removeMessageByRole("thinking");
      addMessage("thinking", "Building your automation...\n✓ Workflow engine initialized\n✓ Configuration applied\nConnecting action nodes");

      await new Promise(r => setTimeout(r, 1100));
      removeMessageByRole("thinking");
      addMessage("thinking", "Building your automation...\n✓ Workflow engine initialized\n✓ Configuration applied\n✓ Action nodes connected\nValidating pipeline");

      await new Promise(r => setTimeout(r, 900));
      removeMessageByRole("thinking");
      
      setWorkspaceState("canvas_visible");

      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "completed", detail: `Sending to ${input}` } : x));
      addMessage(
        "ai",
        "",
        "canvas_visible",
        undefined,
        true
      );
      setStep("ready");

    } else if (step === "ready" || step === "deployed") {
      setWorkspaceState("ready_to_build");
      addMessage("thinking", "Analyzing your automation...\nParsing modification request");
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "active", detail: "Updating target..." } : x));
      
      await new Promise(r => setTimeout(r, 1200));
      removeMessageByRole("thinking");
      addMessage("thinking", "Analyzing your automation...\n✓ Modification request parsed\nRecomputing action graph");

      await new Promise(r => setTimeout(r, 1100));
      removeMessageByRole("thinking");
      addMessage("thinking", "Analyzing your automation...\n✓ Modification request parsed\n✓ Action graph recomputed\nApplying node changes");

      await new Promise(r => setTimeout(r, 1000));
      removeMessageByRole("thinking");
      addMessage("thinking", "Analyzing your automation...\n✓ Modification request parsed\n✓ Action graph recomputed\n✓ Node changes applied\nRevalidating pipeline");

      await new Promise(r => setTimeout(r, 800));
      removeMessageByRole("thinking");

      setHasTested(false);
      setHasDeployed(false);

      setWorkspaceState("canvas_visible");
      setNodes(n => n.map(x => x.id === "n3" ? { ...x, status: "completed", detail: "Updated action node" } : x));

      addMessage(
        "ai",
        "",
        "canvas_visible",
        undefined,
        true
      );
      setStep("ready");
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setIsPanelOpen(true);

    // Step through each node sequentially
    for (let i = 0; i < nodes.length; i++) {
      setNodes(n => n.map((x, idx) =>
        idx === i ? { ...x, status: "active" } : idx < i ? { ...x, status: "completed" } : x
      ));
      await new Promise(r => setTimeout(r, 800));
    }
    // Mark all as completed
    setNodes(n => n.map(x => ({ ...x, status: "completed" })));
    await new Promise(r => setTimeout(r, 400));

    setIsTesting(false);
    setHasTested(true);
    addMessage("ai", "**Test Passed**\nAll pipeline steps executed without errors. Ready to deploy.");
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsDeploying(false);
    setHasDeployed(true);
    setStep("deployed");
    addMessage("ai", "**Pipeline Deployed**\nYour automation is live and listening for incoming triggers.");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
  };

  const isInputDisabled = workspaceState === "ready_to_build" || workspaceState === "understanding";
  const isCanvasVisible = workspaceState === "canvas_visible";
  const hasMessages = messages.length > 0;

  // ── Derive system phase for the header status badge ──
  const systemPhase: SystemPhase = (() => {
    if (hasDeployed) return "success";
    if (isDeploying) return "deploying";
    if (isTesting) return "testing";
    if (hasTested && step === "ready") return "ready";
    if (step === "ready" && !hasTested) return "ready";
    if (workspaceState === "ready_to_build") return "building";
    if (workspaceState === "understanding" && hasMessages) return "building";
    return "idle";
  })();

  return (
    <div className="chat-shell-bg flex h-full w-full overflow-hidden">

      {/* ─── Main Chat Area ─── */}
      <div className={`relative flex h-full flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isPanelOpen && isCanvasVisible ? "w-[40%] shrink-0" : "flex-1"
      }`}>

        {/* Header */}
        <div className="chat-header-surface relative z-50 flex h-[52px] shrink-0 items-center justify-between border-b px-5">
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
                  className="chat-elevated-surface absolute left-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border py-1"
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

          {/* Right side: status + panel toggle */}
          <div className="flex items-center gap-2">
            <SystemStatusBar phase={systemPhase} />
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
                {isPanelOpen ? "Hide Preview" : "Show Preview"}
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="relative flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto chat-bg-gradient">
            <div className={`mx-auto px-5 pb-40 pt-6 transition-all duration-300 ${
              isPanelOpen && isCanvasVisible ? "max-w-full" : "max-w-3xl"
            }`} role="log" aria-live="polite" aria-label="Automation workspace">

              {/* Empty state */}
              {!hasMessages && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative flex flex-col items-center justify-center pt-[12vh]"
                >
                  {/* Ambient gradient backdrop */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[500px] rounded-full bg-accent/[0.03] blur-[100px]" />
                    <div className="absolute top-1/3 left-1/3 h-[200px] w-[300px] rounded-full bg-violet-500/[0.02] blur-[80px]" />
                  </div>

                  {/* Hero icon + heading */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent/[0.03] ring-1 ring-accent/[0.1] mb-6 shadow-[0_0_40px_rgba(59,130,246,0.08)]">
                      <Image src="/logo-new.png" alt="AutomateCraft" width={32} height={32} className="object-contain" />
                    </div>
                    <h3 className="text-[20px] font-semibold text-white/90 mb-2 tracking-tight">What would you like to automate?</h3>
                    <p className="text-[14px] text-white/35 mb-10 text-center max-w-[360px] leading-relaxed">
                      Describe your workflow in plain language and the engine will build it for you.
                    </p>
                  </div>

                  {/* Suggestion cards */}
                  <div className="relative z-10 grid grid-cols-2 gap-3 w-full max-w-[460px]">
                    {SUGGESTION_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        onClick={() => handleSuggestionClick(chip.desc)}
                        className="liquid-glass group flex flex-col gap-2 rounded-xl border border-white/[0.06] p-4 text-left transition-all duration-300 hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] hover:-translate-y-1"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/[0.06] ring-1 ring-accent/[0.08] group-hover:bg-accent/10 transition-colors">
                          <chip.icon className="h-3.5 w-3.5 text-accent/50 group-hover:text-accent transition-colors duration-250" />
                        </div>
                        <span className="text-[13px] font-medium text-white/60 group-hover:text-white/85 transition-colors duration-250">{chip.label}</span>
                        <span className="text-[11px] text-white/25 leading-relaxed group-hover:text-white/40 transition-colors duration-250">{chip.desc}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    layout
                    key={msg.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className={`mb-6 ${msg.role === "user" ? "flex justify-end" : msg.role === "system" ? "flex justify-center" : ""}`}
                  >
                    {/* ── USER MESSAGE ── */}
                    {msg.role === "user" && (
                      <div
                        className="max-w-[75%]"
                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        <div className="relative rounded-2xl rounded-br-sm bg-gradient-to-br from-[#1c1e26] to-[#12141a] border border-white/[0.08] px-5 py-3.5 text-[14px] leading-relaxed text-white/90 whitespace-pre-wrap shadow-[0_8px_24px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.02] inset-ring-1 inset-ring-white/[0.04]">
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
                      <div className="w-full flex gap-3">
                        <div className="pt-1 shrink-0">
                          <AiAvatar />
                        </div>
                        <div className="flex-1 min-w-0">

                        {/* Engine Analysis Cards (Trigger / Action / Setup) */}
                        {msg.engineCards && (
                          <EngineAnalysisCard
                            trigger={msg.engineCards.trigger}
                            action={msg.engineCards.action}
                            setupFields={msg.engineCards.setupFields}
                            timestamp={msg.timestamp}
                          />
                        )}

                        {/* AI text content — streamed, with accent border */}
                        {msg.content && (
                          <div className="py-1 mb-3">
                            <StreamContent content={msg.content} timestamp={msg.timestamp} />
                            {msg.timestamp && (
                              <span className="mt-2 block text-[10px] text-white/15">{formatRelativeTime(msg.timestamp)}</span>
                            )}
                          </div>
                        )}

                        {/* Form Card */}
                        {msg.form && !msg.isFormSubmitted && (
                          <div className="mt-3">
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

                        {/* Ready Card — inline Test / Deploy / Modify */}
                        {msg.isReadyCard && (
                          <div className="mt-3">
                            <ReadyCard
                              title="Automation ready"
                              description="Workflow built — review, test, and deploy below"
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
                      </div>
                    )}

                    {/* ── THINKING STATE ── */}
                    {msg.role === "thinking" && (
                      <div className="w-full flex gap-3">
                        <div className="pt-1 shrink-0">
                          <AiAvatar />
                        </div>
                        <div className="flex-1 min-w-0">
                          <ProgressCard steps={msg.content.split('\n')} />
                        </div>
                      </div>
                    )}

                    {/* ── SYSTEM MESSAGES ── */}
                    {msg.role === "system" && (
                      msg.content.toLowerCase().includes("building your automation") ||
                      msg.content.toLowerCase().includes("applying configuration") ? (
                        <div className="w-full">
                          <ThinkingIndicator label={msg.content} variant="card" />
                        </div>
                      ) : (
                        <ThinkingIndicator label={msg.content} variant="pill" />
                      )
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isAiTyping && (
                <div className="mb-6 flex justify-start">
                  <div className="w-full">
                    <div className="border-l-2 border-accent/20 pl-4 py-2">
                      <ThinkingIndicator label="Generating response" variant="pill" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>
        </div>

        {/* ─── Floating Input Bar ─── */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center bg-gradient-to-t from-[#08090b] via-[#08090b]/97 to-transparent px-5 pb-6 pt-16 pointer-events-none">
          <form
            onSubmit={handleSubmit}
            className={`chat-composer-surface w-full flex flex-col gap-2.5 rounded-2xl border px-5 py-4 transition-all duration-300 pointer-events-auto
              ${isPanelOpen && isCanvasVisible ? "max-w-full" : "max-w-3xl"}
              ${isInputDisabled ? "opacity-50 border-white/[0.04]" : "border-white/[0.06] focus-within:border-accent/25 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.08),0_0_30px_rgba(59,130,246,0.04)]"}
            `}
          >
            {/* LOGIC EXPLAINED:
            The workspace composer uses the same textarea reset as the homepage
            so browser-native focus borders do not create a second inner box. */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSubmit();
                }
              }}
              placeholder={isInputDisabled ? "Engine is processing..." : "Describe what you want to automate..."}
              disabled={isInputDisabled}
              className="prompt-textarea caret-accent w-full min-h-[52px] max-h-[180px] resize-none bg-transparent text-[14px] leading-relaxed text-white outline-none placeholder:text-white/20 disabled:cursor-not-allowed"
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
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 active:scale-[0.93] overflow-hidden ${
                    (!inputText.trim() && attachedFiles.length === 0) && !isInputDisabled
                      ? "bg-white/[0.04] text-white/20"
                      : isInputDisabled
                      ? "bg-transparent"
                      : "bg-gradient-to-br from-accent to-blue-600 text-white shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:scale-105"
                  }`}
                  aria-label={isInputDisabled ? "Processing" : "Send message"}
                >
                  <AnimatePresence mode="wait">
                    {isInputDisabled ? (
                      <motion.div 
                        key="loading"
                        className="absolute inset-0 rounded-xl border-2 border-accent/20 border-t-accent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <motion.div key="arrow" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
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
