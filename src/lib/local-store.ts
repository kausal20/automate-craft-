import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AutomationRecord,
  AutomationRunRecord,
  IntegrationConnectionRecord,
} from "@/lib/automation";
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
};

export type UsageLogRecord = {
  id: string;
  userId: string;
  action: string;
  creditsUsed: number;
  status: "Success" | "Failed";
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

type LocalDatabase = {
  users: LocalUserRecord[];
  automations: AutomationRecord[];
  automationRuns: AutomationRunRecord[];
  connections: IntegrationConnectionRecord[];
  consultationRequests: ConsultationRequestRecord[];
  usageLogs: UsageLogRecord[];
  plans: PlanRecord[];
  subscriptions: UserSubscriptionRecord[];
};

const STORAGE_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(STORAGE_DIR, "automatecraft-local.json");

const emptyDatabase: LocalDatabase = {
  users: [],
  automations: [],
  automationRuns: [],
  connections: [],
  consultationRequests: [],
  usageLogs: [],
  plans: [
    {
      id: "plan_starter",
      name: "Starter",
      price: "₹999",
      credits: 500,
      features: ["500 Credits/month", "Basic automations", "Email support"],
    },
    {
      id: "plan_starter_yearly",
      name: "Starter (Yearly)",
      price: "₹9990",
      credits: 6000,
      features: ["6000 Credits/year", "Basic automations", "Email support"],
    },
    {
      id: "plan_plus",
      name: "Plus",
      price: "₹2000",
      credits: 1500,
      features: ["1500 Credits/month", "WhatsApp + Email + CRM", "Faster execution", "Priority support"],
    },
    {
      id: "plan_plus_yearly",
      name: "Plus (Yearly)",
      price: "₹20000",
      credits: 18000,
      features: ["18000 Credits/year", "WhatsApp + Email + CRM", "Faster execution", "Priority support"],
    },
    {
      id: "plan_pro",
      name: "Pro",
      price: "₹3500",
      credits: 3000,
      features: ["3000 Credits/month", "Advanced workflows", "Priority execution", "Advanced analytics", "Dedicated support"],
    },
    {
      id: "plan_pro_yearly",
      name: "Pro (Yearly)",
      price: "₹35000",
      credits: 36000,
      features: ["36000 Credits/year", "Advanced workflows", "Priority execution", "Advanced analytics", "Dedicated support"],
    },
    {
      id: "plan_enterprise",
      name: "Enterprise",
      price: "Let's Talk",
      credits: 0,
      features: ["Custom credits", "Unlimited workflows", "Dedicated infrastructure", "Custom integrations", "Account manager"],
    },
  ],
  subscriptions: [],
};

function normalizeLocalDatabase(
  database: Partial<LocalDatabase> | null | undefined,
): LocalDatabase {
  return {
    users: database?.users ?? [],
    automations: database?.automations ?? [],
    automationRuns: database?.automationRuns ?? [],
    connections: database?.connections ?? [],
    consultationRequests: database?.consultationRequests ?? [],
    usageLogs: database?.usageLogs ?? [],
    plans: database?.plans && database.plans.length > 0 ? database.plans : emptyDatabase.plans,
    subscriptions: database?.subscriptions ?? [],
  };
}

async function ensureStorage() {
  log.debug("Ensuring local storage exists.");
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
