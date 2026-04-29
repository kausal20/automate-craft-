"use client";

import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";

interface ChatWrapperProps {
  chatId: string;
  initialPrompt?: string;
  ultraThinking?: boolean;
}

export function ChatWrapper({ chatId, initialPrompt, ultraThinking }: ChatWrapperProps) {
  return (
    <ChatErrorBoundary>
      <ChatContainer chatId={chatId} initialPrompt={initialPrompt} ultraThinking={ultraThinking} />
    </ChatErrorBoundary>
  );
}
