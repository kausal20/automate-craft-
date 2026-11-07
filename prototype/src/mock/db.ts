import type { AutomationRecord, AutomationRunRecord } from "@/lib/automation";
import { seedAutomations } from "./data/automations";
import { seedChatStorage } from "./data/chats";
import { seedCreditEvents, seedCredits, type MockCreditEvent, type MockCredits } from "./data/credits";
import { seedConnections, type MockConnection } from "./data/integrations";
import { seedRuns } from "./data/runs";
import { clearSessionCookie } from "./session";

/**
 * The fake database. It lives in this browser's localStorage, so changes
 * survive a refresh and "Reset mock data" restores the seed. Bump the key when
 * the seed shape changes.
 */
const DB_KEY = "ac_proto_db_v1";

export type MockDb = {
  automations: AutomationRecord[];
  runs: AutomationRunRecord[];
  connections: MockConnection[];
  credits: MockCredits;
  creditEvents: MockCreditEvent[];
  signupAt: number | null;
};

let cache: MockDb | null = null;

function seed(): MockDb {
  const automations = seedAutomations();
  return {
    automations,
    runs: seedRuns(automations),
    connections: seedConnections(),
    credits: seedCredits(),
    creditEvents: seedCreditEvents(),
    signupAt: null,
  };
}

export function getDb(): MockDb {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DB_KEY);
    cache = raw ? (JSON.parse(raw) as MockDb) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

/** Applies a change and persists it. */
export function updateDb<T>(change: (db: MockDb) => T): T {
  const db = getDb();
  const result = change(db);
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Storage full or blocked: the change still applies until the next reload.
  }
  return result;
}

/** First visit in this browser: seed the chat UI's own storage too. */
export function seedChatsOnFirstVisit() {
  try {
    if (localStorage.getItem(DB_KEY)) return;
    seedChatStorage();
    updateDb(() => undefined);
  } catch {
    // Storage blocked: pages still render, with no seeded chats.
  }
}

export function resetMockData() {
  cache = null;
  for (const key of [DB_KEY, "chat-storage", "chat_index_v1"]) localStorage.removeItem(key);
  clearSessionCookie();
}
