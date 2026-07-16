/**
 * POST /api/chat — the ONLY production chat entry point.
 *
 * This route is a thin orchestration layer and nothing more. It:
 *   1. authenticates + rate-limits + charges credits,
 *   2. resolves the session id (chat id == agent session id),
 *   3. hands the message to `AutomationAgentOrchestrator.run`,
 *   4. streams the pipeline's real events back to the UI.
 *
 * It contains NO workflow logic, NO planning, NO generation, NO validation and
 * NO deployment logic — every one of those lives behind the orchestrator, and
 * the canonical Workflow IR is the only workflow representation produced. The
 * route never builds nodes and never calls an engine directly.
 *
 * The LLM is used for exactly one thing: answering messages the Intent Engine
 * determined are NOT automation requests. It cannot construct workflows.
 */

import { createOpenAI } from "@ai-sdk/openai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { getCurrentUser } from "@/lib/auth";
import { deductCredits, getUserCredits } from "@/lib/credit-store";
import { handleRouteError, jsonError } from "@/lib/api";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { withRetry, RETRY_POLICIES } from "@/lib/retry";
import { upsertChatMessagesForUser } from "@/lib/chat-message-store";
import { defaultAgentOrchestrator, summarizeRun, type PipelineEvent } from "@/lib/agent";
import { checkRateLimit } from "./rate-limit";
import {
  CONTEXT_WINDOW_ERROR_MESSAGE,
  MAX_ASSISTANT_TEXT_PART_CHARS,
  MAX_MODEL_IMAGE_DATA_URL_CHARS,
  MAX_MODEL_IMAGE_PARTS,
  MAX_MODEL_MESSAGES,
  MAX_MODEL_TEXT_CONTEXT_CHARS,
  MAX_MODEL_TEXT_PART_CHARS,
  truncateText,
} from "@/lib/ai/context-limits";

const log = createLogger("api/chat");

const STANDARD_COST = 5;
const ULTRA_COST = 10;
const CHAT_DEBUG = process.env.CHAT_DEBUG === "true" || process.env.NODE_ENV !== "production";
const CHAT_FREE_TEST_MODE =
  process.env.CHAT_FREE_TEST_MODE === "true" && process.env.NODE_ENV !== "production";

function readPositiveIntEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const STANDARD_MAX_OUTPUT_TOKENS = readPositiveIntEnv("CHAT_MAX_OUTPUT_TOKENS", 1200);
const ULTRA_MAX_OUTPUT_TOKENS = readPositiveIntEnv("CHAT_ULTRA_MAX_OUTPUT_TOKENS", 1800);

const isOpenRouter = Boolean(env.openaiBaseUrl?.includes("openrouter.ai"));
let openaiProvider: ReturnType<typeof createOpenAI> | null = null;

function getOpenAIProvider() {
  if (!openaiProvider) {
    const headers = isOpenRouter
      ? {
          "HTTP-Referer": env.openrouterSiteUrl,
          "X-Title": env.openrouterAppName,
        }
      : undefined;

    openaiProvider = createOpenAI({
      apiKey: env.openaiApiKey,
      ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
      ...(headers ? { headers } : {}),
      ...(isOpenRouter ? { name: "openrouter" } : {}),
    });
  }

  return openaiProvider;
}

/**
 * Conversational system prompt.
 *
 * Deliberately has no workflow-building instructions and no tools. Automation
 * requests never reach the model — the Intent Engine routes those into the
 * pipeline before this prompt is used.
 */
const CONVERSATION_PROMPT = `You are an automation expert for AutomateCraft, a business automation SaaS.

The user's message has already been classified as NOT an automation build request, so answer it directly and conversationally.

- Be concise, confident and technically precise. No filler.
- Never claim to have built, deployed, validated or tested a workflow. You cannot do any of those things — a separate pipeline does, and it is not running for this message.
- If the user seems to want an automation built, invite them to describe the trigger and the action they want, and the pipeline will take over on their next message.
- Never invent credentials, IDs, channel names, or field names.

Supported integrations: Google Forms, Google Sheets, WhatsApp, Email/Gmail, Slack, HubSpot, Salesforce, Razorpay, Stripe, Webhooks, CRM.`;

