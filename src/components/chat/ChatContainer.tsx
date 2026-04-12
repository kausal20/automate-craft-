"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ChevronDown, CheckCircle2, Home, Star, PenLine, Paperclip, Mic, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { InteractiveCanvas, type FlowNode } from "./InteractiveCanvas";

type Message = {
  id: string;
  role: "user" | "ai" | "system";
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
  return words.slice(0, 3).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
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

  const addMessage = (role: Message["role"], content: string) => {
    setMessages(p => [...p, { id: Math.random().toString(36).substring(7), role, content }]);
  };

  const removeMessageByRole = (role: Message["role"]) => {
    setMessages(p => p.filter(m => m.role !== role));
  };

  useEffect(() => {
    const isInitialBoot = step === "boot" && workspaceState === "understanding";
    if (!isInitialBoot) return;

    const runBootSequence = async () => {
      setNodes(n => n.map(x => x.id === "n2" ? { ...x, status: "active" } : x));
      await new Promise(r => setTimeout(r, 2000));
      removeMessageByRole("system");
      setWorkspaceState("collecting_inputs");
      addMessage("ai", "I can build a form handler that uses AI to analyze the contents and sends a notification. Let's configure it.\n\nWhat phone number should receive the messages?");
      setStep("wait_message");
    };

    runBootSequence();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      addMessage("ai", "Automation ready! The canvas is built. You can test the end-to-end flow to ensure it works correctly.");
      setStep("ready");

    } else if (step === "ready" || step === "deployed") {
      await new Promise(r => setTimeout(r, 800));
      addMessage("ai", "I've noted that request. Keep in mind that live modifications to the pipeline will require running tests again!");
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
    addMessage("ai", "Test completely successfully! All logical steps resolved without errors. You are ready to deploy.");
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsDeploying(false);
    setHasDeployed(true);
    setStep("deployed");
    addMessage("ai", "Deployment complete! Your automation is now live and waiting for incoming triggers.");
  };

  const isInputDisabled = workspaceState === "ready_to_build" || workspaceState === "understanding";
  const isCanvasVisible = workspaceState === "canvas_visible";

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden relative justify-center">
      
      {/* Dynamic Morphing Chat Area */}
      <motion.div 
        layout
        transition={{ type: "spring", bounce: 0, duration: 0.8, ease: "easeInOut" }}
        className="relative flex flex-col z-20 shadow-2xl h-full w-full max-w-[1200px] bg-[#0a0a0a]"
      >
        <div className="flex h-[60px] shrink-0 items-center justify-between px-6 sticky top-0 z-20 bg-[#0a0a0a]">
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

        <div className="flex-1 overflow-y-auto px-6 pb-28 pt-6 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex w-full mb-6 ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}
              >
                {msg.role === "user" && (
                  <div className="bg-[#121212] border border-[#222] text-white rounded-[18px] p-3.5 max-w-[85%] text-[14px] shadow-lg leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}
                {msg.role === "ai" && (
                  <div className="text-gray-100 max-w-[95%] text-[15px] leading-relaxed whitespace-pre-wrap py-1">
                    {msg.content}
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
              className="w-full min-h-[48px] max-h-[200px] resize-none bg-transparent text-[15px] pt-1 text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed px-1 custom-scrollbar"
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

    </div>
  );
}
