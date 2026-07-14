/**
 * Subset of n8n REST API shapes we use.
 *
 * Kept narrow on purpose. We only declare the fields the adapter
 * actually reads/writes. Future n8n version drift only affects the
 * fields here — narrow surface = small breakage area.
 */

export type N8nNodeParameters = Record<string, unknown>;

export type N8nNode = {
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: N8nNodeParameters;
  credentials?: Record<string, { id: string; name: string }>;
  /** Disable a node (used for pause). */
  disabled?: boolean;

  /* ── Resilience policy (n8n per-node fields) ─────────────────
   * Written by the Deployment Agent's compiler so the IR's retry /
   * error policy survives into the executable workflow. */
  /** n8n retries the node on failure when true. */
  retryOnFail?: boolean;
  /** Total attempts n8n makes when retryOnFail is set. */
  maxTries?: number;
  /** Delay between retries, ms. */
  waitBetweenTries?: number;
  /**
   * n8n error routing:
   *   "stopWorkflow"          — abort the run (IR "fail" / "retry" exhausted)
   *   "continueRegularOutput" — log + carry on (IR "continue")
   */
  onError?: "stopWorkflow" | "continueRegularOutput";
};

export type N8nConnections = Record<
  string,
  { main: Array<Array<{ node: string; type: "main"; index: number }>> }
>;

export type N8nWorkflow = {
  name: string;
  active?: boolean;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings?: {
    saveExecutionProgress?: boolean;
    saveDataSuccessExecution?: string;
    /**
     * Workflow-level timeout, SECONDS. n8n has no per-node timeout, so the
     * Deployment Agent maps the IR's workflow timeout budget here.
     */
    executionTimeout?: number;
  };
  staticData?: Record<string, unknown> | null;
};

/** Response shape for POST /workflows. */
export type N8nWorkflowResponse = {
  id: string;
  active: boolean;
  name: string;
};

/** Response shape for POST /workflows/{id}/activate. */
export type N8nActivateResponse = {
  id: string;
  active: boolean;
};

/** Execution kick-off response. */
export type N8nExecutionResponse = {
  executionId: string;
};

/** Execution status response. */
export type N8nExecutionStatus = {
  id: string;
  finished: boolean;
  stoppedAt?: string;
  status: "new" | "running" | "success" | "error" | "canceled" | "waiting";
  data?: {
    resultData?: {
      runData?: Record<
        string,
        Array<{
          startTime?: number;
          executionTime?: number;
          error?: { message?: string };
          data?: { main?: Array<Array<Record<string, unknown>>> };
        }>
      >;
    };
  };
};
