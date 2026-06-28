/**
 * Intent model.
 *
 * Output of the intent-detection stage (ANALYZING_INTENT). Unlike the
 * legacy regex scanner in the chat route, this is a structured artifact
 * the requirement analyzer + planner consume. The detection engine
 * (built alongside the clarification engine) may use the LLM or
 * deterministic extraction, but its OUTPUT shape is fixed here.
 */

import type { SupportedIntegration } from "@/lib/workflow";

export interface AutomationIntent {
  sessionId: string;
  /** Verbatim user request that established intent. */
  sourceText: string;
  /** True when the text expresses an automation request at all. */
  isAutomationRequest: boolean;
  /**
   * Detected trigger concept (not yet a concrete trigger). e.g.
   * "form_submission", "schedule", "webhook", "payment". null when unclear.
   */
  triggerConcept: string | null;
  /**
   * Detected action concepts in order. e.g. ["notify", "update_crm",
   * "create_task"]. Drives operation selection during planning.
   */
  actionConcepts: string[];
  /** Integrations referenced or strongly implied. */
  integrations: SupportedIntegration[];
  /** One-line business goal, for naming + summaries. */
  businessGoal: string | null;
  /** Confidence 0..1 from the detector — low confidence forces clarification. */
  confidence: number;
  createdAt: number;
}
