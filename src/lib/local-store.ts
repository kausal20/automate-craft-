import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AutomationRecord,
  AutomationRunRecord,
  IntegrationConnectionRecord,
} from "@/lib/automation";

/* LOGIC EXPLAINED:
The app can run without Supabase, so this file becomes the local database.
The main problem before was that reads and writes happened silently, which made
it hard to tell whether data was actually saved. These logs make the local
database flow visible step by step.
*/

export type LocalUserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: string;
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
};

const STORAGE_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(STORAGE_DIR, "automatecraft-local.json");

const emptyDatabase: LocalDatabase = {
  users: [],
  automations: [],
  automationRuns: [],
  connections: [],
  consultationRequests: [],
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
  };
}

async function ensureStorage() {
  console.log("[local-store] Ensuring local storage exists.");
  await mkdir(STORAGE_DIR, { recursive: true });

  try {
    await readFile(STORAGE_FILE, "utf8");
    console.log("[local-store] Local storage file found.");
  } catch {
    console.log("[local-store] Local storage file missing. Creating a new one.");
    await writeFile(STORAGE_FILE, JSON.stringify(emptyDatabase, null, 2), "utf8");
  }
}

export async function readLocalDatabase(): Promise<LocalDatabase> {
  console.log("[local-store] Reading local database.");
  await ensureStorage();
  const raw = await readFile(STORAGE_FILE, "utf8");
  console.log("[local-store] Local database read complete.");
  return normalizeLocalDatabase(JSON.parse(raw) as Partial<LocalDatabase>);
}

export async function writeLocalDatabase(database: LocalDatabase) {
  console.log("[local-store] Writing local database to disk.");
  await ensureStorage();
  await writeFile(STORAGE_FILE, JSON.stringify(database, null, 2), "utf8");
  console.log("[local-store] Local database write complete.");
}

export async function updateLocalDatabase<T>(
  updater: (database: LocalDatabase) => T | Promise<T>,
) {
  console.log("[local-store] Starting local database update.");
  const database = normalizeLocalDatabase(await readLocalDatabase());
  const result = await updater(database);
  await writeLocalDatabase(database);
  console.log("[local-store] Local database update finished.");
  return result;
}

export async function createConsultationRequest(input: {
  name: string;
  email: string;
  company: string;
  automationRequirement: string;
  budget: string;
}) {
  console.log("[local-store] Saving consultation request for:", input.email);

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
    console.log("[local-store] Consultation request saved:", consultationRequest.id);
    return consultationRequest;
  });
}
