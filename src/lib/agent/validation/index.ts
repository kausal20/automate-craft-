/**
 * Validation barrel (Phase E).
 */

export { workflowValidator } from "./validator";
export type { ValidatorContext } from "./context";

// Individual validators are exported so they can be unit-tested and reused in
// isolation without running the whole pipeline.
export { validateStructure } from "./validators/structure";
export { validateSchema } from "./validators/schema";
export { validateNodes } from "./validators/node";
export { validateEdges } from "./validators/edge";
export { validateDependencies } from "./validators/dependency";
export { validateVariables } from "./validators/variable";
export { validateParameters } from "./validators/parameter";
export { validateCredentials } from "./validators/credential";
export { validateIntegrations } from "./validators/integration";
export { validateExecution } from "./validators/execution";
export { validateDeploymentReadiness } from "./validators/deployment";
