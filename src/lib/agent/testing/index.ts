/**
 * Testing barrel (Phase F).
 */

export { workflowTestingAgent } from "./agent";
export type { TestingContext } from "./context";
export { REQUIRED_SCOPES } from "./context";

export {
  offlineApiProbe,
  offlineCredentialProbe,
  type ApiProbe,
  type ApiProbeResult,
  type CredentialProbe,
  type CredentialProbeResult,
} from "./probes";

export {
  INTEGRATION_LATENCY_MS,
  BUILTIN_LATENCY_MS,
  SLOW_NODE_THRESHOLD_MS,
  LONG_CHAIN_THRESHOLD,
  SLOW_WORKFLOW_THRESHOLD_MS,
  estimateNodeMs,
} from "./latency";

// Modules are exported so they can be unit-tested in isolation.
export { simulate, buildSamplePayload, type SimulationResult, type SimulatedNode } from "./modules/simulator";
export { testTrigger } from "./modules/trigger";
export { testNodes } from "./modules/node";
export { testVariables } from "./modules/variable";
export { testMappings } from "./modules/mapping";
export { testCredentials } from "./modules/credential";
export { testApiConnectivity } from "./modules/api";
export { testRetry } from "./modules/retry";
export { testTimeouts } from "./modules/timeout";
export { testPerformance } from "./modules/performance";
export { testFailureRecovery } from "./modules/recovery";
export { testDeploymentReadiness } from "./modules/readiness";
