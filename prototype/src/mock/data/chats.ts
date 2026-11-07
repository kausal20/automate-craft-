import type { UIMessage } from "ai";
import type { CanvasWorkflow, PipelineEvent } from "@/lib/agent";

/** Sample conversations shown in the sidebar and at /dashboard/chat/<id>. */
type SeedChat = {
  chatId: string;
  title: string;
  prompt: string;
  reply: string;
  starred: boolean;
  hoursAgo: number;
  workflow: CanvasWorkflow;
};

function flow(name: string, summary: string, labels: Array<[string, string]>): CanvasWorkflow {
  const nodes = labels.map(([label, detail], index) => ({
    id: `n${index + 1}`,
    type: index === 0 ? ("trigger" as const) : index === labels.length - 1 ? ("action" as const) : ("process" as const),
    label,
    detail,
    integration: null,
  }));
  return {
    nodes,
    edges: nodes.slice(1).map((node, index) => ({ id: `e${index + 1}`, source: nodes[index].id, target: node.id })),
    workflowName: name,
    summary,
    revision: 1,
  };
}

export const SEED_CHATS: SeedChat[] = [
  {
    chatId: "demo-lead-routing",
    title: "Lead routing to WhatsApp",
    prompt: "When a lead fills our website form, send them a WhatsApp greeting and add them to the CRM.",
    reply:
      "Your workflow is ready. It captures each submission, creates the CRM contact, then sends the greeting on WhatsApp. Connect WhatsApp and run a test before deploying.",
    starred: true,
    hoursAgo: 3,
    workflow: flow("Lead routing to WhatsApp", "Form submissions become CRM contacts and get a WhatsApp greeting.", [
      ["Form submission", "New entry on the website form"],
      ["Create CRM contact", "Maps name, email and phone"],
      ["Send WhatsApp greeting", "Uses the approved template"],
    ]),
  },
  {
    chatId: "demo-invoice-sync",
    title: "Invoice sync to Sheets",
    prompt: "Save every new Razorpay payment to Google Sheets and email finance a receipt.",
    reply:
      "Done. Each payment adds a row to your finance sheet and emails a receipt. The sheet needs Amount, Customer and Payment ID columns.",
    starred: false,
    hoursAgo: 27,
    workflow: flow("Invoice sync to Sheets", "Payments are logged to a sheet and finance gets a receipt.", [
      ["Payment captured", "Razorpay webhook event"],
      ["Append row", "Finance Ledger sheet"],
      ["Email receipt", "Sent to finance@"],
    ]),
  },
  {
    chatId: "demo-support-alerts",
    title: "High-priority support alerts",
    prompt: "Alert me on Slack when a support ticket is marked high priority.",
    reply: "Set up. High-priority tickets now post to #support-escalations with the customer name and a link.",
    starred: false,
    hoursAgo: 75,
    workflow: flow("High-priority support alerts", "High-priority tickets post to Slack.", [
      ["Ticket updated", "Incoming webhook"],
      ["Check priority", "Continues only when priority is high"],
      ["Post to Slack", "#support-escalations"],
    ]),
  },
];

function messagesFor(chat: SeedChat): UIMessage[] {
  const event: PipelineEvent = { type: "workflow_generated", workflow: chat.workflow, at: 0 };
  return [
    { id: `${chat.chatId}-u1`, role: "user", parts: [{ type: "text", text: chat.prompt }] },
    {
      id: `${chat.chatId}-a1`,
      role: "assistant",
      parts: [
        { type: "data-pipeline", data: event },
        { type: "text", text: chat.reply },
      ],
    },
  ] as UIMessage[];
}

/** Seeds the two localStorage records the real chat UI reads. */
export function seedChatStorage() {
  const now = Date.now();
  const sessions = Object.fromEntries(
    SEED_CHATS.map((chat) => [
      chat.chatId,
      {
        chatTitle: chat.title,
        isStarred: chat.starred,
        updatedAt: now - chat.hoursAgo * 3_600_000,
        step: "ready",
        workspaceState: "canvas_visible",
        nodes: chat.workflow.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          label: node.label,
          detail: node.detail,
          status: "completed",
        })),
        panelOpen: true,
        panelWidthPct: 50,
        isTesting: false,
        hasTested: false,
        isDeploying: false,
        hasDeployed: false,
        ultraThinking: false,
        autoSubmittedAt: now,
        persistedMessages: messagesFor(chat),
        promptHistory: [chat.prompt],
        selectedModel: null,
        feedbackLog: [],
      },
    ]),
  );

  localStorage.setItem("chat-storage", JSON.stringify({ state: { sessions }, version: 2 }));
  localStorage.setItem(
    "chat_index_v1",
    JSON.stringify(
      SEED_CHATS.map((chat) => ({
        chatId: chat.chatId,
        title: chat.title,
        updatedAt: new Date(now - chat.hoursAgo * 3_600_000).toISOString(),
        isStarred: chat.starred,
      })),
    ),
  );
}
