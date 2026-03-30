import {
  automationConfigSchema,
  automationStatusSchema,
  automationWorkflowSchema,
  connectionStatusSchema,
  executionLogSchema,
  integrationSchema,
  integrationStatusMapSchema,
  runStatusSchema,
  type AutomationRecord,
  type AutomationRunRecord,
  type AutomationStatus,
  type ConnectionStatus,
  type ExecutionLog,
  type IntegrationConnectionRecord,
  type SupportedIntegration,
} from "@/lib/automation";
import { isSupabaseMode } from "@/lib/env";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { createLogger } from "@/lib/logger";

const log = createLogger("automation-store");

type CreateAutomationInput = {
  userId: string;
  workflow: AutomationRecord["workflow"];
  formInputs: AutomationRecord["formInputs"];
  integrationStatus: AutomationRecord["integrationStatus"];
  status?: AutomationStatus;
};

type CreateRunInput = {
  automationId: string;
  userId: string;
  status: AutomationRunRecord["status"];
  logs: ExecutionLog[];
  triggerSource: AutomationRunRecord["triggerSource"];
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
  finishedAt?: string | null;
};

function mapAutomationRow(row: Record<string, unknown>): AutomationRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    status: automationStatusSchema.parse(row.status),
    workflow: automationWorkflowSchema.parse(row.workflow),
    formInputs: automationConfigSchema.parse(row.form_inputs ?? {}),
    integrationStatus: integrationStatusMapSchema.parse(
      row.integration_status ?? {},
    ),
    webhookId: String(row.webhook_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRunRow(row: Record<string, unknown>): AutomationRunRecord {
  return {
    id: String(row.id),
    automationId: String(row.automation_id),
    userId: String(row.user_id),
    status: runStatusSchema.parse(row.status),
    logs: Array.isArray(row.logs)
      ? row.logs.map((entry) => executionLogSchema.parse(entry))
      : [],
    triggerSource:
      row.trigger_source === "webhook" ? "webhook" : "manual",
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
    result:
      row.result && typeof row.result === "object"
        ? (row.result as Record<string, unknown>)
        : null,
    errorMessage:
      typeof row.error_message === "string" ? row.error_message : null,
    createdAt: String(row.created_at),
    finishedAt:
      typeof row.finished_at === "string" ? row.finished_at : null,
  };
}

function mapConnectionRow(row: Record<string, unknown>): IntegrationConnectionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    integration: integrationSchema.parse(row.integration),
    status: connectionStatusSchema.parse(row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createAutomation(input: CreateAutomationInput) {
  log.info("Creating automation for user:", input.userId);
  if (isSupabaseMode()) {
    log.debug("Using Supabase to create automation.");
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const inserted = await supabase
      .from("automations")
      .insert({
        user_id: input.userId,
        name: input.workflow.name,
        workflow: input.workflow,
        form_inputs: input.formInputs,
        integration_status: input.integrationStatus,
        webhook_id: crypto.randomUUID(),
        status: input.status ?? "active",
        created_at: now,
        updated_at: now,
      })
      .select(
        "id,user_id,name,workflow,form_inputs,integration_status,webhook_id,status,created_at,updated_at",
      )
      .single();

    if (inserted.error || !inserted.data) {
      throw new Error(inserted.error?.message || "Could not create automation.");
    }

    return mapAutomationRow(inserted.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    log.debug("Using local database to create automation.");
    const now = new Date().toISOString();
    const created: AutomationRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      name: input.workflow.name,
      workflow: input.workflow,
      status: input.status ?? "active",
      formInputs: input.formInputs,
      integrationStatus: input.integrationStatus,
      webhookId: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    database.automations.unshift(created);
    return created;
  });
}

export async function listAutomationsForUser(userId: string) {
  log.info("Listing automations for user:", userId);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automations")
      .select(
        "id,user_id,name,workflow,form_inputs,integration_status,webhook_id,status,created_at,updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return (response.data ?? []).map((row) =>
      mapAutomationRow(row as Record<string, unknown>),
    );
  }

  const database = await readLocalDatabase();
  return database.automations
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

/**
 * Direct single-row lookup instead of listing all automations first.
 */
export async function getAutomationByIdForUser(userId: string, automationId: string) {
  log.info("Getting automation by id:", automationId);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automations")
      .select(
        "id,user_id,name,workflow,form_inputs,integration_status,webhook_id,status,created_at,updated_at",
      )
      .eq("id", automationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data
      ? mapAutomationRow(response.data as Record<string, unknown>)
      : null;
  }

  const database = await readLocalDatabase();
  return (
    database.automations.find(
      (entry) => entry.id === automationId && entry.userId === userId,
    ) ?? null
  );
}

export async function updateAutomationForUser(input: {
  userId: string;
  automationId: string;
  patch: {
    name?: string;
    status?: AutomationStatus;
    formInputs?: Record<string, string>;
    integrationStatus?: Record<string, ConnectionStatus>;
  };
}) {
  log.info("Updating automation:", input.automationId);
  const existing = await getAutomationByIdForUser(input.userId, input.automationId);

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const nextWorkflow = input.patch.name
    ? { ...existing.workflow, name: input.patch.name }
    : existing.workflow;

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automations")
      .update({
        name: input.patch.name ?? existing.name,
        workflow: nextWorkflow,
        form_inputs: input.patch.formInputs ?? existing.formInputs,
        integration_status:
          input.patch.integrationStatus ?? existing.integrationStatus,
        status: input.patch.status ?? existing.status,
        updated_at: now,
      })
      .eq("id", input.automationId)
      .eq("user_id", input.userId)
      .select(
        "id,user_id,name,workflow,form_inputs,integration_status,webhook_id,status,created_at,updated_at",
      )
      .maybeSingle();

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data
      ? mapAutomationRow(response.data as Record<string, unknown>)
      : null;
  }

  return updateLocalDatabase((database) => {
    const automation = database.automations.find(
      (entry) =>
        entry.id === input.automationId && entry.userId === input.userId,
    );

    if (!automation) {
      return null;
    }

    if (input.patch.name) {
      automation.name = input.patch.name;
      automation.workflow = {
        ...automation.workflow,
        name: input.patch.name,
      };
    }

    if (input.patch.status) {
      automation.status = input.patch.status;
    }

    if (input.patch.formInputs) {
      automation.formInputs = input.patch.formInputs;
    }

    if (input.patch.integrationStatus) {
      automation.integrationStatus = input.patch.integrationStatus;
    }

    automation.updatedAt = now;
    return automation;
  });
}

export async function findAutomationByWebhookId(webhookId: string) {
  log.info("Looking up automation by webhook id:", webhookId);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automations")
      .select(
        "id,user_id,name,workflow,form_inputs,integration_status,webhook_id,status,created_at,updated_at",
      )
      .eq("webhook_id", webhookId)
      .maybeSingle();

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data
      ? mapAutomationRow(response.data as Record<string, unknown>)
      : null;
  }

  const database = await readLocalDatabase();
  return (
    database.automations.find((entry) => entry.webhookId === webhookId) ?? null
  );
}

