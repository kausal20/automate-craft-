"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Copy, RefreshCcw, Edit2, Share2, Zap, Check, ArrowRight, Link2, ChevronDown } from "lucide-react";
import { AutomationMessage, AutomationBlueprint } from "@/types/automation";

/* ────────────────────────────────────────────
   Constants — outside component to avoid re-creation
   ──────────────────────────────────────────── */
const THINKING_STATUSES = [
  "Understanding your workflow…",
  "Selecting integrations…",
  "Generating your blueprint…",
  "Almost ready…",
] as const;

const FOLLOW_UP_SUGGESTIONS = [
  "Add error handling",
  "Connect more apps",
  "Test this workflow",
] as const;

/* ────────────────────────────────────────────
   Utilities
   ──────────────────────────────────────────── */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ────────────────────────────────────────────
   Word Streaming Hook
   ──────────────────────────────────────────── */
function useWordStream(text: string, isStreaming: boolean) {
  const [displayed, setDisplayed] = useState(isStreaming ? "" : text);
  const [isDone, setIsDone] = useState(!isStreaming);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(text);
      setIsDone(true);
      return;
    }

    setIsDone(false);
    const words = text.split(" ");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(words.slice(0, i + 1).join(" "));
      i++;
      if (i >= words.length) {
        clearInterval(interval);
        setIsDone(true);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [text, isStreaming]);

  return { displayed, isDone };
}

/* ────────────────────────────────────────────
   Markdown Renderer (safe)
   ──────────────────────────────────────────── */
function renderMarkdown(text: string) {
  if (!text) return null;
  const blocks = text.split("\n\n");

  return blocks.map((block, idx) => {
    // Bullet list
    if (block.startsWith("- ")) {
      const items = block.split("\n").filter((i) => i.startsWith("- ")).map((i) => i.slice(2));
      return (
        <ul key={idx} className="list-none pl-0 my-3 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] text-[var(--build-text-secondary)]">
              <span className="mt-2 h-1 w-1 rounded-full bg-[var(--build-accent)] shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: escapeHtml(item).replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--build-text-primary)] font-medium">$1</strong>') }} />
            </li>
          ))}
        </ul>
      );
    }
    // Code block
    if (block.startsWith("```")) {
      const lines = block.split("\n");
      const code = lines.slice(1, lines.length - 1).join("\n");
      return (
        <pre key={idx} className="bg-white/[0.03] border border-[var(--build-border)] p-3.5 rounded-lg text-[12px] font-mono my-3 overflow-x-auto text-[var(--build-text-secondary)]">
          <code>{code}</code>
        </pre>
      );
    }
    // Paragraph
    return (
      <p
        key={idx}
        className="my-2 text-[14px] leading-[1.7] text-[var(--build-text-secondary)]"
        dangerouslySetInnerHTML={{
          __html: escapeHtml(block).replace(
            /\*\*(.*?)\*\*/g,
            '<strong class="text-[var(--build-text-primary)] font-medium">$1</strong>'
          ),
        }}
      />
    );
  });
}

/* ────────────────────────────────────────────
   Blueprint Card (inline structured output)
   ──────────────────────────────────────────── */
function BlueprintCard({ blueprint, onConnect }: { blueprint: AutomationBlueprint; onConnect?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 rounded-xl border border-[var(--build-border)] bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden animate-fade-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--build-border)]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--build-accent-soft)]">
          <Zap className="h-3 w-3 text-[var(--build-accent)]" />
        </div>
        <span className="text-[13px] font-semibold text-[var(--build-text-primary)]">Automation Blueprint</span>
      </div>

      {/* Grid */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-[80px_1fr] gap-y-2.5 gap-x-3 text-[13px]">
          <span className="text-[var(--build-text-tertiary)] font-medium">Trigger</span>
          <span className="text-[var(--build-text-primary)]">{blueprint.trigger}</span>

          <span className="text-[var(--build-text-tertiary)] font-medium">Actions</span>
          <span className="text-[var(--build-text-primary)]">
            {blueprint.actions.join(" → ")}
          </span>

          <span className="text-[var(--build-text-tertiary)] font-medium">Apps</span>
          <div className="flex items-center gap-2 flex-wrap">
            {blueprint.integrations.map((app) => (
              <span key={app.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-[var(--build-border)] text-[12px] text-[var(--build-text-secondary)]">
                <span>{app.icon}</span>
                {app.name}
              </span>
            ))}
          </div>

          <span className="text-[var(--build-text-tertiary)] font-medium">Cost</span>
          <span className="text-amber-400 text-[12px] font-medium">~{blueprint.estimatedCost} credits / run</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--build-border)] bg-white/[0.01]">
        <button
          onClick={onConnect}
          className="flex items-center gap-2 rounded-lg bg-[var(--build-accent)] px-3.5 py-2 text-[12px] font-medium text-white transition-all hover:brightness-110 hover:shadow-[0_0_16px_var(--build-accent-glow)] active:scale-[0.97]"
        >
          <Link2 className="h-3.5 w-3.5" />
          Connect Apps
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-[var(--build-border)] bg-white/[0.02] px-3.5 py-2 text-[12px] font-medium text-[var(--build-text-secondary)] transition-all hover:bg-white/[0.04] hover:text-[var(--build-text-primary)] active:scale-[0.97]">
          <ArrowRight className="h-3.5 w-3.5" />
          View in Preview
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Action Toolbar (floating glass pill)
   ──────────────────────────────────────────── */
