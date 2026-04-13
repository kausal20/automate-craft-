"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ChevronDown, CheckCircle2, Home, Star, PenLine, Paperclip, Mic, X, Sparkles, Copy, Check, Pencil } from "lucide-react";
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
};

type ChatSequenceStep = "boot" | "wait_message" | "ready" | "deployed";
type WorkspaceState = "understanding" | "collecting_inputs" | "ready_to_build" | "canvas_visible";

interface ChatContainerProps {
  chatId: string;
  initialPrompt?: string;
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

function renderFormattedText(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('- ')) {
      return (
        <div key={i} className="flex items-start gap-2 ml-1 mt-1.5 mb-1.5 text-white/80">
          <div className="mt-1.5 h-1 w-1 rounded-full bg-accent/60 shrink-0" />
          <span className="leading-relaxed">{line.substring(2)}</span>
        </div>
      );
    }
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={i} className={line.trim() === "" ? "h-2" : "mb-1 leading-relaxed"}>
        {parts.map((p, j) => 
          p.startsWith('**') && p.endsWith('**') 
            ? <strong key={j} className="text-white font-semibold tracking-wide">{p.slice(2, -2)}</strong> 
            : p
        )}
      </div>
    );
  });
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
          { id: "init-user", role: "user", content: initialPrompt },
          { id: "init-sys", role: "system", content: "Understanding your automation..." }
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
  const isStarterPlan = true; // Mocked state for testing


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
    }
  }, [messages, step, workspaceState, nodes, chatTitle, isStarred, chatId]);

  const addMessage = (role: Message["role"], content: string, state?: WorkspaceState, form?: FormDef, isReadyCard?: boolean) => {
    setMessages(p => [...p, { id: Math.random().toString(36).substring(7), role, content, state, form, isReadyCard }]);
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

  const isInputDisabled = workspaceState === "ready_to_build" || workspaceState === "understanding";
  const isCanvasVisible = workspaceState === "canvas_visible";

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden relative justify-center">

      {/* Absolute Full Width Header */}
      <div className="absolute top-0 left-0 w-full flex h-[60px] shrink-0 items-center justify-between px-6 z-50 bg-[#0a0a0a]">
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
                className="h-8 w-[170px] rounded-lg border border-white/10 bg-[#151515] px-3 text-[13px] font-semibold tracking-wide text-white outline-none focus:border-white/20"
              />
            ) : (
              <>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 -ml-2 text-white/78 transition-colors hover:bg-white/5 hover:text-white focus:outline-none"
                >
                  <span className="text-[14px] font-semibold tracking-wide">{chatTitle}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-white/40 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => { setDraftTitle(chatTitle); setIsDropdownOpen(false); setIsEditingTitle(true); }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/38 transition-colors hover:bg-white/5 hover:text-white/72"
                >
                  <PenLine className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {ultraThinking && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="ml-2 flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-2 py-0.5"
              >
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-[0_0_6px_rgba(79,142,247,0.8)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent/90">Ultra Mode</span>
              </motion.div>
            )}
          </div>
          
          <AnimatePresence>
            {isDropdownOpen && !isEditingTitle && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-[#222] bg-[#1a1a1a] shadow-2xl overflow-hidden py-1 z-50"
              >
                <button
                  onClick={() => { setIsStarred((current) => !current); setIsDropdownOpen(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Star className={`h-3.5 w-3.5 ${isStarred ? "fill-current text-blue-500" : "text-white/45"}`} />
                  {isStarred ? "Unstar Project" : "Star Project"}
                </button>
                <Link href="/" className="flex px-4 py-2.5 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white">
                  Go to Homepage
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Dynamic Morphing Chat Area */}
      <motion.div 
        layout
        transition={{ type: "spring", bounce: 0, duration: 0.8, ease: "easeInOut" }}
        className={`relative flex flex-col z-20 shadow-2xl h-full bg-[#0a0a0a] ${
          isCanvasVisible || workspaceState === "ready_to_build" ? "w-[40%] min-w-[400px] border-r border-[#222]" : "w-full max-w-[1200px]"
        }`}
      >
        <div className="flex-1 overflow-y-auto px-6 pb-28 pt-[84px] custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex w-full mb-6 ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}
              >
                {msg.role === "user" && (
                  <div className="flex flex-col items-end gap-1.5 max-w-[85%]">
                    <div className="bg-[#121212] border border-[#222] text-white rounded-[18px] p-3.5 text-[14px] shadow-lg leading-relaxed whitespace-pre-wrap w-full">
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1 mr-1 opacity-60 hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-white transition-colors hover:bg-white/10"
                      >
                        {copiedId === msg.id ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                        {copiedId === msg.id ? <span className="text-green-400">Copied</span> : "Copy"}
                      </button>
                      <button 
                        onClick={() => handleEdit(msg.content)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-white transition-colors hover:bg-white/10"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                    </div>
                  </div>
                )}
                {msg.role === "ai" && (
                  <div className="w-full flex-1 max-w-[95%] text-[15px] leading-relaxed py-1">
                    {msg.state && !msg.form && !msg.isReadyCard && (
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/50">
                        <CheckCircle2 className="h-3 w-3" />
                        {msg.state === "understanding" && "Understanding"}
                        {msg.state === "collecting_inputs" && "Collecting Inputs"}
                        {msg.state === "ready_to_build" && "Building Automation"}
                        {msg.state === "canvas_visible" && "Ready"}
                      </div>
                    )}
                    
                    {!msg.form && !msg.isReadyCard && renderFormattedText(msg.content)}
                    
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
                        className="mt-2 mb-2 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 shadow-lg"
                      >
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                        <span className="text-[14px] text-white/80">
                          Configuration saved. Ready to deploy.
                        </span>
                      </motion.div>
                    )}

                    {msg.isReadyCard && (
                      <div className="mt-2">
                        <ReadyCard 
                          title="Automation Summary"
                          description="The canvas map has been built. You can test the end-to-end flow to ensure logic fires correctly without errors."
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
                {msg.role === "thinking" && (
                  <div className="w-full">
                    <ProgressCard steps={msg.content.split('\n')} />
                  </div>
                )}
                {msg.role === "system" && (
                  <div className="flex items-center gap-2 bg-[#222]/30 px-3 py-1.5 rounded-full border border-white/5">
                    <span className="text-[12px] font-medium tracking-wide text-[#888888]">{msg.content}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-4" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-12 pb-6 px-6 z-10 pointer-events-none flex justify-center">
          <form 
            onSubmit={handleSubmit}
            className={`w-full max-w-[850px] flex flex-col gap-2 rounded-2xl bg-[#111111] border border-[#222] p-4 shadow-2xl transition-all pointer-events-auto
              ${isInputDisabled ? "opacity-50" : "focus-within:border-[#444] focus-within:bg-[#151515] hover:border-[#333]"}
            `}
          >
            {/* Top status indicator */}
            <div className="flex items-center gap-2 px-1">
              <div className={`h-2 w-2 rounded-full ${isInputDisabled ? "bg-[#888]" : "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"}`} />
              <span className={`text-[13px] font-medium ${isInputDisabled ? "text-[#888]" : "text-cyan-500"}`}>
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
              placeholder={isInputDisabled ? "Thinking..." : "Message Agent"}
              disabled={isInputDisabled}
              className="caret-accent w-full min-h-[48px] max-h-[200px] resize-none bg-transparent text-[15px] pt-1 text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed px-1 custom-scrollbar"
            />

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors border border-transparent hover:border-white/10"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
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
                        ? "bg-accent/10 text-accent ring-1 ring-accent/30 shadow-[0_0_8px_rgba(79,142,247,0.2)]"
                        : "bg-[#1a1a1a] text-white/50 hover:bg-[#222] hover:text-white"
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
                        className="absolute bottom-[calc(100%+12px)] left-0 w-64 rounded-xl border border-[#222] bg-[#1a1a1a] p-4 shadow-xl z-50 origin-bottom-left"
                      >
                        <button
                          type="button"
                          onClick={() => setShowUpgradePopup(false)}
                          className="absolute right-2 top-2 rounded-md p-1 text-white/40 hover:bg-white/5 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <p className="text-[13px] text-white/80 pr-4 leading-relaxed">
                          Ultra Thinking is available in Plus and above plans.
                        </p>
                        <Link
                          href="/pricing"
                          onClick={() => setShowUpgradePopup(false)}
                          className="mt-3 block w-full rounded-lg bg-white py-1.5 text-center text-[13px] font-bold text-black transition-colors hover:bg-white/90 shadow-md hover:scale-[1.02]"
                        >
                          Upgrade to Plus
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Show attached files */}
                {attachedFiles.map(file => (
                   <div key={file.name} className="flex items-center gap-1.5 bg-[#222] border border-[#333] text-xs px-2.5 py-1.5 rounded-lg text-white/80">
                     <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                     <button type="button" onClick={() => removeFile(file.name)} className="hover:text-white text-white/40">
                       <X className="h-3.5 w-3.5" />
                     </button>
                   </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors border ${
                    isRecording 
                      ? "bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]" 
                      : "bg-[#1f1f1f] border-transparent text-white/60 hover:bg-[#2a2a2a] hover:text-white"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Use microphone"}
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={(!inputText.trim() && attachedFiles.length === 0) || isInputDisabled}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black disabled:opacity-30 disabled:bg-white/10 disabled:text-white transition-all focus:outline-none hover:bg-gray-200"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>

      <AnimatePresence>
        {(isCanvasVisible || workspaceState === "ready_to_build" || step === "deployed") && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5 }}
            className="flex-1 h-full z-10 pt-[60px]"
          >
            <InteractiveCanvas 
              nodes={nodes}
              onTest={handleTest}
              onDeploy={handleDeploy}
              isDeploying={isDeploying}
              hasDeployed={hasDeployed}
              isTesting={isTesting}
              hasTested={hasTested}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
