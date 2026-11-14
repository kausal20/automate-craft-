/**
 * Production agent — types and ports.
 *
 * Every side effect (database, credits, vault, n8n, model) sits behind a port
 * so the full flow — preview → confirm → build → test-run → active — runs in
 * tests with in-memory fakes and in production with live adapters.
 *
 * Ownership rule: every port method that reads or writes user data takes the
 * owner's userId and MUST filter by it. There is no "get by id" without a user.
 */

import type { N8nWorkflow } from "@/lib/adapters/n8n/client/types";
import type { CredentialAttachmentMap } from "@/lib/adapters/n8n/credentials/mapper";
import type { BrainPlan } from "../brain/plan-schema";

/* ── Drafts ───────────────────────────────────────────────────────── */

export type DraftStatus =
  | "needs_input"
  | "needs_connection"
  | "ready"
  | "rejected"
  | "building"
  | "built"
  | "failed_test";

export interface DraftQuestion {
  key: string;
  question: string;
  stepId: string | null;
  param: string | null;
}

/** A user's choice of which saved account to use for an app. */
export interface ConnectionSelection {
  integration: string;
  connectionId: string;
}

export interface PickerOption {
  connectionId: string;
  label: string;
}

export interface ConnectionNeed {
  integration: string;
  label: string;
  /** "missing" = nothing connected; "choose" = more than one account, user must pick. */
  state: "missing" | "choose";
  options: PickerOption[];
}

export interface Draft {
  id: string;
  userId: string;
  status: DraftStatus;
  language: string;
  prompt: string;
  plan: BrainPlan | null;
  appsRequired: string[];
  questions: DraftQuestion[];
  answers: Record<string, string>;
  selections: ConnectionSelection[];
  /** Estimated credits for building + the one test run. Shown before confirm. */
  costEstimate: number;
  /** Plain-language reason when status is "rejected". */
  rejectionReason: string | null;
  unsupportedRequests: string[];
  automationId: string | null;
  buildAttempt: number;
  createdAt: string;
  updatedAt: string;
}

export interface DraftRepo {
  create(draft: Draft): Promise<Draft>;
  get(userId: string, draftId: string): Promise<Draft | null>;
  update(userId: string, draftId: string, patch: Partial<Draft>): Promise<Draft | null>;
  /**
   * Atomic compare-and-set on status. Returns the updated draft, or null when
   * the draft's current status is not in `from` (someone else got there first).
   */
  transition(userId: string, draftId: string, from: DraftStatus[], patch: Partial<Draft>): Promise<Draft | null>;
}

/* ── Automations ──────────────────────────────────────────────────── */

export type AutomationStatus = "building" | "failed_test" | "active" | "paused" | "needs_attention";

