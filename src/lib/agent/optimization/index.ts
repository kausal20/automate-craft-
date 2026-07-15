/**
 * Optimization barrel (Phase I).
 */

export { optimizationAgent } from "./agent";
export { OPT_THRESHOLDS, type OptimizationContext } from "./context";
export { computeScores, buildSummary } from "./scoring";

// Modules are exported so they can be unit-tested in isolation.
export { assessOptimizationReadiness, type ReadinessVerdict } from "./modules/readiness";
export { optimizePerformance } from "./modules/performance";
export { optimizeReliability } from "./modules/reliability";
export { optimizeRetries } from "./modules/retry";
export { optimizeTimeouts } from "./modules/timeout";
export { optimizeStructure } from "./modules/structure";
export { optimizeNodes } from "./modules/node";
export { optimizeCredentials } from "./modules/credential";
export { optimizeCost } from "./modules/cost";