function getLatestUserText(messages: UIMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) return "";

  return latestUserMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

type UIMessagePart = UIMessage["parts"][number];
type UITextPart = Extract<UIMessagePart, { type: "text" }>;
type UIFilePart = Extract<UIMessagePart, { type: "file" }>;

function isTextPart(part: UIMessagePart): part is UITextPart {
  return part.type === "text";
}

function isImageFilePart(part: UIMessagePart): part is UIFilePart {
  return part.type === "file" && part.mediaType.startsWith("image/");
}

function createTextOnlyMessages(messages: UIMessage[]): UIMessage[] {
  const textOnlyMessages = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message): UIMessage | null => {
      const textParts = message.parts.filter(isTextPart);
      const imageParts = message.parts.filter(isImageFilePart);
      const allParts: UIMessage["parts"] = [...textParts, ...imageParts];

      if (textParts.length === 0 && imageParts.length === 0) return null;

      return {
        ...message,
        parts: allParts.length > 0 ? allParts : [{ type: "text" as const, text: getMessageText(message) }],
      };
    })
    .filter(
      (message): message is UIMessage =>
        message !== null &&
        message.parts.length > 0 &&
        (message.parts.some((part) => isTextPart(part) && part.text.length > 0) ||
          message.parts.some(isImageFilePart)),
    );

  return textOnlyMessages.length > 0 ? textOnlyMessages : messages;
}

function trimConversationHistory(messages: UIMessage[], maxMessages = MAX_MODEL_MESSAGES): UIMessage[] {
  if (messages.length <= maxMessages) return messages;
  return messages.slice(-maxMessages);
}

function addOmittedAttachmentNote(parts: UIMessage["parts"], name: string, reason: string) {
  parts.push({
    type: "text",
    text: `[Attachment "${name}" omitted: ${reason}.]`,
  });
}

function sanitizeMessagesForModel(messages: UIMessage[]): UIMessage[] {
  const recentMessages = createTextOnlyMessages(trimConversationHistory(messages));
  const sanitizedReversed: UIMessage[] = [];
  let remainingTextChars = MAX_MODEL_TEXT_CONTEXT_CHARS;
  let imagePartsKept = 0;

  for (const message of [...recentMessages].reverse()) {
    const parts: UIMessage["parts"] = [];

    for (const part of message.parts) {
      if (part.type === "text") {
        const text = part.text.trim();
        if (!text || remainingTextChars <= 0) continue;

        const partLimit =
          message.role === "assistant"
            ? MAX_ASSISTANT_TEXT_PART_CHARS
            : MAX_MODEL_TEXT_PART_CHARS;
        const nextText = truncateText(text, Math.min(partLimit, remainingTextChars));
        remainingTextChars -= nextText.length;
        parts.push({ ...part, text: nextText });
        continue;
      }

      const filePart = part as Extract<UIMessage["parts"][number], { type: "file" }>;
      if (filePart.type !== "file" || !filePart.mediaType?.startsWith("image/")) {
        continue;
      }

      const filename = filePart.filename || "image";
      const isDataUrl = filePart.url.startsWith("data:");
      const isTooLarge = isDataUrl && filePart.url.length > MAX_MODEL_IMAGE_DATA_URL_CHARS;
      const isOverLimit = imagePartsKept >= MAX_MODEL_IMAGE_PARTS;

      if (isTooLarge || isOverLimit) {
        if (remainingTextChars > 0) {
          addOmittedAttachmentNote(
            parts,
            filename,
            isTooLarge ? "image is too large for this request" : "image limit reached",
          );
          remainingTextChars -= parts[parts.length - 1]?.type === "text"
            ? (parts[parts.length - 1] as Extract<UIMessage["parts"][number], { type: "text" }>).text.length
            : 0;
        }
        continue;
      }

      imagePartsKept += 1;
      parts.push(filePart);
    }

    if (parts.length > 0) {
      sanitizedReversed.push({ ...message, parts });
    }
  }

  return sanitizedReversed.reverse();
}

