/**
 * Shared testing context + required-scope table.
 *
 * The context is READ-ONLY: modules inspect the IR and the simulation, never
 * modify them.
 */

import type { SupportedIntegration } from "@/lib/workflow";
import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { ValidationReport } from "../models/validation";
import type { KnownConnection } from "../models/session";
import type { ApiProbe, CredentialProbe } from "./probes";
import type { SimulationResult } from "./modules/simulator";

/**
 * Minimum OAuth scopes each integration needs for the operations this platform
 * performs. Used by credential testing when a live probe reports actual scopes.
 * Integrations absent from this table need no scope check (api-key or no-auth).
 */
export const REQUIRED_SCOPES: Partial<Record<SupportedIntegration, string[]>> = {
  slack: ["chat:write"],
  sheets: ["https://www.googleapis.com/auth/spreadsheets"],
  google: ["https://www.googleapis.com/auth/drive.file"],
  hubspot: ["crm.objects.contacts.write"],
  salesforce: ["api"],
};

export interface TestingContext {
  readonly sessionId: string;
  readonly userId: string;
  readonly ir: AgentWorkflowIR;
  readonly validation: ValidationReport | null;
  readonly knownConnections: readonly KnownConnection[];
  readonly apiProbe: ApiProbe;
  readonly credentialProbe: CredentialProbe;
  /** Output of the execution simulator; every other module reads it. */
  readonly simulation: SimulationResult;
}
