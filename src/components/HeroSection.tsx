"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { ArrowUp, Mic, Paperclip, Sparkles } from "lucide-react";
import HeroScene from "@/components/HeroScene";
import SocialMiniButtons from "@/components/home/SocialMiniButtons";
import { LoginModal } from "@/components/auth/LoginModal";
import type { AuthenticatedUser } from "@/lib/automation";

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const promptExamples = [
  "Send a WhatsApp when a new lead fills the form",
  "Save every form response to Google Sheets automatically",
  "Notify my team on Slack when a payment comes in",
];

export default function HeroSection({
  user,
  socialAuthEnabled,
  ssoEnabled,
}: {
  user: AuthenticatedUser | null;
  socialAuthEnabled: boolean;
  ssoEnabled: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [ultraThinking, setUltraThinking] = useState(false);

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const heightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const fileContent = `\n\n[Attached File: ${file.name}]\n${text}\n`;
        setPrompt((prev) => prev + fileContent);
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };
  
  const { scrollY } = useScroll();
  const heroYRaw = useTransform(scrollY, [0, 280, 700], [0, -16, -40]);
  const heroOpacityRaw = useTransform(scrollY, [0, 600], [1, 0.94]);
  const heroY = useSpring(heroYRaw, {
    stiffness: 88,
    damping: 24,
    mass: 0.55,
  });
  const heroOpacity = useSpring(heroOpacityRaw, {
    stiffness: 90,
    damping: 24,
    mass: 0.55,
  });

  const adjustPromptHeight = useEffectEvent(() => {
    const element = promptRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 260)}px`;
  });

  useEffect(() => {
    if (heightTimerRef.current) clearTimeout(heightTimerRef.current);
    heightTimerRef.current = setTimeout(() => adjustPromptHeight(), 60);
    return () => {
      if (heightTimerRef.current) clearTimeout(heightTimerRef.current);
    };
  }, [prompt]);

  useEffect(() => {
    if (prompt.trim().length > 0) return;
    const interval = setInterval(() => {
      setExampleIndex((current) => (current + 1) % promptExamples.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [prompt]);

  const handleSubmit = () => {
    if (!prompt.trim()) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const chatId = Math.random().toString(36).substring(7);
    router.push(`/dashboard/chat/${chatId}?prompt=${encodeURIComponent(prompt)}`);
  };

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const browserWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;

    let startText = promptRef.current?.value || "";
    if (startText.trim()) startText = startText.trim() + " ";

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) startText += finalTranscript + " ";
      setPrompt(startText + interimTranscript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    try {
      recognition.start();
    } catch (err) {
      console.error(err);
    }
  };

  const hasPrompt = prompt.trim().length > 0;
  const canSubmit = prompt.trim().length > 0;

  return (
    <div className="relative w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#141820] via-[#0a0c10] to-[#050507]">
      <section
        id="home"
        className="relative flex min-h-screen items-center overflow-hidden pb-10 pt-24 md:pb-14"
      >
        <HeroScene isPromptFocused={isPromptFocused} />
        {!user && (
          <>
            <div className="pointer-events-none absolute bottom-[-9rem] left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-accent/[0.05] blur-[140px]" />
          </>
        )}

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="mx-auto max-w-4xl text-[3.3rem] font-semibold leading-[0.94] tracking-[-0.08em] text-foreground sm:text-[4.4rem] lg:text-[5.4rem]">
                {user
                  ? <>Ready to build,<br /><span className="text-accent">{user.name || "there"}</span></>
                  : <>Describe it.<br /><span className="text-accent">AI builds it.</span><br />You run it.</>}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[1.02rem] leading-8 text-white/50 sm:text-lg">
                {user
                  ? "Describe what you need and the engine will generate it."
                  : "Type what you want to automate in plain English — the AI engine handles the rest."}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.015, y: -4 }}
              transition={{ duration: 0.85, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative mx-auto my-10 max-w-[600px] cursor-text"
              onClick={() => promptRef.current?.focus()}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-56 w-full rounded-full bg-accent/5 blur-[80px]"
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-8 top-10 h-28 w-28 rounded-full bg-accent/[0.08] blur-[40px]"
                  animate={{ x: [0, 15, -5, 0], y: [0, -12, 8, 0] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-8 right-10 h-28 w-28 rounded-full bg-white/5 blur-[40px]"
                  animate={{ x: [0, -10, 5, 0], y: [0, 12, -6, 0] }}
                  transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="rounded-[16px] bg-[#0a0a0a] p-1.5 text-left shadow-[0_24px_50px_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.1)] transition-[box-shadow,transform] duration-300 ease-out group-hover:shadow-[0_0_80px_rgba(79,142,247,0.12),0_32px_60px_rgba(79,142,247,0.1),0_16px_32px_rgba(28,28,28,0.12)]">
                  <div
                    className={`relative isolate overflow-hidden rounded-[16px] border px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out sm:px-5 sm:py-4.5 ${
                      hasPrompt
                        ? "border-accent/50 shadow-[0_0_0_4px_rgba(59,130,246,0.2),0_16px_34px_rgba(59,130,246,0.15)] scale-[1.01]"
                        : isPromptFocused
                        ? "border-accent/40 shadow-[0_0_0_3px_rgba(59,130,246,0.1),0_16px_34px_rgba(0,0,0,0.4)] scale-[1.005]"
                        : "border-white/10 group-hover:border-white/20 group-hover:shadow-[0_18px_42px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)]"
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,#1c1c1c_0%,#0a0a0a_100%)]" />
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/15 blur-[1px]" />
                    
                    <motion.div 
                      className="pointer-events-none absolute inset-0 rounded-[16px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" 
                      animate={{
                        background: hasPrompt 
                          ? ["radial-gradient(circle at top, rgba(59,130,246,0.2), transparent 55%)"]
                          : ["radial-gradient(circle at top, rgba(59,130,246,0.05), transparent 45%)", "radial-gradient(circle at top, rgba(59,130,246,0.15), transparent 50%)", "radial-gradient(circle at top, rgba(59,130,246,0.05), transparent 45%)"]
                      }}
                      transition={hasPrompt ? {} : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <div className="relative">
                      {!prompt ? (
                        <div className="pointer-events-none absolute inset-0 text-[1rem] leading-[1.55] sm:text-[1.05rem] overflow-hidden">
                          <AnimatePresence mode="popLayout">
                            <motion.div
                              key={exampleIndex}
                              initial={{ opacity: 0, x: 18 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -18 }}
                              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                              className="absolute inset-0 text-white/40"
                            >
                              {promptExamples[exampleIndex]}
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      ) : null}

                      {/* LOGIC EXPLAINED:
                      The textarea keeps the custom outer prompt-box focus state,
                      but drops any native browser focus rectangle by using the
                      shared `prompt-textarea` reset class. */}
                      <textarea
                        ref={promptRef}
                        rows={1}
                        value={prompt}
                        onFocus={() => setIsPromptFocused(true)}
                        onBlur={() => setIsPromptFocused(false)}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            if (canSubmit) handleSubmit();
                          }
                        }}
                        className="prompt-textarea caret-accent min-h-[72px] w-full resize-none border-none bg-transparent text-[1rem] leading-[1.55] text-white outline-none sm:min-h-[78px] sm:text-[1.05rem]"
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3.5">
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileUpload}
                          className="hidden" 
                          accept=".txt,.csv,.json,.md"
                        />
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          type="button"
                          aria-label="Attach file"
                          whileTap={{ scale: 0.94 }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out z-10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                        >
                          <Paperclip className="h-4 w-4" />
                        </motion.button>

                        <div className="relative z-20 flex items-center">
                          <button
                            type="button"
                            data-static-hover
                            onClick={(e) => {
                              e.stopPropagation();
                              setUltraThinking((current) => !current);
                            }}
                            aria-label="Toggle Ultra Thinking"
                            aria-pressed={ultraThinking}
                            className={`inline-flex h-9 items-center gap-2 rounded-full border px-2.5 text-[12px] font-semibold transition-all duration-200 ${
                              ultraThinking
                                ? "border-accent/25 bg-accent/10 text-white shadow-[0_0_18px_rgba(59,130,246,0.14)]"
                                : "border-white/8 bg-white/5 text-white/58"
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                                ultraThinking ? "bg-accent/18 text-accent" : "bg-white/8 text-white/48"
                              }`}
                            >
                              <Sparkles className="h-3 w-3" />
                            </span>
                            <span>Ultra</span>
                            <span
                              className={`relative h-5 w-9 rounded-full p-[2px] transition-colors duration-200 ${
                                ultraThinking ? "bg-accent/80" : "bg-white/16"
                              }`}
                            >
                              <motion.span
                                className="block h-4 w-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.28)]"
                                animate={{ x: ultraThinking ? 16 : 0 }}
                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                              />
                            </span>
                          </button>
                        </div>

                        <p className="text-[0.7rem] font-medium tracking-[0.02em] text-white/30 hidden sm:block ml-1">
                          Press Enter to start
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 ml-auto">
                        <motion.button
                          onClick={toggleListening}
                          type="button"
                          aria-label={isListening ? "Stop listening" : "Start dictation"}
                          whileTap={{ scale: 0.94 }}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out z-10 ${
                            isListening
                              ? "bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse"
                              : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <Mic className="h-4 w-4" />
                        </motion.button>

                        <motion.button
                          onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                          disabled={!canSubmit}
                          aria-label="Send automation prompt"
                          whileTap={canSubmit ? { scale: 0.94, rotate: 8 } : undefined}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out z-10 ${
                            canSubmit
                              ? "bg-accent text-white shadow-[0_8px_18px_rgba(79,142,247,0.3)] hover:scale-[1.05] hover:bg-[#5c95fb]"
                              : "bg-white/10 text-white/30 opacity-80 border border-white/5"
                          }`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* ── 3-Step Flow Strip ── */}
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto mt-4 flex items-center justify-center gap-3 sm:gap-5"
              >
                {[
                  { num: "1", text: "Describe task" },
                  { num: "2", text: "AI builds automation" },
                  { num: "3", text: "Run instantly" },
                ].map((step, i) => (
                  <div key={step.num} className="flex items-center gap-3 sm:gap-5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent ring-1 ring-accent/20">
                        {step.num}
                      </span>
                      <span className="text-[12px] font-medium text-white/35 sm:text-[13px]">
                        {step.text}
                      </span>
                    </div>
                    {i < 2 && (
                      <svg className="h-3 w-3 text-white/12 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

          </div>
        </motion.div>
      </section>

      {/* Sign-in Modal for unauthenticated anonymous attempts */}
      <LoginModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        nextUrl={`/dashboard?prompt=${encodeURIComponent(prompt)}`} 
      />

      {/* ── How It Works — only for public visitors ── */}
      {!user && (
        <div className="relative overflow-hidden pt-12">
          {/* Ambient light for the lower section */}
          <div className="pointer-events-none absolute left-[-12%] top-24 h-72 w-72 rounded-full bg-accent/[0.06] blur-[120px]" />
          <div className="pointer-events-none absolute right-[-10%] top-[28rem] h-80 w-80 rounded-full bg-white/[0.03] blur-[140px]" />
          <div className="pointer-events-none absolute bottom-[-8rem] left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent/[0.04] blur-[160px]" />
          {/* How it works */}
          <section className="relative py-28 overflow-hidden">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/35 to-transparent" />
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-[60%] bg-gradient-to-r from-transparent via-accent/15 to-transparent" />

            <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
              {/* Section header */}
              <div className="mb-20 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
                  How It Works
                </span>
                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  From idea to running automation<br className="hidden sm:block" /> in three steps
                </h2>
                <p className="mt-4 text-[1rem] leading-7 text-white/35 max-w-xl mx-auto">
                  No code. No complex setup. Just describe what you need and AI handles the rest.
                </p>
              </div>

              {/* Steps */}
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  {
                    step: "01",
                    icon: (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.277 2.903 2.85 2.903h9.09c1.573 0 2.85-1.303 2.85-2.903V5.84c0-1.6-1.277-2.903-2.85-2.903H5.6c-1.573 0-2.85 1.303-2.85 2.903v7.42Z" />
                      </svg>
                    ),
                    title: "Describe your workflow",
                    desc: "Type what you want in plain English. \"Send a WhatsApp to new leads\" or \"Save form responses to Google Sheets\".",
                    color: "from-accent/15 to-accent/[0.04]",
                    ring: "ring-accent/15",
                    glow: "rgba(59,130,246,0.12)",
                  },
                  {
                    step: "02",
                    icon: (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                      </svg>
                    ),
                    title: "AI builds the blueprint",
                    desc: "Our AI maps out the workflow steps, selects the right integrations, and generates a setup form tailored to your needs.",
                    color: "from-violet-500/15 to-violet-500/[0.04]",
                    ring: "ring-violet-500/15",
                    glow: "rgba(139,92,246,0.1)",
                  },
                  {
                    step: "03",
                    icon: (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                      </svg>
                    ),
                    title: "Connect, configure & deploy",
                    desc: "Link your apps with one click, fill in your details, and activate. Your automation runs 24/7 from that moment.",
                    color: "from-emerald-500/15 to-emerald-500/[0.04]",
                    ring: "ring-emerald-500/15",
                    glow: "rgba(52,211,153,0.1)",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    animate={{ y: [0, -8 - i * 2, 0] }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{
                      opacity: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
                      y: { duration: 7 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 },
                    }}
                    className="group relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-[#111113] to-[#0d0d0f] p-8 transition-all duration-300 hover:border-white/[0.1] hover:shadow-[0_20px_48px_rgba(0,0,0,0.6)]"
                    style={{ boxShadow: `0 0 60px ${item.glow}, 0 8px 32px rgba(0,0,0,0.4)` }}
                  >
                    {/* Step number */}
                    <p className="mb-6 font-mono text-[11px] font-bold tracking-[0.3em] text-white/15">
                      {item.step}
                    </p>

                    {/* Icon */}
                    <div
                      className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} ring-1 ${item.ring} text-white/70 transition-colors group-hover:text-white`}
                    >
                      {item.icon}
                    </div>

                    <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-[0.92rem] leading-7 text-white/35">
                      {item.desc}
                    </p>

                    {/* Connector arrow (hidden on last) */}
                    {i < 2 && (
                      <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.06] bg-[#0d0d0f]">
                          <svg className="h-3 w-3 text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-14 text-center">
                <Link
                  href="/signup"
                  className="inline-flex h-13 items-center gap-2.5 rounded-full bg-gradient-to-r from-accent to-blue-600 px-8 py-3.5 text-[0.95rem] font-semibold text-white shadow-[0_4px_24px_rgba(59,130,246,0.3)] transition-all duration-200 hover:shadow-[0_8px_32px_rgba(59,130,246,0.4)] hover:translate-y-[-2px]"
                >
                  Start for free — no credit card
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <p className="mt-4 text-[12px] text-white/20">10 free credits on signup · No card required</p>
              </div>
            </div>
          </section>



          {/* Integration logos strip */}
          <section className="relative py-16 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#08080a]/55 to-[#060608]/75" />
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

            <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
              <p className="mb-10 text-center text-[11px] font-bold uppercase tracking-[0.28em] text-white/20">
                Works with your favourite tools
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
                {/* WhatsApp */}
                <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300 hover:opacity-100">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  <span className="text-sm font-semibold text-white">WhatsApp</span>
                </div>
                {/* Gmail */}
                <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300 hover:opacity-100">
                  <svg className="h-6 w-6" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.548l8.073-6.055C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg>
                  <span className="text-sm font-semibold text-white">Gmail</span>
                </div>
                {/* Google Sheets */}
                <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300 hover:opacity-100">
                  <svg className="h-6 w-6" viewBox="0 0 24 24"><path d="M19.5 7H15V1.5L19.5 7z" fill="#188038"/><path d="M19.5 7H15V1.5l.5-.5H6a1 1 0 0 0-1 1v20a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V7.5l-.5-.5z" fill="#34A853"/><rect x="8" y="12" width="8" height="1.5" rx=".3" fill="#fff" opacity=".8"/><rect x="8" y="15" width="8" height="1.5" rx=".3" fill="#fff" opacity=".6"/><rect x="8" y="18" width="5" height="1.5" rx=".3" fill="#fff" opacity=".4"/></svg>
                  <span className="text-sm font-semibold text-white">Google Sheets</span>
                </div>
                {/* Slack */}
                <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300 hover:opacity-100">
                  <svg className="h-6 w-6" viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/><path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.527 2.527 0 0 1 0 8.834a2.527 2.527 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/><path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.271 0a2.527 2.527 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.164 0a2.527 2.527 0 0 1 2.521 2.522v6.312z" fill="#2EB67D"/><path d="M15.164 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.164 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.521 2.527 2.527 0 0 1 2.521-2.521h6.314A2.528 2.528 0 0 1 24 15.164a2.528 2.528 0 0 1-2.522 2.521h-6.314z" fill="#ECB22E"/></svg>
                  <span className="text-sm font-semibold text-white">Slack</span>
                </div>
                {/* Notion */}
                <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300 hover:opacity-100">
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.06 2.2c-.42-.326-.98-.7-2.055-.607L3.01 2.669c-.467.047-.56.28-.374.467l1.823 1.072zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.166V6.348c0-.606-.233-.933-.747-.887l-15.177.887c-.56.047-.746.327-.746.94zm14.337.746c.093.42 0 .84-.42.887l-.7.14v10.264c-.607.327-1.166.514-1.633.514-.747 0-.933-.234-1.493-.933l-4.573-7.178v6.945l1.447.327s0 .84-1.167.84l-3.22.187c-.093-.187 0-.653.327-.747l.84-.213V9.854L7.467 9.76c-.093-.42.14-1.026.793-1.073l3.453-.233 4.76 7.272v-6.432l-1.213-.14c-.094-.513.28-.886.747-.932l3.453-.234z" fillRule="evenodd"/></svg>
                  <span className="text-sm font-semibold text-white">Notion</span>
                </div>
                {/* HubSpot */}
                <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300 hover:opacity-100">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#FF7A59"><path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.978V3.08a2.2 2.2 0 0 0-2.199-2.199h-.026a2.2 2.2 0 0 0-2.199 2.199v.026a2.198 2.198 0 0 0 1.267 1.978V7.93a6.232 6.232 0 0 0-2.962 1.287L7.144 5.57a2.45 2.45 0 1 0-1.056 1.437l7.992 3.587a6.23 6.23 0 0 0-.828 3.094 6.24 6.24 0 0 0 .847 3.12L11.98 17.9a2.12 2.12 0 1 0 1.082 1.564l2.062-1.08a6.254 6.254 0 1 0 3.04-10.454z"/></svg>
                  <span className="text-sm font-semibold text-white">HubSpot</span>
                </div>
                <span className="text-sm text-white/20 font-medium">+ 40 more</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