export interface AgentAutomation {
  id: string;
  userId: string;
  draftId: string;
  name: string;
  language: string;
  status: AutomationStatus;
  appsRequired: string[];
  selections: ConnectionSelection[];
  n8nWorkflowId: string | null;
  testExecutionId: string | null;
  /** Last plain-language status message shown to the owner. */
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRepo {
  create(a: AgentAutomation): Promise<AgentAutomation>;
  get(userId: string, automationId: string): Promise<AgentAutomation | null>;
  list(userId: string): Promise<AgentAutomation[]>;
  update(userId: string, automationId: string, patch: Partial<AgentAutomation>): Promise<AgentAutomation | null>;
}

export type ActivityKind =
  | "built"
  | "test_passed"
  | "test_failed"
  | "turned_on"
  | "paused"
  | "resumed"
  | "connection_lost"
  | "build_blocked";

export interface ActivityEntry {
  id: string;
  userId: string;
  automationId: string;
  kind: ActivityKind;
  message: string;
  createdAt: string;
}

export interface ActivityLog {
  append(entry: Omit<ActivityEntry, "id" | "createdAt">): Promise<void>;
  list(userId: string, automationId: string): Promise<ActivityEntry[]>;
}

/* ── Credits ──────────────────────────────────────────────────────── */

export interface CreditLedger {
  balance(userId: string): Promise<number>;
  /** Deducts up front. Must never take the balance below zero. Idempotent per referenceId. */
  reserve(input: { userId: string; amount: number; referenceId: string; description: string }): Promise<{ ok: true } | { ok: false; reason: "insufficient" | "error" }>;
  /** Marks a reservation as used (the deduction stands). */
  settle(input: { userId: string; referenceId: string }): Promise<void>;
  /** Gives a reservation back. Idempotent per referenceId. */
  refund(input: { userId: string; amount: number; referenceId: string; description: string }): Promise<boolean>;
}

/* ── Connections (vault-backed) ───────────────────────────────────── */

export interface SavedAccount {
  /** Vault credential id. Never the secret itself. */
  connectionId: string;
  integration: string;
  /** Human label, e.g. "ops@company.com". */
  label: string;
  usable: boolean;
}

export interface ConnectionDirectory {
  listAccounts(userId: string): Promise<SavedAccount[]>;
}

export interface CredentialBinder {
  /**
   * Make sure each selected vault credential exists in n8n (existing sync) and
   * return the n8n attachment map. Credentials never leave the vault/n8n path.
   */
  bind(userId: string, selections: ConnectionSelection[]): Promise<{ ok: true; attachments: CredentialAttachmentMap } | { ok: false; integration: string }>;
}

/* ── n8n (the hands) ──────────────────────────────────────────────── */

export interface N8nRef {
  id: string;
  active: boolean;
}

export interface TestRunStep {
  /** n8n node name — server-side only, never shown to the user. */
  node: string;
  ok: boolean;
  error?: string;
}

export interface TestRunResult {
  executionId: string | null;
  finished: boolean;
  ok: boolean;
  steps: TestRunStep[];
  /** Technical summary for logs only. */
  detail?: string;
}

export interface N8nGateway {
  isConfigured(): boolean;
  /** Finds this user's workflow for this automation (the "corner"), if one exists. */
  find(corner: { userId: string; automationId: string }): Promise<N8nRef | null>;
  create(workflow: N8nWorkflow): Promise<N8nRef>;
  update(workflowId: string, workflow: N8nWorkflow): Promise<N8nRef>;
  /** Best effort: tags carry the owner and automation id. */
  tag(workflowId: string, tags: string[]): Promise<void>;
  activate(workflowId: string): Promise<N8nRef>;
  deactivate(workflowId: string): Promise<N8nRef>;
  get(workflowId: string): Promise<N8nRef | null>;
  /**
   * Test-run gate on a disposable copy: build a copy with a unique test Webhook
   * trigger, activate it, POST the payload, poll its executions, and ALWAYS
   * deactivate + delete the copy. The real workflow is not involved.
   */
  runTestCopy(input: {
    userId: string;
    automationId: string;
    workflow: N8nWorkflow;
    payload: Record<string, unknown>;
  }): Promise<TestRunResult>;
}

/* ── Service results (what routes return) ─────────────────────────── */

export interface PreviewResponse {
  draftId: string | null;
  status: "needs_input" | "needs_connection" | "ready" | "rejected";
  language: string;
  /** "I will make this: 1... 2... 3..." in the user's language. */
  preview: string;
  steps: string[];
  costEstimate: number;
  questions: Array<{ key: string; question: string }>;
  connections: ConnectionNeed[];
  unsupportedRequests: string[];
  /** Plain-language reason when rejected. */
  reason: string | null;
}

export type ConfirmResponse =
  | { status: "needs_input"; draftId: string; questions: Array<{ key: string; question: string }>; message: string }
  | { status: "needs_connection"; draftId: string; connections: ConnectionNeed[]; message: string }
  | { status: "not_confirmed"; draftId: string; message: string }
  | { status: "insufficient_credits"; draftId: string; message: string; needed: number; balance: number }
  | { status: "building"; draftId: string; automationId: string | null; message: string }
  | { status: "active"; draftId: string; automationId: string; message: string }
  | { status: "failed_test"; draftId: string; automationId: string; message: string }
  | { status: "blocked"; draftId: string; automationId: string | null; message: string };

export interface AutomationView {
  id: string;
  name: string;
  status: AutomationStatus;
  apps: string[];
  message: string | null;
  createdAt: string;
  updatedAt: string;
}
