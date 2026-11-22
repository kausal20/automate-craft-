import type { UIMessage } from "ai";
import { isSupabaseMode } from "@/lib/env";
import type { LocalChatMessageRecord } from "@/lib/local-store";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import { createLogger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase";

const log = createLogger("chat-message-store");

export const CHAT_MESSAGE_PERSIST_LIMIT = 100;

type PersistChatMessagesInput = {
  userId: string;
  chatId: string;
  messages: UIMessage[];
};

function normalizeChatId(chatId: string) {
  return chatId.trim().slice(0, 140);
}

function isUiMessageRole(role: unknown): role is UIMessage["role"] {
  return role === "system" || role === "user" || role === "assistant";
}

function isPersistableUiMessage(message: unknown): message is UIMessage {
  if (!message || typeof message !== "object") return false;

  const candidate = message as {
    id?: unknown;
    role?: unknown;
    parts?: unknown;
  };

  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    isUiMessageRole(candidate.role) &&
    Array.isArray(candidate.parts)
  );
}

function normalizeMessages(messages: UIMessage[]) {
  return messages
    .filter(isPersistableUiMessage)
    .slice(-CHAT_MESSAGE_PERSIST_LIMIT);
}

function mapLocalRecord(record: LocalChatMessageRecord): UIMessage | null {
  return isPersistableUiMessage(record.message) ? record.message : null;
}

function mapSupabaseRow(row: Record<string, unknown>): UIMessage | null {
  const message = row.message;
  if (isPersistableUiMessage(message)) return message;

  const fallback = {
    id: typeof row.id === "string" ? row.id : String(row.id ?? ""),
    role: row.role,
    parts: [],
  };

  return isPersistableUiMessage(fallback) ? fallback : null;
}

export async function listChatMessagesForUser(
  userId: string,
  chatId: string,
  limit = CHAT_MESSAGE_PERSIST_LIMIT,
): Promise<UIMessage[]> {
  const resolvedChatId = normalizeChatId(chatId);
  if (!resolvedChatId) return [];

  const resolvedLimit = Math.max(1, Math.min(Math.floor(limit), CHAT_MESSAGE_PERSIST_LIMIT));

  if (isSupabaseMode()) {
    try {
      const supabase = createSupabaseAdminClient();
      const response = await supabase
        .from("chat_messages")
        .select("id,role,message,sequence_index,created_at,updated_at")
        .eq("user_id", userId)
        .eq("chat_id", resolvedChatId)
        .order("sequence_index", { ascending: true })
        .limit(resolvedLimit);

      if (response.error) {
        log.warn("Could not list Supabase chat messages.", response.error);
        return [];
      }

      return (response.data ?? [])
        .map((row) => mapSupabaseRow(row as Record<string, unknown>))
        .filter((message): message is UIMessage => Boolean(message));
    } catch (error) {
      log.warn("Supabase chat message list failed.", error);
      return [];
    }
  }

  const database = await readLocalDatabase();
  return database.chatMessages
    .filter((entry) => entry.userId === userId && entry.chatId === resolvedChatId)
    .sort((left, right) => left.sequenceIndex - right.sequenceIndex)
    .slice(0, resolvedLimit)
    .map(mapLocalRecord)
    .filter((message): message is UIMessage => Boolean(message));
}

export async function upsertChatMessagesForUser(input: PersistChatMessagesInput) {
  const chatId = normalizeChatId(input.chatId);
  if (!chatId) return 0;

  const messages = normalizeMessages(input.messages);
  const now = new Date().toISOString();

  if (isSupabaseMode()) {
    try {
      const supabase = createSupabaseAdminClient();

      if (messages.length === 0) {
        const response = await supabase
          .from("chat_messages")
          .delete()
          .eq("user_id", input.userId)
          .eq("chat_id", chatId);

        if (response.error) {
          log.warn("Could not clear Supabase chat messages.", response.error);
        }

        return 0;
      }

      const rows = messages.map((message, index) => ({
        id: message.id,
        user_id: input.userId,
        chat_id: chatId,
        sequence_index: index,
        role: message.role,
        message,
        updated_at: now,
      }));

      const upsertResponse = await supabase
        .from("chat_messages")
        .upsert(rows, { onConflict: "user_id,chat_id,id" });

      if (upsertResponse.error) {
        log.warn("Could not upsert Supabase chat messages.", upsertResponse.error);
        return 0;
      }

      const existingResponse = await supabase
        .from("chat_messages")
        .select("id")
        .eq("user_id", input.userId)
        .eq("chat_id", chatId);

      if (existingResponse.error) {
        log.warn("Could not list existing Supabase chat message ids.", existingResponse.error);
        return messages.length;
      }

      const keepIds = new Set(messages.map((message) => message.id));
      const obsoleteIds = (existingResponse.data ?? [])
        .map((row) => String((row as { id?: unknown }).id ?? ""))
        .filter((id) => id && !keepIds.has(id));

      if (obsoleteIds.length > 0) {
        const deleteResponse = await supabase
          .from("chat_messages")
          .delete()
          .eq("user_id", input.userId)
          .eq("chat_id", chatId)
          .in("id", obsoleteIds);

        if (deleteResponse.error) {
          log.warn("Could not delete stale Supabase chat messages.", deleteResponse.error);
        }
      }

      return messages.length;
    } catch (error) {
      log.warn("Supabase chat message upsert failed.", error);
      return 0;
    }
  }

  return updateLocalDatabase((database) => {
    database.chatMessages = database.chatMessages.filter(
      (entry) => !(entry.userId === input.userId && entry.chatId === chatId),
    );

    database.chatMessages.push(
      ...messages.map((message, index) => ({
        id: message.id,
        userId: input.userId,
        chatId,
        sequenceIndex: index,
        role: message.role,
        message,
        createdAt: now,
        updatedAt: now,
      })),
    );

    return messages.length;
  });
}

export async function deleteChatMessagesForUser(userId: string, chatId: string) {
  const resolvedChatId = normalizeChatId(chatId);
  if (!resolvedChatId) return false;

  if (isSupabaseMode()) {
    try {
      const supabase = createSupabaseAdminClient();
      const response = await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", userId)
        .eq("chat_id", resolvedChatId);

      if (response.error) {
        log.warn("Could not delete Supabase chat messages.", response.error);
        return false;
      }

      return true;
    } catch (error) {
      log.warn("Supabase chat message delete failed.", error);
      return false;
    }
  }

  return updateLocalDatabase((database) => {
    const previousLength = database.chatMessages.length;
    database.chatMessages = database.chatMessages.filter(
      (entry) => !(entry.userId === userId && entry.chatId === resolvedChatId),
    );
    return database.chatMessages.length !== previousLength;
  });
}
