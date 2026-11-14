/**
 * Live adapters for the production agent ports (server-side only).
 *
 *  - Drafts / automations / activity: Supabase (service role, always filtered by user_id).
 *  - Credits: the existing reserver/refund + credit-store balance.
 *  - Connections: the existing encrypted vault (descriptors only) + connections table.
 *  - Credential binding: the existing vault -> n8n sync. Secrets never pass through here in plain form.
 *  - n8n: the existing HTTP client, extended with read/list/tag calls.
 */

import { n8nClient } from "@/lib/adapters/n8n/client/http-client";
import { syncCredentialToN8n } from "@/lib/adapters/n8n/credentials/sync-service";
import type { CredentialAttachmentMap } from "@/lib/adapters/n8n/credentials/mapper";
import { listConnectionsForUser } from "@/lib/connections";
import { listCredentialsForUser } from "@/lib/credentials";
import { getUserCredits } from "@/lib/credit-store";
import { hasN8nConfigured } from "@/lib/env";
import { refundRunCredits, reserveRunCredits } from "@/lib/execution/credits/reserver";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { isSupportedIntegration } from "@/lib/workflow";
import { logTechnical } from "./errors";
import type {
  ActivityEntry,
  ActivityLog,
  AgentAutomation,
  AutomationRepo,
  ConnectionDirectory,
  ConnectionSelection,
  CredentialBinder,
  CreditLedger,
  Draft,
  DraftRepo,
  DraftStatus,
  N8nGateway,
  N8nRef,
  SavedAccount,
  TestRunResult,
} from "./types";

/* ── Supabase: drafts ─────────────────────────────────────────────── */

type Row = Record<string, unknown>;

function draftToRow(d: Partial<Draft>): Row {
  const r: Row = {};
  if (d.id !== undefined) r.id = d.id;
  if (d.userId !== undefined) r.user_id = d.userId;
  if (d.status !== undefined) r.status = d.status;
  if (d.language !== undefined) r.language = d.language;
  if (d.prompt !== undefined) r.prompt = d.prompt;
  if (d.plan !== undefined) r.plan = d.plan;
  if (d.appsRequired !== undefined) r.apps_required = d.appsRequired;
  if (d.questions !== undefined) r.questions = d.questions;
  if (d.answers !== undefined) r.answers = d.answers;
  if (d.selections !== undefined) r.selections = d.selections;
  if (d.costEstimate !== undefined) r.cost_estimate = d.costEstimate;
  if (d.rejectionReason !== undefined) r.rejection_reason = d.rejectionReason;
  if (d.unsupportedRequests !== undefined) r.unsupported_requests = d.unsupportedRequests;
  if (d.automationId !== undefined) r.automation_id = d.automationId;
  if (d.buildAttempt !== undefined) r.build_attempt = d.buildAttempt;
  return r;
}

function rowToDraft(r: Row): Draft {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    status: r.status as DraftStatus,
    language: (r.language as string) ?? "en",
    prompt: (r.prompt as string) ?? "",
    plan: (r.plan as Draft["plan"]) ?? null,
    appsRequired: (r.apps_required as string[]) ?? [],
    questions: (r.questions as Draft["questions"]) ?? [],
    answers: (r.answers as Record<string, string>) ?? {},
    selections: (r.selections as ConnectionSelection[]) ?? [],
    costEstimate: Number(r.cost_estimate ?? 0),
    rejectionReason: (r.rejection_reason as string | null) ?? null,
    unsupportedRequests: (r.unsupported_requests as string[]) ?? [],
    automationId: (r.automation_id as string | null) ?? null,
    buildAttempt: Number(r.build_attempt ?? 0),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export class SupabaseDraftRepo implements DraftRepo {
  private db() {
    return createSupabaseAdminClient();
  }
  async create(draft: Draft) {
    const { data, error } = await this.db().from("agent_drafts").insert(draftToRow(draft)).select("*").single();
    if (error) throw new Error(`agent_drafts insert: ${error.message}`);
    return rowToDraft(data as Row);
  }
  async get(userId: string, draftId: string) {
    const { data, error } = await this.db().from("agent_drafts").select("*").eq("id", draftId).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(`agent_drafts get: ${error.message}`);
    return data ? rowToDraft(data as Row) : null;
  }
  async update(userId: string, draftId: string, patch: Partial<Draft>) {
    const row: Row = { ...draftToRow(patch), updated_at: new Date().toISOString() };
    delete row.id;
    delete row.user_id;
    const { data, error } = await this.db().from("agent_drafts").update(row).eq("id", draftId).eq("user_id", userId).select("*").maybeSingle();
    if (error) throw new Error(`agent_drafts update: ${error.message}`);
    return data ? rowToDraft(data as Row) : null;
  }
  async transition(userId: string, draftId: string, from: DraftStatus[], patch: Partial<Draft>) {
    // One UPDATE ... WHERE status IN (...) — atomic in Postgres.
    const row: Row = { ...draftToRow(patch), updated_at: new Date().toISOString() };
    delete row.id;
    delete row.user_id;
    const { data, error } = await this.db()
      .from("agent_drafts")
      .update(row)
      .eq("id", draftId)
      .eq("user_id", userId)
      .in("status", from)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`agent_drafts transition: ${error.message}`);
    return data ? rowToDraft(data as Row) : null;
  }
}

