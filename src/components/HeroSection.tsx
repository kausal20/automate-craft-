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
import { ArrowUp, Mic, X as XIcon, Paperclip } from "lucide-react";
import HeroScene from "@/components/HeroScene";
import SocialMiniButtons from "@/components/home/SocialMiniButtons";
import { LoginModal } from "@/components/auth/LoginModal";
import type { AuthenticatedUser } from "@/lib/automation";

const promptExamples = [
  "Send WhatsApp message when someone fills my form",
  "Automatically reply to new leads with email",
  "Save form data to Google Sheets and notify me",
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
  
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const heightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
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

    // @ts-expect-error - SpeechRecognition is not standard TS
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
    recognition.onresult = (event: any) => {
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
    <>
      <section
        id="home"
        className="relative flex min-h-screen items-center overflow-hidden bg-background pb-10 pt-24 md:pb-14"
      >
        <HeroScene isPromptFocused={isPromptFocused} />

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
                  ? <>Ready to build Automation,<br /><span className="text-accent">{user.name || "there"}</span></>
                  : "Build AI Automations Instantly"}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[1.02rem] leading-8 text-foreground/62 sm:text-lg">
                {user
                  ? "Describe what you need and we'll generate it for you."
                  : "Describe your workflow and get a ready-to-run automation."}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.025, y: -6 }}
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
                  className="pointer-events-none absolute left-8 top-10 h-20 w-20 rounded-full bg-accent/[0.05] blur-3xl"
                  animate={{ x: [0, 10, -2, 0], y: [0, -8, 6, 0] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-8 right-10 h-24 w-24 rounded-full bg-white/60 blur-3xl"
                  animate={{ x: [0, -8, 4, 0], y: [0, 10, -4, 0] }}
                  transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="rounded-[16px] bg-[#0a0a0a] p-1.5 text-left shadow-[0_24px_50px_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.1)] transition-[box-shadow,transform] duration-300 ease-out group-hover:shadow-[0_32px_60px_rgba(79,142,247,0.2),0_16px_32px_rgba(28,28,28,0.12)]">
                  <div
                    className={`relative isolate overflow-hidden rounded-[16px] border px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out sm:px-5 sm:py-4.5 ${
                      hasPrompt
                        ? "border-accent/50 shadow-[0_0_0_4px_rgba(59,130,246,0.2),0_16px_34px_rgba(59,130,246,0.15)] scale-[1.015]"
                        : isPromptFocused
                        ? "border-accent/40 shadow-[0_0_0_3px_rgba(59,130,246,0.1),0_16px_34px_rgba(0,0,0,0.4)] scale-[1.01]"
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
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                              className="absolute inset-0 text-white/40"
                            >
                              {promptExamples[exampleIndex]}
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      ) : null}

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
                        className="min-h-[72px] w-full resize-none border-none bg-transparent text-[1rem] leading-[1.55] text-white outline-none sm:min-h-[78px] sm:text-[1.05rem]"
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3.5">
                      <p className="text-[0.7rem] font-medium tracking-[0.02em] text-white/30 hidden sm:block">
                        Press Enter to generate
                      </p>

                      <div className="flex items-center gap-2.5 ml-auto">
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
          </div>
        </motion.div>
      </section>

      {/* Sign-in Modal for unauthenticated anonymous attempts */}
      <LoginModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        nextUrl={`/dashboard/chat/new?prompt=${encodeURIComponent(prompt)}`} 
      />
    </>
  );
}
