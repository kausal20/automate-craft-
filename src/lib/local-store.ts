import { PLAN_IDS, planGrant } from "@/lib/plans";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UIMessage } from "ai";
import type {
  AutomationRecord,
  AutomationRunRecord,
  IntegrationConnectionRecord,
} from "@/lib/automation";
import type { WorkflowRunRecord, StepLogRecord } from "@/lib/workflow-run-store";
import type { WorkflowVersion } from "@/lib/workflow";
import type { AgentSession } from "@/lib/agent/models";
import { isOpenAccessMode } from "@/lib/env";
import { GUEST_USER_EMAIL, GUEST_USER_ID, GUEST_USER_NAME } from "@/lib/guest-access";
import { createLogger } from "@/lib/logger";

const log = createLogger("local-store");

export type LocalUserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: string;
  planCredits: number;
  extraCredits: number;
  onboarded?: boolean;
  role?: string;
  companySize?: string;
};

export type UsageLogRecord = {
  id: string;
  userId: string;
  action: string;
  creditsUsed: number;
  status: "Success" | "Failed";
  createdAt: string;
};

/** Local mirror of credit_transactions (same rules as the Supabase ledger). */
export type LocalCreditTransactionRecord = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PlanRecord = {
  id: string;
  name: string;
  price: string;
  credits: number;
  features: string[];
};

export type UserSubscriptionRecord = {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  status: "active" | "canceled";
};

export type ConsultationRequestRecord = {
  id: string;
  name: string;
  email: string;
  company: string;
  automationRequirement: string;
  budget: string;
  createdAt: string;
};

