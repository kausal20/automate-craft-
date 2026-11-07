import { buildDeterministicWorkflow } from "@/lib/automation";
import type { AgentState, CanvasWorkflow, PipelineEvent, PipelineStage } from "@/lib/agent";

/**
 * Scripted stand-in for POST /api/chat. No AI is called. It emits the same
 * AI SDK stream the real route does, so every chat state (stage progress,
 * clarification, canvas, streaming text) can be designed against it.
 *
 * Script:
 *   - Prompt under 20 characters on the first message: asks a clarifying question.
 *   - Contains "fail": stops at validation with an error, to design that state.
 *   - Anything else: full run ending in a workflow on the canvas.
 */

const STAGES: Array<{ stage: PipelineStage; label: string; state: AgentState; detail: string }> = [
  { stage: "intent", label: "Understanding your request...", state: "ANALYZING_INTENT", detail: "Automation request identified" },
  { stage: "plan", label: "Planning workflow...", state: "PLANNING_WORKFLOW", detail: "Steps planned" },
  { stage: "generate", label: "Generating workflow...", state: "GENERATING_WORKFLOW", detail: "Workflow generated" },
  { stage: "validate", label: "Validating workflow...", state: "VALIDATING_WORKFLOW", detail: "No blocking issues" },
];

const STAGE_DELAY_MS = 450;
const WORD_DELAY_MS = 28;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type IncomingMessage = { role: string; parts?: Array<{ type: string; text?: string }> };

function textOf(message: IncomingMessage | undefined) {
  return (message?.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ")
    .trim();
}

function workflowFromPrompt(prompt: string): CanvasWorkflow {
  const workflow = buildDeterministicWorkflow(prompt);
  const steps = [
    { label: workflow.trigger, detail: "Starts the workflow" },
    ...workflow.steps.map((step) => ({ label: step.name, detail: step.details.description })),
  ];
  const nodes = steps.map((step, index) => ({
    id: `n${index + 1}`,
    type: index === 0 ? ("trigger" as const) : index === steps.length - 1 ? ("action" as const) : ("process" as const),
    label: step.label,
    detail: step.detail,
    integration: null,
  }));
  return {
    nodes,
    edges: nodes.slice(1).map((node, index) => ({ id: `e${index + 1}`, source: nodes[index].id, target: node.id })),
    workflowName: workflow.name,
    summary: `${workflow.trigger}, then ${workflow.steps.length} steps.`,
    revision: 1,
  };
}

export function mockChatResponse(body: { messages?: IncomingMessage[] }) {
  const messages = body.messages ?? [];
  const userMessages = messages.filter((message) => message.role === "user");
  const prompt = textOf(userMessages[userMessages.length - 1]);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      const pipeline = (event: PipelineEvent) => send({ type: "data-pipeline", data: event });

      const streamText = async (text: string) => {
        const id = `text-${Date.now()}`;
        send({ type: "text-start", id });
        for (const word of text.split(" ")) {
          send({ type: "text-delta", id, delta: `${word} ` });
          await wait(WORD_DELAY_MS);
        }
        send({ type: "text-end", id });
      };

      send({ type: "start", messageId: `mock-${Date.now()}` });
      const completed: PipelineStage[] = [];

      if (userMessages.length === 1 && prompt.length < 20) {
        const question = "Which app should start this workflow, and where should the result go?";
        pipeline({
          type: "clarification_required",
          questions: [{ id: "q1", prompt: question, requirementKey: "trigger", blocking: true }],
          at: Date.now(),
        });
        await streamText(question);
      } else {
        const fails = /\bfail\b/i.test(prompt);
        let failed = false;

        for (const step of STAGES) {
          pipeline({ type: "stage_started", stage: step.stage, label: step.label, at: Date.now() });
          await wait(STAGE_DELAY_MS);

          if (fails && step.stage === "validate") {
            pipeline({
              type: "stage_failed",
              stage: step.stage,
              reason: "The WhatsApp step has no connected account.",
              code: "VALIDATION_FAILED",
              at: Date.now(),
            });
            failed = true;
            break;
          }

          pipeline({ type: "stage_completed", stage: step.stage, state: step.state, detail: step.detail, at: Date.now() });
          completed.push(step.stage);
          if (step.stage === "generate") {
            pipeline({ type: "workflow_generated", workflow: workflowFromPrompt(prompt), at: Date.now() });
          }
        }

        pipeline({
          type: "pipeline_finished",
          state: failed ? "FAILED" : "READY_FOR_DEPLOYMENT",
          completed,
          at: Date.now(),
        });
        await streamText(
          failed
            ? "I could not finish this workflow. The WhatsApp step has no connected account. Connect WhatsApp and try again."
            : "Your workflow is ready on the canvas. Review the steps, connect any missing apps, then run a test before deploying.",
        );
      }

      send({ type: "finish" });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}
