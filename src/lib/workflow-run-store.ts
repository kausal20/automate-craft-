import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import { createLogger } from "@/lib/logger";

const log = createLogger("workflow-run-store");

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type WorkflowRunStatus = "pending" | "running" | "success" | "failed";

export type WorkflowRunRecord = {
  id: string;
  userId: string | null;
  workflowId: string | null;
  status: WorkflowRunStatus;
  startedAt: string;
  completedAt: string | null;
};

export type StepLogRecord = {
  id: string;
  runId: string;
  stepName: string;
  status: "success" | "failed";
  output: unknown;
  error: string | null;
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/*  Row mappers                                                        */
/* ------------------------------------------------------------------ */

function mapRunRow(row: Record<string, unknown>): WorkflowRunRecord {
  return {
    id: String(row.id),
    userId: row.user_id != null ? String(row.user_id) : null,
    workflowId: row.workflow_id != null ? String(row.workflow_id) : null,
    status: row.status as WorkflowRunStatus,
    startedAt: String(row.started_at),
    completedAt: row.completed_at != null ? String(row.completed_at) : null,
  };
}

function mapStepLogRow(row: Record<string, unknown>): StepLogRecord {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    stepName: String(row.step_name),
    status: row.status as "success" | "failed",
    output: row.output ?? null,
    error: row.error != null ? String(row.error) : null,
    createdAt: String(row.created_at),
  };
}

/* ------------------------------------------------------------------ */
/*  workflow_runs                                                      */
/* ------------------------------------------------------------------ */

export async function createWorkflowRun(input: {
  userId?: string | null;
  workflowId?: string | null;
}): Promise<WorkflowRunRecord> {
  log.info("Creating workflow run.");

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("workflow_runs")
      .insert({
        user_id: input.userId ?? null,
        workflow_id: input.workflowId ?? null,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id,user_id,workflow_id,status,started_at,completed_at")
      .single();

    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Could not create workflow run.");
    }

    return mapRunRow(response.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    const record: WorkflowRunRecord = {
      id: crypto.randomUUID(),
      userId: input.userId ?? null,
      workflowId: input.workflowId ?? null,
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    database.workflowRuns.unshift(record);
    return record;
  });
}

export async function completeWorkflowRun(
  runId: string,
  status: "success" | "failed",
): Promise<WorkflowRunRecord> {
  log.info("Completing workflow run:", runId, status);

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("workflow_runs")
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .select("id,user_id,workflow_id,status,started_at,completed_at")
      .single();

    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Could not update workflow run.");
    }

    return mapRunRow(response.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    const run = database.workflowRuns.find((r) => r.id === runId);

    if (!run) {
      throw new Error("Workflow run not found.");
    }

    run.status = status;
    run.completedAt = new Date().toISOString();
    return run;
  });
}

/* ------------------------------------------------------------------ */
/*  step_logs                                                          */
/* ------------------------------------------------------------------ */

export async function createStepLog(input: {
  runId: string;
  stepName: string;
  status: "success" | "failed";
  output?: unknown;
  error?: string | null;
}): Promise<StepLogRecord> {
  log.debug("Creating step log:", input.stepName, input.status);

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("step_logs")
      .insert({
        run_id: input.runId,
        step_name: input.stepName,
        status: input.status,
        output: input.output ?? null,
        error: input.error ?? null,
        created_at: new Date().toISOString(),
      })
      .select("id,run_id,step_name,status,output,error,created_at")
      .single();

    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Could not create step log.");
    }

    return mapStepLogRow(response.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    const record: StepLogRecord = {
      id: crypto.randomUUID(),
      runId: input.runId,
      stepName: input.stepName,
      status: input.status,
      output: input.output ?? null,
      error: input.error ?? null,
      createdAt: new Date().toISOString(),
    };

    database.stepLogs.unshift(record);
    return record;
  });
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export async function getWorkflowRunWithLogs(runId: string): Promise<{
  run: WorkflowRunRecord;
  stepLogs: StepLogRecord[];
} | null> {
  log.info("Fetching workflow run with logs:", runId);

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();

    const runResponse = await supabase
      .from("workflow_runs")
      .select("id,user_id,workflow_id,status,started_at,completed_at")
      .eq("id", runId)
      .maybeSingle();

    if (runResponse.error || !runResponse.data) {
      return null;
    }

    const logsResponse = await supabase
      .from("step_logs")
      .select("id,run_id,step_name,status,output,error,created_at")
      .eq("run_id", runId)
      .order("created_at", { ascending: true });

    return {
      run: mapRunRow(runResponse.data as Record<string, unknown>),
      stepLogs: (logsResponse.data ?? []).map((row) =>
        mapStepLogRow(row as Record<string, unknown>),
      ),
    };
  }

  const database = await readLocalDatabase();
  const run = database.workflowRuns.find((r) => r.id === runId);

  if (!run) {
    return null;
  }

  const stepLogs = database.stepLogs
    .filter((l) => l.runId === runId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return { run, stepLogs };
}

export async function listWorkflowRunsForUser(userId: string): Promise<WorkflowRunRecord[]> {
  log.info("Listing workflow runs for user:", userId);

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("workflow_runs")
      .select("id,user_id,workflow_id,status,started_at,completed_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return (response.data ?? []).map((row) =>
      mapRunRow(row as Record<string, unknown>),
    );
  }

  const database = await readLocalDatabase();
  return database.workflowRuns
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
