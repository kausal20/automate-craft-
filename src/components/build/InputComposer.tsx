"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, ArrowUp, Square } from "lucide-react";

interface InputComposerProps {
  onSend: (text: string) => void;
  isGenerating: boolean;
  onStop: () => void;
  showChips: boolean;
}

const PLACEHOLDERS = [
  "Send WhatsApp to new leads from your CRM…",
  "Save Typeform responses to Google Sheets…",
  "Notify Slack when a HubSpot deal closes…",
  "Create Notion page for each Calendly booking…",
  "Email confirmation when Stripe payment succeeds…",
  "Assign Trello card when Jira ticket is created…",
];

const CHIPS = [
  { label: "Lead → WhatsApp", prompt: "Send a WhatsApp message to new leads added to my CRM." },
  { label: "Form → Sheets", prompt: "Save new Typeform responses into a Google Sheet." },
  { label: "Deal → Slack", prompt: "Send a Slack notification when a deal is closed won in HubSpot." },
  { label: "Booking → Notion", prompt: "Create a new Notion page whenever a Calendly booking is made." },
];

export function InputComposer({ onSend, isGenerating, onStop, showChips }: InputComposerProps) {
  const [input, setInput] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [currentPlaceholder, setCurrentPlaceholder] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typewriter effect for placeholder
  useEffect(() => {
    if (isFocused) {
      setCurrentPlaceholder("Describe your automation workflow...");
      return;
    }

    let isTyping = true;
    let charIndex = 0;
    let timeout: NodeJS.Timeout;

    const targetText = PLACEHOLDERS[placeholderIndex];

    const type = () => {
      if (charIndex < targetText.length) {
        setCurrentPlaceholder(targetText.slice(0, charIndex + 1));
        charIndex++;
        timeout = setTimeout(type, 50); // typing speed
      } else {
        isTyping = false;
        timeout = setTimeout(erase, 2000); // pause before erasing
      }
    };

    const erase = () => {
      if (charIndex > 0) {
        setCurrentPlaceholder(targetText.slice(0, charIndex - 1));
        charIndex--;
        timeout = setTimeout(erase, 20); // erase speed
      } else {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
      }
    };

    if (isTyping) {
      type();
    }

    return () => clearTimeout(timeout);
  }, [placeholderIndex, isFocused]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = "auto";
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 120); // roughly 1 to 5 rows
    textarea.style.height = `${newHeight}px`;
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChipClick = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      onSend(prompt);
      setInput("");
    }, 400);
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-6 px-4">
      {/* Chips */}
      {showChips && (
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {CHIPS.map((chip, i) => (
            <button
              key={i}
              onClick={() => handleChipClick(chip.prompt)}
              className="rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 shadow-sm transition-all hover:border-sky-500/50 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600 dark:hover:text-sky-400 animate-slide-up-fade"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Composer Box */}
      <div className="relative flex items-end gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm focus-within:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-500/10 transition-all">
        {/* Attach Button */}
        <button
          className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Attach context"
        >
          <Plus className="h-5 w-5" />
          <div className="absolute -top-8 hidden rounded bg-gray-900 dark:bg-white px-2 py-1 text-[10px] font-medium text-white dark:text-gray-900 shadow-sm group-hover:block whitespace-nowrap">
            Coming soon
          </div>
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={currentPlaceholder}
          disabled={isGenerating}
          rows={1}
          className="max-h-[120px] min-h-[24px] w-full resize-none bg-transparent py-2 text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 outline-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{ lineHeight: "24px" }}
        />

        {/* Send / Stop Button */}
        {isGenerating ? (
          <button
            onClick={onStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-500"
            aria-label="Stop generating"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
              input.trim()
                ? "bg-sky-500 text-white shadow-sm hover:bg-sky-600 hover:shadow"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
            }`}
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Footer Text */}
      <div className="mt-3 flex items-center justify-between px-2 text-[11px] text-gray-400 dark:text-gray-500">
        <span>Powered by AutomateCraft AI</span>
        <span>8 / 10 credits used</span>
      </div>
    </div>
  );
}