function errorText(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) {
    const cause = "cause" in error ? errorText(error.cause) : "";
    return `${error.name} ${error.message} ${cause}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isContextWindowError(error: unknown) {
  const text = errorText(error).toLowerCase();
  return (
    text.includes("context_length_exceeded") ||
    text.includes("context window") ||
    text.includes("maximum context") ||
    text.includes("too many tokens")
  );
}

function resolveChatModelId() {
  const fallbackModel = isOpenRouter ? "openai/gpt-oss-120b:free" : "gpt-4o";
  const configuredModel = (env.openaiModel || "").trim() || fallbackModel;
  if (isOpenRouter && !configuredModel.includes("/")) {
    return `openai/${configuredModel}`;
  }

  return configuredModel;
}

function safeErrorMessage(error: unknown) {
  const text = errorText(error) || "Unknown provider error.";
  return text
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .slice(0, 1200);
}

function createPublicProviderError(error: unknown) {
  if (isContextWindowError(error)) return CONTEXT_WINDOW_ERROR_MESSAGE;
  return `AI provider error: ${safeErrorMessage(error)}`;
}

async function persistChatMessages({
  userId,
  chatId,
  messages,
  requestId,
  stage,
}: {
  userId: string;
  chatId: string | null;
  messages: UIMessage[];
  requestId: string;
  stage: "incoming" | "finish";
}) {
  if (!chatId) return;

  try {
    const saved = await upsertChatMessagesForUser({ userId, chatId, messages });
    if (CHAT_DEBUG) {
      log.info(`[${requestId}] persisted chat messages`, { chatId, stage, saved });
    }
  } catch (error) {
    log.warn(`[${requestId}] chat message persistence failed`, {
      chatId,
      stage,
      error: safeErrorMessage(error),
    });
  }
}

// Chat-specific retry policy — 3 attempts, exponential backoff, provider errors only
const CHAT_RETRY_POLICY = {
  ...RETRY_POLICIES.quick,
  maxAttempts: 3,
  baseDelayMs: 1200,
  maxDelayMs: 8000,
  isRetryable: (error: unknown) => {
    if (error instanceof TypeError) return true; // network failure
    const e = error as { status?: number; code?: string };
    if (typeof e?.status === "number") {
      return e.status >= 500 || e.status === 429 || e.status === 408;
    }
    if (e?.code === "ECONNRESET" || e?.code === "ETIMEDOUT") return true;
    return false;
  },
} as const;

function splitStreamText(text: string) {
  return text.match(/.{1,48}(?:\s|$)/g) ?? [text];
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleRouteError(new Error("Authentication required."), "Authentication required.", 401);
    }

    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil(rateCheck.retryAfterMs / 1000);
      return new Response(
        JSON.stringify({ error: `Too many requests. Please wait ${retryAfterSec}s before trying again.` }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSec) },
        },
      );
    }

    const body = await req.json();
    const { id, chatId: bodyChatId, messages, ultraThinking = false } = body as {
      id?: string;
      chatId?: string;
      messages: UIMessage[];
      ultraThinking?: boolean;
    };
    const resolvedChatId =
      typeof bodyChatId === "string" && bodyChatId.trim()
        ? bodyChatId.trim().slice(0, 140)
        : typeof id === "string" && id.trim()
          ? id.trim().slice(0, 140)
          : null;

    if (!Array.isArray(messages) || messages.length === 0) {
      return handleRouteError(new Error("No messages provided."), "No messages.", 400);
    }

    await persistChatMessages({
      userId: user.id,
      chatId: resolvedChatId,
      messages,
      requestId,
      stage: "incoming",
    });

    const modelMessages = sanitizeMessagesForModel(messages);
    if (modelMessages.length === 0) {
      return jsonError("Please enter a shorter prompt or attach a smaller file.", 400);
    }
    if (!modelMessages.some((message) => message.role === "user")) {
      return jsonError("Please enter a message before sending.", 400);
    }

    const latestUserText = getLatestUserText(modelMessages);
    // The chat id IS the agent session id, so the conversation and the
    // pipeline restore together under one key.
    const sessionId = resolvedChatId ?? `chat:${user.id}`;

    const creditCost = ultraThinking ? ULTRA_COST : STANDARD_COST;
    await getUserCredits(user.id);
    const credited = CHAT_FREE_TEST_MODE
      ? true
      : await deductCredits(
          user.id,
          creditCost,
          ultraThinking ? "Ultra Chat Generation" : "Chat Generation",
        );
    if (!credited) {
      return handleRouteError(new Error("Not enough credits."), "Not enough credits.", 402);
    }

    const onFinish = async ({ messages: finishedMessages }: { messages: UIMessage[] }) => {
      await persistChatMessages({
        userId: user.id,
        chatId: resolvedChatId,
        messages: finishedMessages,
        requestId,
        stage: "finish",
      });
    };

    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const events: PipelineEvent[] = [];

        // ── The single production execution path ──────────────────
        const session = await defaultAgentOrchestrator.run({
          sessionId,
          userId: user.id,
          latestUserText,
          emit: (event) => {
            events.push(event);
            // Deterministic stage events. The UI renders these; it never
            // infers pipeline state from prose.
            writer.write({ type: "data-pipeline", data: event });
          },
        });

        if (CHAT_DEBUG) {
          log.info(`[${requestId}] pipeline finished`, {
            sessionId,
            state: session.state,
            events: events.map((e) => `${e.type}:${"stage" in e ? e.stage : ""}`),
          });
        }

        // An automation request produces a deterministic summary built from
        // the artifacts the pipeline actually produced — no model involved,
        // so it cannot report work that did not happen.
        const summary = summarizeRun(events);
        if (summary) {
          const textId = crypto.randomUUID();
          writer.write({ type: "text-start", id: textId });
          for (const delta of splitStreamText(summary)) {
            writer.write({ type: "text-delta", id: textId, delta });
          }
          writer.write({ type: "text-end", id: textId });
          return;
        }

        // Not an automation request: answer conversationally. The model has no
        // tools and cannot build a workflow.
        if (!env.openaiApiKey) {
          const textId = crypto.randomUUID();
          writer.write({ type: "text-start", id: textId });
          writer.write({
            type: "text-delta",
            id: textId,
            delta: "OPENAI_API_KEY is missing. Add it to .env.local and restart the dev server.",
          });
          writer.write({ type: "text-end", id: textId });
          return;
        }

        const openai = getOpenAIProvider();
        const modelId = resolveChatModelId();
        const result = await withRetry(async () => {
          const modelMsgs = await convertToModelMessages(modelMessages, {
            ignoreIncompleteToolCalls: true,
          });
          return streamText({
            model: isOpenRouter ? openai.chat(modelId) : openai(modelId),
            system: CONVERSATION_PROMPT,
            messages: modelMsgs,
            maxOutputTokens: ultraThinking ? ULTRA_MAX_OUTPUT_TOKENS : STANDARD_MAX_OUTPUT_TOKENS,
            onError: ({ error }) => log.error(`[${requestId}] streamText provider error`, error),
          });
        }, CHAT_RETRY_POLICY);

        writer.merge(result.toUIMessageStream());
      },
      onFinish,
      onError: (error) => {
        log.error(`[${requestId}] chat stream failed`, error);
        return createPublicProviderError(error);
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    log.error(`[${requestId}] chat stream error`, error);
    if (isContextWindowError(error)) {
      return jsonError(CONTEXT_WINDOW_ERROR_MESSAGE, 413);
    }
    return handleRouteError(error, createPublicProviderError(error));
  }
}
