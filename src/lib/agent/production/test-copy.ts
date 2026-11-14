/**
 * Test-run gate on a disposable COPY of the workflow.
 *
 * The n8n public API has no "execute workflow" endpoint; the only external
 * trigger is a Webhook node. So the test run:
 *   1. builds a copy whose trigger is a unique test Webhook (respond when the
 *      last node finishes), named and tagged as a test copy for this user and
 *      automation;
 *   2. activates the copy and POSTs the sample payload to its webhook URL;
 *   3. polls the copy's executions until one finishes;
 *   4. passes only if that execution succeeded and no step errored;
 *   5. ALWAYS deactivates and deletes the copy, pass, fail, timeout or crash.
 *
 * The real workflow is untouched by all of this; the caller creates and
 * activates it only after a pass.
 */

import { createHash } from "node:crypto";
import type { N8nNode, N8nWorkflow } from "@/lib/adapters/n8n/client/types";
import { N8N_TRIGGER_NODE_NAME } from "@/lib/adapters/n8n/compiler/trigger-mapper";
import { logTechnical } from "./errors";
import type { TestRunResult } from "./types";

/** n8n tag names are short (24 chars), so tags carry hashes; names carry the full ids. */
export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

export function cornerTags(userId: string, automationId: string): string[] {
  return [`u-${shortHash(userId)}`, `a-${shortHash(automationId)}`];
}

export const TEST_COPY_TAG = "ac-test-copy";

export interface TestCopy {
  workflow: N8nWorkflow;
  /** Webhook path, unique per run. */
  path: string;
  tags: string[];
}

export function buildTestCopy(
  workflow: N8nWorkflow,
  ids: { userId: string; automationId: string; nonce: string },
): TestCopy {
  const path = `ac-test-${shortHash(`${ids.userId}:${ids.automationId}`)}-${ids.nonce}`;
  const original = workflow.nodes.find((n) => n.name === N8N_TRIGGER_NODE_NAME);
  const webhook: N8nNode = {
    // Same name as the real trigger so every existing connection still applies.
    name: N8N_TRIGGER_NODE_NAME,
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: original?.position ?? [0, 0],
    parameters: { httpMethod: "POST", path, responseMode: "lastNode", responseData: "allEntries", options: {} },
    webhookId: path,
  };
  const nodes = [webhook, ...workflow.nodes.filter((n) => n.name !== N8N_TRIGGER_NODE_NAME)];
  return {
    path,
    tags: [TEST_COPY_TAG, ...cornerTags(ids.userId, ids.automationId)],
    workflow: {
      ...workflow,
      name: `ac-test:${ids.userId}:${ids.automationId}:${ids.nonce} | test copy`.slice(0, 128),
      active: false,
      nodes,
    },
  };
}

/* ── Low-level client (live: n8n REST + webhook; tests: a mock) ──── */

export interface ExecutionSnapshot {
  id: string;
  finished: boolean;
  status: string;
  runData: Record<string, Array<{ error?: { message?: string } | null }>>;
}

export interface N8nTestClient {
  create(workflow: N8nWorkflow): Promise<{ id: string }>;
  tag(workflowId: string, tags: string[]): Promise<void>;
  activate(workflowId: string): Promise<void>;
  deactivate(workflowId: string): Promise<void>;
  remove(workflowId: string): Promise<void>;
  postWebhook(path: string, payload: Record<string, unknown>, timeoutMs: number): Promise<void>;
  /** Most recent execution of this workflow, with per-node run data. */
  latestExecution(workflowId: string): Promise<ExecutionSnapshot | null>;
  sleep(ms: number): Promise<void>;
  now(): number;
}

const TERMINAL = new Set(["success", "error", "crashed", "canceled"]);

export function evaluateExecution(exec: ExecutionSnapshot): TestRunResult {
  const steps = Object.entries(exec.runData).map(([node, runs]) => {
    const err = runs.find((r) => r.error)?.error?.message;
    return err ? { node, ok: false, error: err } : { node, ok: true };
  });
  return {
    executionId: exec.id,
    finished: true,
    ok: exec.status === "success" && steps.every((s) => s.ok),
    steps,
    detail: exec.status,
  };
}

export interface RunTestCopyInput {
  userId: string;
  automationId: string;
  workflow: N8nWorkflow;
  payload: Record<string, unknown>;
  nonce: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export async function runTestCopy(client: N8nTestClient, input: RunTestCopyInput): Promise<TestRunResult> {
  const pollIntervalMs = input.pollIntervalMs ?? 1500;
  const timeoutMs = input.timeoutMs ?? 90_000;
  const copy = buildTestCopy(input.workflow, input);
  let copyId: string | null = null;
  let lastSeen: string | null = null;

  try {
    copyId = (await client.create(copy.workflow)).id;
    await client.tag(copyId, copy.tags).catch(() => undefined); // tags are a convenience only
    await client.activate(copyId);

    // The webhook answers when the last node finishes; we still read the
    // execution record because that is where per-step results live.
    await client.postWebhook(copy.path, input.payload, timeoutMs).catch(() => undefined);

    const deadline = client.now() + timeoutMs;
    for (;;) {
      const exec = await client.latestExecution(copyId);
      if (exec) {
        lastSeen = exec.id;
        if (exec.finished || TERMINAL.has(exec.status)) return evaluateExecution(exec);
      }
      if (client.now() >= deadline) {
        return { executionId: lastSeen, finished: false, ok: false, steps: [], detail: "test run timed out" };
      }
      await client.sleep(pollIntervalMs);
    }
  } catch (error) {
    return {
      executionId: lastSeen,
      finished: false,
      ok: false,
      steps: [],
      detail: `test copy failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    if (copyId) {
      const id = copyId;
      await client.deactivate(id).catch((e) => logTechnical("Test copy deactivate failed.", { workflowId: id }, e));
      await client.remove(id).catch((e) => logTechnical("Test copy delete failed — remove it by hand.", { workflowId: id }, e));
    }
  }
}
