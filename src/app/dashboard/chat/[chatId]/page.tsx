import { ChatContainer } from "@/components/chat/ChatContainer";

interface ChatPageProps {
  params: Promise<{
    chatId: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const initialPrompt = typeof resolvedSearchParams.prompt === "string" ? resolvedSearchParams.prompt : undefined;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0a0a]">
      <ChatContainer chatId={resolvedParams.chatId} initialPrompt={initialPrompt} />
    </div>
  );
}
