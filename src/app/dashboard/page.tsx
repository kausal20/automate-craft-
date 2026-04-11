"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Mic, Paperclip, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    setIsTyping(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    router.push(`/setup?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-6">
      <div className="w-full max-w-2xl text-center">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Build your automation
          </h1>
          <p className="mt-4 text-lg text-foreground/50">
            Describe your workflow and create a live automation
          </p>
        </motion.div>

        {/* Prompt Box Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative mx-auto"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            animate={{
              boxShadow: isFocused 
                ? "0 0 30px rgba(79, 142, 247, 0.25), 0 10px 40px rgba(0, 0, 0, 0.08)" 
                : "0 0 20px rgba(79, 142, 247, 0.1), 0 4px 12px rgba(0, 0, 0, 0.04)"
            }}
            className={`relative overflow-hidden rounded-[2rem] border bg-white p-2 transition-all duration-300 ${isFocused ? "border-accent/40" : "border-black/5"}`}
          >
            <div className="p-4">
              <textarea
                ref={textareaRef}
                rows={1}
                value={prompt}
                onChange={handlePromptChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ex: Sync Stripe customers with Google Sheets..."
                className="w-full resize-none border-none bg-transparent text-xl leading-relaxed text-accent placeholder:text-accent/20 outline-none"
              />
            </div>

            <div className="flex items-center justify-between px-4 pb-3 pt-2">
              <div className="flex items-center gap-1">
                <AnimatePresence>
                  {isTyping && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-[11px] font-semibold uppercase tracking-wider text-accent flex items-center gap-2"
                    >
                      <span className="flex gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1 w-1 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1 w-1 rounded-full bg-accent animate-bounce" />
                      </span>
                      AI understanding...
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/30 transition-all hover:bg-black/5 hover:text-foreground"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all ${isListening ? "bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "text-foreground/30 hover:bg-black/5 hover:text-foreground"}`}
                >
                  <Mic className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all shadow-lg ${prompt.trim() ? "bg-accent text-white shadow-accent/20 hover:scale-105 active:scale-95" : "bg-black/5 text-foreground/20 cursor-not-allowed"}`}
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Hints */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-sm font-medium text-foreground/25"
        >
          Tip: Press Enter to generate workflow
        </motion.p>
      </div>
    </div>
  );
}
