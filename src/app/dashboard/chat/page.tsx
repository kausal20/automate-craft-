"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatEntryPage() {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!prompt.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const chatId = Math.random().toString(36).slice(2, 10);
    router.push(`/dashboard/chat/${chatId}?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[760px]"
      >
        <div className="mx-auto max-w-[640px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Workspace
          </p>
          <h1 className="mt-5 text-[2.7rem] font-semibold leading-[0.96] tracking-[-0.06em] text-foreground">
            Build your automation
          </h1>
          <p className="mt-5 text-[0.98rem] leading-8 text-subtle">
            Start with a plain-language instruction. The workspace will turn it
            into a structured automation flow you can configure and deploy.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto mt-12 max-w-[720px]">
          <div className="rounded-[18px] border border-[#2D2D2D] bg-[#1C1C1C] px-5 py-5 shadow-[0_16px_32px_rgba(28,28,28,0.12)] transition-all duration-300 ease-out focus-within:border-accent focus-within:shadow-[0_0_0_4px_rgba(79,142,247,0.08),0_18px_38px_rgba(28,28,28,0.14)]">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Describe your automation..."
                className="min-h-[92px] w-full resize-none border-none bg-transparent pb-12 pr-14 text-[1rem] leading-[1.6] text-white outline-none placeholder:text-white/34"
              />

              <button
                type="submit"
                disabled={!prompt.trim() || isSubmitting}
                className={`absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                  prompt.trim() && !isSubmitting
                    ? "bg-accent text-white hover:scale-[1.05] hover:bg-[#5b95fb]"
                    : "bg-[#2D2D2D] text-white/36"
                }`}
                aria-label="Start workspace"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 border-t border-white/8 pt-3">
              <p className="text-xs font-medium text-white/34">
                Type your automation and press enter
              </p>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
