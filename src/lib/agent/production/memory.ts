/**
 * In-memory implementations of the storage ports.
 *
 * Used by tests, and by local development when Supabase is not configured
 * (data is lost on restart — the live Supabase repos are the real store).
 * They enforce the same ownership rule as production: every read/write is
 * filtered by userId.
 */

import type {
  ActivityEntry,
  ActivityLog,
  AgentAutomation,
  AutomationRepo,
  CreditLedger,
  Draft,
  DraftRepo,
  DraftStatus,
} from "./types";

export class MemoryDraftRepo implements DraftRepo {
  private rows = new Map<string, Draft>();

  async create(draft: Draft) {
    this.rows.set(draft.id, structuredClone(draft));
    return structuredClone(draft);
  }
  async get(userId: string, draftId: string) {
    const d = this.rows.get(draftId);
    return d && d.userId === userId ? structuredClone(d) : null;
  }
  async update(userId: string, draftId: string, patch: Partial<Draft>) {
    const d = this.rows.get(draftId);
    if (!d || d.userId !== userId) return null;
    const next = { ...d, ...structuredClone(patch), id: d.id, userId: d.userId, updatedAt: new Date().toISOString() };
    this.rows.set(draftId, next);
    return structuredClone(next);
  }
  async transition(userId: string, draftId: string, from: DraftStatus[], patch: Partial<Draft>) {
    // Single-threaded JS: check-and-set happens without an await in between, so it is atomic here.
    const d = this.rows.get(draftId);
    if (!d || d.userId !== userId || !from.includes(d.status)) return null;
    const next = { ...d, ...structuredClone(patch), id: d.id, userId: d.userId, updatedAt: new Date().toISOString() };
    this.rows.set(draftId, next);
    return structuredClone(next);
  }
}

export class MemoryAutomationRepo implements AutomationRepo {
  private rows = new Map<string, AgentAutomation>();

  async create(a: AgentAutomation) {
    if (this.rows.has(a.id)) return structuredClone(this.rows.get(a.id)!);
    this.rows.set(a.id, structuredClone(a));
    return structuredClone(a);
  }
  async get(userId: string, id: string) {
    const a = this.rows.get(id);
    return a && a.userId === userId ? structuredClone(a) : null;
  }
  async list(userId: string) {
    return [...this.rows.values()].filter((a) => a.userId === userId).map((a) => structuredClone(a));
  }
  async update(userId: string, id: string, patch: Partial<AgentAutomation>) {
    const a = this.rows.get(id);
    if (!a || a.userId !== userId) return null;
    const next = { ...a, ...structuredClone(patch), id: a.id, userId: a.userId, updatedAt: new Date().toISOString() };
    this.rows.set(id, next);
    return structuredClone(next);
  }
}

export class MemoryActivityLog implements ActivityLog {
  private rows: ActivityEntry[] = [];
  private seq = 0;

  async append(entry: Omit<ActivityEntry, "id" | "createdAt">) {
    this.seq += 1;
    this.rows.push({ ...entry, id: `act_${this.seq}`, createdAt: new Date().toISOString() });
  }
  async list(userId: string, automationId: string) {
    return this.rows.filter((r) => r.userId === userId && r.automationId === automationId).map((r) => ({ ...r }));
  }
}

/** Ledger with real balance rules: never negative, idempotent per reference. */
export class MemoryCreditLedger implements CreditLedger {
  readonly balances = new Map<string, number>();
  readonly entries: Array<{ userId: string; type: "reserve" | "settle" | "refund"; amount: number; referenceId: string }> = [];

  constructor(initial: Record<string, number> = {}) {
    for (const [k, v] of Object.entries(initial)) this.balances.set(k, v);
  }

  async balance(userId: string) {
    return this.balances.get(userId) ?? 0;
  }
  async reserve(input: { userId: string; amount: number; referenceId: string; description: string }) {
    if (this.entries.some((e) => e.referenceId === input.referenceId && e.type === "reserve")) return { ok: true as const };
    const bal = this.balances.get(input.userId) ?? 0;
    if (input.amount > bal) return { ok: false as const, reason: "insufficient" as const };
    this.balances.set(input.userId, bal - input.amount);
    this.entries.push({ userId: input.userId, type: "reserve", amount: input.amount, referenceId: input.referenceId });
    return { ok: true as const };
  }
  async settle(input: { userId: string; referenceId: string }) {
    if (this.entries.some((e) => e.referenceId === input.referenceId && e.type === "settle")) return;
    this.entries.push({ userId: input.userId, type: "settle", amount: 0, referenceId: input.referenceId });
  }
  async refund(input: { userId: string; amount: number; referenceId: string; description: string }) {
    const reserved = this.entries.find((e) => e.referenceId === input.referenceId && e.type === "reserve");
    if (!reserved) return true; // nothing was taken
    if (this.entries.some((e) => e.referenceId === input.referenceId && e.type === "refund")) return true;
    this.balances.set(input.userId, (this.balances.get(input.userId) ?? 0) + reserved.amount);
    this.entries.push({ userId: input.userId, type: "refund", amount: reserved.amount, referenceId: input.referenceId });
    return true;
  }
}
