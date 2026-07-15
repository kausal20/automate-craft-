/**
 * Monitoring barrel (Phase H).
 */

export { monitoringAgent } from "./agent";
export { THRESHOLDS, type MonitoringContext } from "./context";

// Modules are exported so they can be unit-tested in isolation.
export { monitorExecutions } from "./modules/execution";
export { monitorNodes } from "./modules/node";
export { monitorRuntime, type RuntimeObservations } from "./modules/runtime";
export { monitorRetries, normalizeReason } from "./modules/retry";
export { monitorFailures, consecutiveFailures } from "./modules/failure";
export { monitorCredentials, type CredentialHealth } from "./modules/credential";
export { monitorPerformance, percentile, median } from "./modules/performance";
export { evaluateAlerts } from "./modules/alert";
export { buildAnalytics } from "./modules/analytics";
export { buildRecommendations } from "./modules/recommendation";
export { assessReadiness } from "./modules/readiness";