function ActionToolbar({ visible }: { visible: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const actions = [
    { icon: copied ? Check : Copy, label: copied ? "Copied" : "Copy", onClick: handleCopy },
    { icon: RefreshCcw, label: "Regenerate", onClick: () => {} },
    { icon: Edit2, label: "Edit prompt", onClick: () => {} },
    { icon: Share2, label: "Share", onClick: () => {} },
  ];

  return (
    <div
      className={`flex items-center gap-0.5 mt-2 px-1 py-0.5 rounded-lg bg-[var(--build-surface-raised)]/80 backdrop-blur-sm border border-[var(--build-border)] transition-all duration-200 w-fit ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
      }`}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="group relative p-1.5 rounded-md text-[var(--build-text-tertiary)] hover:text-[var(--build-text-primary)] hover:bg-white/[0.06] transition-all"
        >
          <action.icon className="h-3.5 w-3.5" />
          {/* Tooltip */}
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--build-surface-raised)] border border-[var(--build-border)] text-[var(--build-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   Follow-up Suggestion Chips
   ──────────────────────────────────────────── */
function FollowUpChips({ onSuggestionClick }: { onSuggestionClick?: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3 ml-11">
      {FOLLOW_UP_SUGGESTIONS.map((suggestion, i) => (
        <button
          key={suggestion}
          onClick={() => onSuggestionClick?.(suggestion)}
          className="rounded-full border border-[var(--build-border)] bg-white/[0.02] px-3 py-1 text-[11px] font-medium text-[var(--build-text-tertiary)] transition-all duration-200 hover:border-[var(--build-accent)]/40 hover:text-[var(--build-accent)] hover:bg-[var(--build-accent-soft)] hover:scale-[1.02] active:scale-[0.97] animate-fade-slide-up"
          style={{ animationDelay: `${300 + i * 60}ms` }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   AI Message
   ──────────────────────────────────────────── */
function AiMessage({
  msg,
  isLast,
  onActivateBlueprint,
  onSuggestionClick,
}: {
  msg: AutomationMessage;
  isLast: boolean;
  onActivateBlueprint?: (id: string) => void;
  onSuggestionClick?: (text: string) => void;
}) {
  const { displayed, isDone } = useWordStream(msg.content, !!msg.isStreaming);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="mb-6 animate-fade-slide-up">
      <div
        className="flex w-full gap-3 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-white text-[10px] font-bold shadow-sm shadow-sky-500/20 mt-0.5">
          AC
        </div>

        {/* Content — borderless, full-bleed */}
        <div className="flex-1 min-w-0 max-w-[85%]">
          {/* Left accent line + text */}
          <div className="border-l-[1.5px] border-[var(--build-accent)]/20 pl-4">
            {renderMarkdown(displayed)}

            {/* Streaming cursor */}
            {msg.isStreaming && !isDone && (
              <span className="inline-block w-[2px] h-[18px] bg-[var(--build-accent)] rounded-full ml-0.5 animate-pulse align-text-bottom" />
            )}
          </div>

          {/* Blueprint card (after streaming completes) */}
          {!msg.isStreaming && isDone && msg.blueprint && (
            <div className="ml-0 mt-1">
              <BlueprintCard
                blueprint={msg.blueprint}
                onConnect={() => onActivateBlueprint?.(msg.id)}
              />
            </div>
          )}

          {/* Action toolbar */}
          <div className="ml-4">
            <ActionToolbar visible={isHovered && isDone && !msg.isStreaming} />
          </div>

          {/* Follow-up chips — only on last completed AI message */}
          {isLast && isDone && !msg.isStreaming && (
            <FollowUpChips onSuggestionClick={onSuggestionClick} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   User Message
   ──────────────────────────────────────────── */
function UserMessage({ msg }: { msg: AutomationMessage }) {
  const [showTime, setShowTime] = useState(false);

  return (
    <div className="flex w-full justify-end mb-6 animate-fade-slide-up">
      <div
        className="flex max-w-[70%] flex-col items-end"
        onMouseEnter={() => setShowTime(true)}
        onMouseLeave={() => setShowTime(false)}
      >
        <div className="rounded-2xl rounded-tr-md bg-[var(--build-accent)]/10 border border-[var(--build-accent)]/15 px-4 py-3 text-[14px] text-[var(--build-text-primary)] whitespace-pre-wrap leading-relaxed">
          {msg.content}
        </div>
        <div
          className={`mt-1.5 text-[10px] text-[var(--build-text-tertiary)] transition-all duration-200 ${
            showTime ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          }`}
        >
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Generating / Thinking State
   ──────────────────────────────────────────── */
function GeneratingState() {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % THINKING_STATUSES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex w-full gap-3 mb-6 animate-fade-slide-up">
      {/* Avatar with breathing glow */}
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-white text-[10px] font-bold mt-0.5 animate-breathe">
        AC
        <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-pulse-glow" />
      </div>

      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="border-l-[1.5px] border-[var(--build-accent)]/20 pl-4">
          <div className="flex items-center gap-3 py-2">
            {/* Bouncing dots */}
            <div className="flex gap-[3px] items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-[5px] h-[5px] bg-[var(--build-accent)] rounded-full animate-dot-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>

            {/* Rotating status label */}
            <span className="text-[13px] text-[var(--build-text-tertiary)] font-medium transition-all duration-300">
              {THINKING_STATUSES[statusIdx]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Empty State Hero
   ──────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full pt-8 pb-8 relative">
      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[450px] rounded-full bg-sky-500/[0.04] blur-[120px] animate-breathe" />
        <div className="absolute top-1/3 left-1/3 h-[200px] w-[250px] rounded-full bg-violet-500/[0.03] blur-[100px] animate-breathe" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with breathing glow */}
        <div className="relative mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-600/5 border border-sky-500/10 shadow-[0_0_40px_rgba(14,165,233,0.1)]">
            <Zap className="h-7 w-7 text-sky-400" />
          </div>
          <div className="absolute inset-0 rounded-2xl animate-pulse-glow" />
        </div>

        <h1 className="text-[22px] font-semibold text-[var(--build-text-primary)] mb-2 tracking-tight">
          What would you like to automate?
        </h1>
        <p className="text-[14px] text-[var(--build-text-tertiary)] text-center max-w-[380px] leading-relaxed">
          Describe your workflow in plain language. We'll build the blueprint, connect the apps, and deploy it for you.
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Main ChatThread Component
   ──────────────────────────────────────────── */
interface ChatThreadProps {
  messages: AutomationMessage[];
  isGenerating: boolean;
  onActivateBlueprint?: (msgId: string) => void;
  onSuggestionClick?: (text: string) => void;
}

export function ChatThread({ messages, isGenerating, onActivateBlueprint, onSuggestionClick }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const lastAiIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ai") return i;
    }
    return -1;
  })();

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Top scroll shadow */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[var(--build-bg)] to-transparent z-10 pointer-events-none" />

      {/* Bottom scroll shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[var(--build-bg)] to-transparent z-10 pointer-events-none" />

      <div className="h-full overflow-y-auto px-6 py-12 build-scrollbar">
        <div className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((msg, i) =>
                msg.role === "user" ? (
                  <UserMessage key={msg.id} msg={msg} />
                ) : (
                  <AiMessage
                    key={msg.id}
                    msg={msg}
                    isLast={i === lastAiIdx && !isGenerating}
                    onActivateBlueprint={onActivateBlueprint}
                    onSuggestionClick={onSuggestionClick}
                  />
                )
              )}
              {isGenerating && <GeneratingState />}
            </>
          )}
          <div ref={endRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}