export async function updateAutomationStatusForUser(input: {
  userId: string;
  automationId: string;
  status: AutomationStatus;
}) {
  log.info("Updating automation status:", input.automationId);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automations")
      .update({
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.automationId)
      .eq("user_id", input.userId)
      .select(
        "id,user_id,name,workflow,form_inputs,integration_status,webhook_id,status,created_at,updated_at",
      )
      .maybeSingle();

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data
      ? mapAutomationRow(response.data as Record<string, unknown>)
      : null;
  }

  return updateLocalDatabase((database) => {
    const automation = database.automations.find(
      (entry) =>
        entry.id === input.automationId && entry.userId === input.userId,
    );

    if (!automation) {
      return null;
    }

    automation.status = input.status;
    automation.updatedAt = new Date().toISOString();
    return automation;
  });
}

export async function deleteAutomationForUser(userId: string, automationId: string) {
  log.info("Deleting automation:", automationId);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automations")
      .delete()
      .eq("id", automationId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (response.error) {
      throw new Error(response.error.message);
    }

    await supabase.from("automation_runs").delete().eq("automation_id", automationId);
    return Boolean(response.data?.id);
  }

  return updateLocalDatabase((database) => {
    const previousLength = database.automations.length;
    database.automations = database.automations.filter(
      (entry) => !(entry.id === automationId && entry.userId === userId),
    );
    database.automationRuns = database.automationRuns.filter(
      (entry) => !(entry.automationId === automationId && entry.userId === userId),
    );
    return database.automations.length !== previousLength;
  });
}