export type LocalCredentialRecord = {
  id: string;
  userId: string;
  integration: string;
  name: string;
  keyId: string;
  encryptedBlobBase64: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalConnectionRecord = {
  id: string;
  userId: string;
  integration: string;
  status: "pending" | "connected" | "expired" | "revoked";
  displayName: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalDeploymentRecord = {
  id: string;
  automationId: string;
  userId: string;
  versionId: string;
  adapter: string;
  state:
    | "draft"
    | "validated"
    | "deployable"
    | "deployed"
    | "active"
    | "paused"
    | "failed";
  externalRef: Record<string, unknown> | null;
  lastError: string | null;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalStepExecutionRecord = {
  id: string;
  runId: string;
  stepId: string;
  status: "pending" | "running" | "success" | "error" | "skipped";
  startedAt: string | null;
  finishedAt: string | null;
  output: Record<string, unknown> | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type LocalRuntimeEventRecord = {
  id: string;
  runId: string;
  stepId: string | null;
  kind: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type LocalOAuthStateRecord = {
  state: string;
  userId: string;
  provider: string;
  issuedAt: string;
  consumedAt: string | null;
  extra: Record<string, unknown>;
};

export type LocalScheduleRecord = {
  id: string;
  userId: string;
  automationId: string;
  cron: string;
  timezone: string;
  status: "active" | "paused";
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalRecentChatRecord = {
  id: string;
  userId: string;
  title: string;
  preview: string | null;
  href: string;
  messageCount: number;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LocalChatMessageRecord = {
  id: string;
  userId: string;
  chatId: string;
  sequenceIndex: number;
  role: UIMessage["role"];
  message: UIMessage;
  createdAt: string;
  updatedAt: string;
};

type LocalDatabase = {
  users: LocalUserRecord[];
  automations: AutomationRecord[];
  automationRuns: AutomationRunRecord[];
  connections: IntegrationConnectionRecord[];
  consultationRequests: ConsultationRequestRecord[];
  usageLogs: UsageLogRecord[];
  creditTransactions: LocalCreditTransactionRecord[];
  plans: PlanRecord[];
  subscriptions: UserSubscriptionRecord[];
  workflowRuns: WorkflowRunRecord[];
  stepLogs: StepLogRecord[];
  workflowVersions: WorkflowVersion[];
  credentialsVault: LocalCredentialRecord[];
  connectionsV2: LocalConnectionRecord[];
  deployments: LocalDeploymentRecord[];
  stepExecutions: LocalStepExecutionRecord[];
  runtimeEvents: LocalRuntimeEventRecord[];
  oauthState: LocalOAuthStateRecord[];
  schedules: LocalScheduleRecord[];
  recentChats: LocalRecentChatRecord[];
  chatMessages: LocalChatMessageRecord[];
  agentSessions: AgentSession[];
  /** Per-user custom MCP connectors (local mode). Secrets live in credentialsVault. */
  customMcpConnectors: Array<Record<string, unknown> & { id: string; userId: string }>;
};

const STORAGE_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(STORAGE_DIR, "automatecraft-local.json");

/**
 * Vercel and other serverless runtimes use a read-only filesystem.
 * The local file-based store cannot work in those environments.
 * Supabase environment variables must be configured for production use.
 */
function assertWritableRuntime() {
  // /var/task is the Vercel serverless function root — it is read-only.
  if (process.cwd().startsWith("/var/task")) {
    throw new Error(
      "AutomateCraft is running on a serverless platform (e.g. Vercel) where the " +
        "local file-based database is not supported. " +
        "Please configure your NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, " +
        "and SUPABASE_SERVICE_ROLE_KEY environment variables in your Vercel project settings."
    );
  }
}

/** Local plan list. Credit amounts come from src/lib/plans.ts; prices are unchanged display strings. */
const LOCAL_PLAN_PRICES: Record<string, string> = {
  plan_starter: "₹999",
  plan_starter_yearly: "₹9990",
  plan_plus: "₹2000",
  plan_plus_yearly: "₹20000",
  plan_pro: "₹3500",
  plan_pro_yearly: "₹35000",
};
const LOCAL_PLAN_FEATURES: Record<string, string[]> = {
  starter: ["Basic automations", "Email support"],
  plus: ["WhatsApp + Email + CRM", "Faster execution", "Priority support"],
  pro: ["Advanced workflows", "Priority execution", "Advanced analytics", "Dedicated support"],
};

function buildLocalPlans(): PlanRecord[] {
  const plans: PlanRecord[] = PLAN_IDS.map((id) => {
    const g = planGrant(id)!;
    return {
      id,
      name: g.name,
      price: LOCAL_PLAN_PRICES[id],
      credits: g.credits,
      features: [`${g.credits} Credits/${g.yearly ? "year" : "month"}`, ...LOCAL_PLAN_FEATURES[g.key]],
    };
  });
  plans.push({
    id: "plan_enterprise",
    name: "Enterprise",
    price: "Let's Talk",
    credits: 0,
    features: ["Custom credits", "Unlimited workflows", "Dedicated infrastructure", "Custom integrations", "Account manager"],
  });
  return plans;
}

const emptyDatabase: LocalDatabase = {
  users: [],
  automations: [],
  automationRuns: [],
  connections: [],
  consultationRequests: [],
  usageLogs: [],
  workflowRuns: [],
  stepLogs: [],
  workflowVersions: [],
  credentialsVault: [],
  connectionsV2: [],
  deployments: [],
  stepExecutions: [],
  runtimeEvents: [],
  oauthState: [],
  schedules: [],
  recentChats: [],
  chatMessages: [],
  agentSessions: [],
  customMcpConnectors: [],
  creditTransactions: [],
  plans: buildLocalPlans(),
  subscriptions: [],
};

function normalizeLocalDatabase(
  database: Partial<LocalDatabase> | null | undefined,
): LocalDatabase {
  const normalized = {
    users: database?.users ?? [],
    automations: database?.automations ?? [],
    automationRuns: database?.automationRuns ?? [],
    connections: database?.connections ?? [],
    consultationRequests: database?.consultationRequests ?? [],
    usageLogs: database?.usageLogs ?? [],
    creditTransactions: database?.creditTransactions ?? [],
    // Always from the plans config: stale credit numbers in the local file never win.
    plans: buildLocalPlans(),
    subscriptions: database?.subscriptions ?? [],
    workflowRuns: database?.workflowRuns ?? [],
    stepLogs: database?.stepLogs ?? [],
    workflowVersions: database?.workflowVersions ?? [],
    credentialsVault: database?.credentialsVault ?? [],
    connectionsV2: database?.connectionsV2 ?? [],
    deployments: database?.deployments ?? [],
    stepExecutions: database?.stepExecutions ?? [],
    runtimeEvents: database?.runtimeEvents ?? [],
    oauthState: database?.oauthState ?? [],
    schedules: database?.schedules ?? [],
    recentChats: database?.recentChats ?? [],
    chatMessages: database?.chatMessages ?? [],
    agentSessions: database?.agentSessions ?? [],
    customMcpConnectors: database?.customMcpConnectors ?? [],
  };

  if (
    isOpenAccessMode() &&
    !normalized.users.some((user) => user.id === GUEST_USER_ID)
  ) {
    normalized.users.unshift({
      id: GUEST_USER_ID,
      email: GUEST_USER_EMAIL,
      name: GUEST_USER_NAME,
      passwordHash: "guest-access-disabled",
      createdAt: new Date().toISOString(),
      planCredits: 10,
      extraCredits: 0,
    });
  }

  return normalized;
}

async function ensureStorage() {
  log.debug("Ensuring local storage exists.");
  assertWritableRuntime();
  await mkdir(STORAGE_DIR, { recursive: true });

  try {
    await readFile(STORAGE_FILE, "utf8");
  } catch {
    log.info("Local storage file missing. Creating a new one.");
    await writeFile(STORAGE_FILE, JSON.stringify(emptyDatabase, null, 2), "utf8");
  }
}

export async function readLocalDatabase(): Promise<LocalDatabase> {
  log.debug("Reading local database.");
  await ensureStorage();
  const raw = await readFile(STORAGE_FILE, "utf8");
  return normalizeLocalDatabase(JSON.parse(raw) as Partial<LocalDatabase>);
}

export async function writeLocalDatabase(database: LocalDatabase) {
  log.debug("Writing local database to disk.");
  await ensureStorage();
  await writeFile(STORAGE_FILE, JSON.stringify(database, null, 2), "utf8");
}

// --- Async mutex to serialize concurrent writes ---
let writeLock: Promise<void> = Promise.resolve();

export async function updateLocalDatabase<T>(
  updater: (database: LocalDatabase) => T | Promise<T>,
) {
  let releaseLock!: () => void;
  const previousLock = writeLock;
  writeLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await previousLock;
  log.debug("Write lock acquired.");

  try {
    const database = normalizeLocalDatabase(await readLocalDatabase());
    const result = await updater(database);
    await writeLocalDatabase(database);
    log.debug("Database update committed.");
    return result;
  } finally {
    releaseLock();
    log.debug("Write lock released.");
  }
}

export async function createConsultationRequest(input: {
  name: string;
  email: string;
  company: string;
  automationRequirement: string;
  budget: string;
}) {
  log.info("Saving consultation request for:", input.email);

  return updateLocalDatabase((database) => {
    const consultationRequest: ConsultationRequestRecord = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      company: input.company,
      automationRequirement: input.automationRequirement,
      budget: input.budget,
      createdAt: new Date().toISOString(),
    };

    database.consultationRequests.push(consultationRequest);
    log.info("Consultation request saved:", consultationRequest.id);
    return consultationRequest;
  });
}
