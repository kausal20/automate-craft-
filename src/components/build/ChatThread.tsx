"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, RefreshCcw, Edit2, Share, Zap } from "lucide-react";
import { AutomationMessage } from "@/types/automation";
import { IntegrationConnector } from "./IntegrationConnector";

interface ChatThreadProps {
  messages: AutomationMessage[];
  isGenerating: boolean;
  onActivateBlueprint?: (msgId: string) => void;
}

// Simple text streaming hook for the AI message
function useWordStream(text: string, isStreaming: boolean) {
  const [displayed, setDisplayed] = useState(isStreaming ? "" : text);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(text);
      return;
    }

    const words = text.split(" ");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(words.slice(0, i + 1).join(" "));
      i++;
      if (i >= words.length) {
        clearInterval(interval);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [text, isStreaming]);

  return displayed;
}

// Simple Markdown Parser (bold, bullet lists, code blocks)
function renderMarkdown(text: string) {
  if (!text) return null;
  const blocks = text.split("\n\n");
  
  return blocks.map((block, idx) => {
    if (block.startsWith("- ")) {
      const items = block.split("\n").filter(i => i.startsWith("- ")).map(i => i.slice(2));
      return (
        <ul key={idx} className="list-disc pl-5 my-2 space-y-1">
          {items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          ))}
        </ul>
      );
    }
    if (block.startsWith("```")) {
      const lines = block.split("\n");
      const code = lines.slice(1, lines.length - 1).join("\n");
      return (
        <pre key={idx} className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md text-xs font-mono my-2 overflow-x-auto">
          <code>{code}</code>
        </pre>
      );
    }
    // Paragraph
    return (
      <p key={idx} className="my-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: block.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
    );
  });
}

function AiMessage({ msg, onActivateBlueprint }: { msg: AutomationMessage; onActivateBlueprint?: (msgId: string) => void }) {
  const streamedText = useWordStream(msg.content, !!msg.isStreaming);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="flex w-full gap-4 mb-6 animate-slide-up-fade group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white text-xs font-bold shadow-sm">
        AC
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-start max-w-[85%]">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 text-[14px] text-gray-800 dark:text-gray-200 shadow-sm w-full">
          {renderMarkdown(streamedText)}

          {!msg.isStreaming && msg.blueprint && (
            <IntegrationConnector 
              integrations={msg.blueprint.integrations}
              estimatedCost={msg.blueprint.estimatedCost}
              onActivate={() => onActivateBlueprint?.(msg.id)}
              onDismiss={() => {}}
            />
          )}
        </div>

        {/* Action Toolbar */}
        <div className={`mt-1.5 flex items-center gap-1 transition-opacity duration-200 ${isHovered && !msg.isStreaming ? 'opacity-100' : 'opacity-0'}`}>
          <button className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Copy">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Regenerate">
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Edit prompt">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Share">
            <Share className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UserMessage({ msg }: { msg: AutomationMessage }) {
  const [showTime, setShowTime] = useState(false);
  
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex w-full justify-end mb-6 animate-slide-up-fade">
      <div 
        className="flex max-w-[70%] flex-col items-end"
        onMouseEnter={() => setShowTime(true)}
        onMouseLeave={() => setShowTime(false)}
      >
        <div className="rounded-2xl rounded-tr-sm bg-gray-100 dark:bg-gray-900 px-4 py-3 text-[14px] text-gray-900 dark:text-white border border-transparent dark:border-gray-800 shadow-sm whitespace-pre-wrap">
          {msg.content}
        </div>
        <div className={`mt-1 text-[10px] text-gray-400 transition-opacity duration-200 ${showTime ? 'opacity-100' : 'opacity-0'}`}>
          {time}
        </div>
      </div>
    </div>
  );
}

function GeneratingState() {
  const statuses = [
    "Understanding your workflow…",
    "Selecting integrations…",
    "Generating your blueprint…",
    "Almost ready…"
  ];
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [statuses.length]);

  return (
    <div className="flex w-full gap-4 mb-6 animate-slide-up-fade">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white text-xs font-bold shadow-sm">
        AC
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-start max-w-[85%]">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 shadow-sm flex items-center gap-3">
          <div className="flex gap-1 items-center h-4">
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-typing-dot" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-typing-dot" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-typing-dot" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
            {statuses[statusIdx]}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ChatThread({ messages, isGenerating, onActivateBlueprint }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
      <div className="mx-auto w-full max-w-3xl">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pt-12 pb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-900/20 text-sky-500 mb-6 shadow-sm border border-sky-100 dark:border-sky-900/30">
              <Zap className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Automate Your Work</h1>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              Describe the workflow you want to build. We'll generate a visual blueprint and set up the connections.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => 
              msg.role === "user" ? (
                <UserMessage key={msg.id} msg={msg} />
              ) : (
                <AiMessage key={msg.id} msg={msg} onActivateBlueprint={onActivateBlueprint} />
              )
            )}
            {isGenerating && <GeneratingState />}
          </>
        )}
        <div ref={endRef} className="h-4" />
      </div>
    </div>
  );
}