export async function createAutomationRun(input: CreateRunInput) {
  log.info("Creating automation run for automation:", input.automationId);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automation_runs")
      .insert({
        automation_id: input.automationId,
        user_id: input.userId,
        status: input.status,
        logs: input.logs,
        trigger_source: input.triggerSource,
        payload: input.payload,
        result: input.result ?? null,
        error_message: input.errorMessage ?? null,
        created_at: new Date().toISOString(),
        finished_at: input.finishedAt ?? null,
      })
      .select(
        "id,automation_id,user_id,status,logs,trigger_source,payload,result,error_message,created_at,finished_at",
      )
      .single();

    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Could not create run.");
    }

    return mapRunRow(response.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    const created: AutomationRunRecord = {
      id: crypto.randomUUID(),
      automationId: input.automationId,
      userId: input.userId,
      status: input.status,
      logs: input.logs,
      triggerSource: input.triggerSource,
      payload: input.payload,
      result: input.result ?? null,
      errorMessage: input.errorMessage ?? null,
      createdAt: new Date().toISOString(),
      finishedAt: input.finishedAt ?? null,
    };

    database.automationRuns.unshift(created);
    return created;
  });
}

export async function updateAutomationRun(
  runId: string,
  patch: {
    status?: AutomationRunRecord["status"];
    logs?: ExecutionLog[];
    result?: Record<string, unknown> | null;
    errorMessage?: string | null;
    finishedAt?: string | null;
  },
) {
  log.info("Updating automation run:", runId);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automation_runs")
      .update({
        status: patch.status,
        logs: patch.logs,
        result: patch.result,
        error_message: patch.errorMessage,
        finished_at: patch.finishedAt,
      })
      .eq("id", runId)
      .select(
        "id,automation_id,user_id,status,logs,trigger_source,payload,result,error_message,created_at,finished_at",
      )
      .single();

    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Could not update run.");
    }

    return mapRunRow(response.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    const run = database.automationRuns.find((entry) => entry.id === runId);

    if (!run) {
      throw new Error("Run not found.");
    }

    if (patch.status) {
      run.status = patch.status;
    }
    if (patch.logs) {
      run.logs = patch.logs;
    }
    if (patch.result !== undefined) {
      run.result = patch.result;
    }
    if (patch.errorMessage !== undefined) {
      run.errorMessage = patch.errorMessage;
    }
    if (patch.finishedAt !== undefined) {
      run.finishedAt = patch.finishedAt;
    }

    return run;
  });
}

export async function listRunsForUser(userId: string) {
  log.info("Listing runs for user:", userId);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automation_runs")
      .select(
        "id,automation_id,user_id,status,logs,trigger_source,payload,result,error_message,created_at,finished_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return (response.data ?? []).map((row) =>
      mapRunRow(row as Record<string, unknown>),
    );
  }

  const database = await readLocalDatabase();
  return database.automationRuns
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function upsertIntegrationConnection(input: {
  userId: string;
  integration: SupportedIntegration;
  status: ConnectionStatus;
}) {
  log.info("Saving integration connection:", input.integration);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const response = await supabase
      .from("connected_integrations")
      .upsert(
        {
          user_id: input.userId,
          integration: input.integration,
          status: input.status,
          updated_at: now,
        },
        { onConflict: "user_id,integration" },
      )
      .select("id,user_id,integration,status,created_at,updated_at")
      .single();

    if (response.error || !response.data) {
      throw new Error(
        response.error?.message || "Could not save integration connection.",
      );
    }

    return mapConnectionRow(response.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    const now = new Date().toISOString();
    const existing = database.connections.find(
      (entry) =>
        entry.userId === input.userId && entry.integration === input.integration,
    );

    if (existing) {
      existing.status = input.status;
      existing.updatedAt = now;
      return existing;
    }

    const created: IntegrationConnectionRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      integration: input.integration,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };

    database.connections.push(created);
    return created;
  });
}

export async function listIntegrationConnectionsForUser(userId: string) {
  log.info("Listing integration connections for user:", userId);
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("connected_integrations")
      .select("id,user_id,integration,status,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return (response.data ?? []).map((row) =>
      mapConnectionRow(row as Record<string, unknown>),
    );
  }

  const database = await readLocalDatabase();
  return database.connections
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