/* ── Supabase: automations ────────────────────────────────────────── */

function autoToRow(a: Partial<AgentAutomation>): Row {
  const r: Row = {};
  if (a.id !== undefined) r.id = a.id;
  if (a.userId !== undefined) r.user_id = a.userId;
  if (a.draftId !== undefined) r.draft_id = a.draftId;
  if (a.name !== undefined) r.name = a.name;
  if (a.language !== undefined) r.language = a.language;
  if (a.status !== undefined) r.status = a.status;
  if (a.appsRequired !== undefined) r.apps_required = a.appsRequired;
  if (a.selections !== undefined) r.connection_selections = a.selections;
  if (a.n8nWorkflowId !== undefined) r.n8n_workflow_id = a.n8nWorkflowId;
  if (a.testExecutionId !== undefined) r.test_execution_id = a.testExecutionId;
  if (a.lastMessage !== undefined) r.last_message = a.lastMessage;
  return r;
}

function rowToAuto(r: Row): AgentAutomation {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    draftId: r.draft_id as string,
    name: r.name as string,
    language: (r.language as string) ?? "en",
    status: r.status as AgentAutomation["status"],
    appsRequired: (r.apps_required as string[]) ?? [],
    selections: (r.connection_selections as ConnectionSelection[]) ?? [],
    n8nWorkflowId: (r.n8n_workflow_id as string | null) ?? null,
    testExecutionId: (r.test_execution_id as string | null) ?? null,
    lastMessage: (r.last_message as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export class SupabaseAutomationRepo implements AutomationRepo {
  private db() {
    return createSupabaseAdminClient();
  }
  async create(a: AgentAutomation) {
    const { data, error } = await this.db().from("agent_automations").upsert(autoToRow(a), { onConflict: "id", ignoreDuplicates: true }).select("*").maybeSingle();
    if (error) throw new Error(`agent_automations insert: ${error.message}`);
    if (data) return rowToAuto(data as Row);
    return (await this.get(a.userId, a.id))!;
  }
  async get(userId: string, id: string) {
    const { data, error } = await this.db().from("agent_automations").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(`agent_automations get: ${error.message}`);
    return data ? rowToAuto(data as Row) : null;
  }
  async list(userId: string) {
    const { data, error } = await this.db().from("agent_automations").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw new Error(`agent_automations list: ${error.message}`);
    return (data ?? []).map((r) => rowToAuto(r as Row));
  }
  async update(userId: string, id: string, patch: Partial<AgentAutomation>) {
    const row: Row = { ...autoToRow(patch), updated_at: new Date().toISOString() };
    delete row.id;
    delete row.user_id;
    const { data, error } = await this.db().from("agent_automations").update(row).eq("id", id).eq("user_id", userId).select("*").maybeSingle();
    if (error) throw new Error(`agent_automations update: ${error.message}`);
    return data ? rowToAuto(data as Row) : null;
  }
}

export class SupabaseActivityLog implements ActivityLog {
  async append(entry: Omit<ActivityEntry, "id" | "createdAt">) {
    const { error } = await createSupabaseAdminClient().from("agent_activity").insert({
      user_id: entry.userId,
      automation_id: entry.automationId,
      kind: entry.kind,
      message: entry.message,
    });
    if (error) logTechnical("Activity write failed.", { automationId: entry.automationId }, error.message);
  }
  async list(userId: string, automationId: string) {
    const { data, error } = await createSupabaseAdminClient()
      .from("agent_activity")
      .select("*")
      .eq("user_id", userId)
      .eq("automation_id", automationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`agent_activity list: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      automationId: r.automation_id as string,
      kind: r.kind as ActivityEntry["kind"],
      message: r.message as string,
      createdAt: r.created_at as string,
    }));
  }
}

/* ── Credits ──────────────────────────────────────────────────────── */

export const liveCreditLedger: CreditLedger = {
  async balance(userId) {
    const c = await getUserCredits(userId);
    return c.totalCredits;
  },
  async reserve(input) {
    try {
      const r = await reserveRunCredits(input);
      return r.reserved ? { ok: true } : { ok: false, reason: "insufficient" };
    } catch (error) {
      logTechnical("Credit reservation failed.", { referenceId: input.referenceId }, error);
      return { ok: false, reason: "error" };
    }
  },
  async settle() {
    // The reservation already deducted the credits; settling keeps it. Nothing to move.
  },
  async refund(input) {
    try {
      return (await refundRunCredits(input)).refunded;
    } catch (error) {
      logTechnical("Credit refund failed.", { referenceId: input.referenceId }, error);
      return false;
    }
  },
};

/* ── Connections ──────────────────────────────────────────────────── */

export const liveConnectionDirectory: ConnectionDirectory = {
  async listAccounts(userId) {
    const [creds, conns] = await Promise.all([listCredentialsForUser(userId), listConnectionsForUser(userId)]);
    const statusBy = new Map(conns.map((c) => [c.integration as string, c.status]));
    const nameBy = new Map(conns.map((c) => [c.integration as string, c.displayName]));
    return creds.map((c): SavedAccount => {
      const status = statusBy.get(c.integration);
      return {
        connectionId: c.id,
        integration: c.integration,
        label: c.name === "default" ? nameBy.get(c.integration) ?? c.integration : c.name,
        // A credential exists; the connection row (if any) must not be expired/revoked.
        usable: status === undefined || status === "connected",
      };
    });
  },
};

export const liveCredentialBinder: CredentialBinder = {
  async bind(userId, selections) {
    const creds = await listCredentialsForUser(userId);
    const attachments: CredentialAttachmentMap = {};
    for (const sel of selections) {
      const cred = creds.find((c) => c.id === sel.connectionId && c.integration === sel.integration);
      if (!cred || !isSupportedIntegration(sel.integration)) return { ok: false, integration: sel.integration };
      const outcome = await syncCredentialToN8n({ userId, integration: sel.integration, credentialName: cred.name });
      if (!outcome.synced) {
        logTechnical("Credential sync to n8n failed.", { integration: sel.integration, reason: outcome.reason });
        return { ok: false, integration: sel.integration };
      }
      attachments[outcome.n8nCredentialType] = { id: outcome.n8nCredentialId, name: `automatecraft:${sel.integration}:${cred.name}` };
    }
    return { ok: true, attachments };
  },
};

/* ── n8n ──────────────────────────────────────────────────────────── */

const POLL_INTERVAL_MS = 1500;
const POLL_ATTEMPTS = 40;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const liveN8nGateway: N8nGateway = {
  isConfigured() {
    return hasN8nConfigured();
  },
  async find({ userId, automationId }) {
    const prefix = `ac:${userId}:${automationId} |`;
    const res = await n8nClient.listWorkflows({ name: prefix });
    const hit = (res.data ?? []).find((w) => w.name.startsWith(prefix));
    return hit ? { id: hit.id, active: hit.active } : null;
  },
  async create(workflow) {
    const r = await n8nClient.createWorkflow({ ...workflow, active: undefined });
    return { id: r.id, active: r.active };
  },
  async update(workflowId, workflow) {
    const r = await n8nClient.updateWorkflow(workflowId, { ...workflow, active: undefined });
    return { id: r.id, active: r.active };
  },
  async tag(workflowId, tags) {
    try {
      const existing = (await n8nClient.listTags()).data ?? [];
      const ids: string[] = [];
      for (const name of tags) {
        const safe = name.slice(0, 24);
        const found = existing.find((t) => t.name === safe);
        ids.push(found ? found.id : (await n8nClient.createTag(safe)).id);
      }
      await n8nClient.setWorkflowTags(workflowId, ids);
    } catch (error) {
      // Tags are a convenience; the name prefix + our own record are the source of truth.
      logTechnical("n8n tagging failed (non-blocking).", { workflowId }, error);
    }
  },
  async activate(workflowId) {
    const r = await n8nClient.activateWorkflow(workflowId);
    return { id: r.id, active: r.active };
  },
  async deactivate(workflowId) {
    const r = await n8nClient.deactivateWorkflow(workflowId);
    return { id: r.id, active: r.active };
  },
  async get(workflowId): Promise<N8nRef | null> {
    try {
      const r = await n8nClient.getWorkflow(workflowId);
      return { id: r.id, active: r.active };
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
  },
  async testRun(workflowId, payload): Promise<TestRunResult> {
    const started = await n8nClient.triggerExecution(workflowId, payload);
    const executionId = started?.executionId ?? null;
    if (!executionId) return { executionId: null, finished: false, ok: false, steps: [], detail: "no execution id returned" };

    for (let i = 0; i < POLL_ATTEMPTS; i++) {
      const exec = await n8nClient.getExecution(executionId);
      if (exec.finished || exec.status === "success" || exec.status === "error" || exec.status === "canceled") {
        const runData = exec.data?.resultData?.runData ?? {};
        const steps = Object.entries(runData).map(([node, runs]) => {
          const err = runs.find((r) => r.error)?.error?.message;
          return err ? { node, ok: false, error: err } : { node, ok: true };
        });
        return { executionId, finished: true, ok: exec.status === "success" && steps.every((s) => s.ok), steps, detail: exec.status };
      }
      await sleep(POLL_INTERVAL_MS);
    }
    return { executionId, finished: false, ok: false, steps: [], detail: "test run timed out" };
  },
};
