/**
 * Deployment barrel (Phase G).
 */

export { deploymentAgent, type LifecycleInput, type PreviousDeployment } from "./agent";
export { compileIrToN8n, CompilationError, type CompileResult } from "./compiler";
export {
  resolveCredentials,
  requiredIntegrations,
  type CredentialResolution,
  type CredentialResolver,
} from "./credentials";
export {
  liveN8nDeploymentClient,
  type N8nDeploymentClient,
  type DeployedWorkflowRef,
} from "./client";
