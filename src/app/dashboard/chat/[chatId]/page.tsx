import { ChatContainer } from "@/components/chat/ChatContainer";

interface ChatPageProps {
  params: {
    chatId: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ChatPage({ params, searchParams }: ChatPageProps) {
  const initialPrompt = typeof searchParams.prompt === "string" ? searchParams.prompt : undefined;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0a0a]">
      <ChatContainer chatId={params.chatId} initialPrompt={initialPrompt} />
    </div>
  );
}
