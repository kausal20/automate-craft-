/** Plan -> WorkflowPlan converter and answer application. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAnswers, brainPlanToWorkflowPlan } from "./converter.ts";
import { ANSWERS, leadToSheetPlan, noAuthPlan, realPipeline } from "./fakes.test.ts";

test("applyAnswers fills only explicit answers and never guesses", () => {
  const r = applyAnswers(leadToSheetPlan(), { "sheets.sheet": "Leads" });
  assert.deepEqual(r.unanswered.map((u) => u.key), ["email.to"]);
  assert.deepEqual(r.plan.steps[0].params.sheet, { source: "literal", value: "Leads" });
  assert.equal(r.plan.steps[1].params.to, undefined);
  assert.equal(r.plan.missingFields.length, 1);
});

test("applyAnswers rejects malformed answers (email / phone) instead of accepting them", () => {
  assert.equal(applyAnswers(leadToSheetPlan(), { ...ANSWERS, "email.to": "nope" }).unanswered.length, 1);
  const wa = leadToSheetPlan();
  wa.steps[1] = { ...wa.steps[1], integration: "whatsapp", operation: "send_message", params: { body: { source: "literal", value: "hi" } } };
  wa.missingFields[1] = { key: "whatsapp.to", stepId: "email_owner", param: "to", question: "Number?" };
  assert.equal(applyAnswers(wa, { "sheets.sheet": "S", "whatsapp.to": "call me" }).unanswered.length, 1);
  assert.equal(applyAnswers(wa, { "sheets.sheet": "S", "whatsapp.to": "+91 98765 43210" }).unanswered.length, 0);
});

test("applyAnswers does not mutate the stored plan", () => {
  const plan = leadToSheetPlan();
  applyAnswers(plan, ANSWERS);
  assert.equal(plan.missingFields.length, 2);
  assert.equal(plan.steps[0].params.sheet, undefined);
});

test("converter produces a complete, ok WorkflowPlan with graph, data flow and credentials", () => {
  const { plan } = applyAnswers(leadToSheetPlan(), ANSWERS);
  const wp = brainPlanToWorkflowPlan(plan, { sessionId: "d1", appsRequired: ["email", "sheets"], now: 1000 });
  assert.equal(wp.ok, true);
  assert.deepEqual(wp.executionOrder, ["trigger", "save_lead", "email_owner"]);
  assert.deepEqual(wp.dependencies, [{ from: "trigger", to: "save_lead" }, { from: "save_lead", to: "email_owner" }]);
  assert.deepEqual(wp.integrations, ["email", "sheets"]);
  assert.deepEqual(wp.requiredCredentials.map((c) => c.integration), ["email", "sheets"]);
  assert.ok(wp.dataFlow.some((e) => e.stepId === "save_lead" && e.from === "trigger.lead.name"));
  assert.equal(wp.createdAt, 1000);
  assert.equal(wp.steps[0].maxRetries, 3);
});

test("converter is deterministic", () => {
  const { plan } = applyAnswers(leadToSheetPlan(), ANSWERS);
  const a = brainPlanToWorkflowPlan(plan, { sessionId: "d1", appsRequired: ["email", "sheets"], now: 5 });
  const b = brainPlanToWorkflowPlan(plan, { sessionId: "d1", appsRequired: ["email", "sheets"], now: 5 });
  assert.deepEqual(a, b);
});

test("unanswered questions make the WorkflowPlan not-ok, so the existing generator refuses it", () => {
  const wp = brainPlanToWorkflowPlan(leadToSheetPlan(), { sessionId: "d1", appsRequired: ["email", "sheets"], now: 1 });
  assert.equal(wp.ok, false);
  assert.ok(wp.issues.some((i) => i.code === "MISSING_REQUIRED_PARAM"));
  assert.throws(() => realPipeline.generate(wp), /blocking issues/);
});

test("converted plan flows through the EXISTING generator, validator and n8n compiler", () => {
  const { plan } = applyAnswers(leadToSheetPlan(), ANSWERS);
  const wp = brainPlanToWorkflowPlan(plan, { sessionId: "d1", appsRequired: ["email", "sheets"], now: 1 });
  const ir = realPipeline.generate(wp);
  assert.deepEqual(ir.core.steps.map((s) => s.id), ["save_lead", "email_owner"]);
  const report = realPipeline.validate({
    sessionId: "d1", ir,
    knownConnections: [{ integration: "email", status: "connected" }, { integration: "sheets", status: "connected" }],
  });
  assert.equal(report.ok, true, JSON.stringify(report.issues.filter((i) => i.severity === "error")));
  const n8n = realPipeline.compile(ir, {});
  assert.ok(n8n.nodes.some((n) => n.name === "save_lead"));
  assert.ok(n8n.nodes.some((n) => n.name === "email_owner"));
});

test("a no-login plan converts and compiles too", () => {
  const wp = brainPlanToWorkflowPlan(noAuthPlan(), { sessionId: "d2", appsRequired: [], now: 1 });
  assert.equal(wp.ok, true);
  assert.deepEqual(wp.requiredCredentials, []);
  assert.ok(realPipeline.compile(realPipeline.generate(wp), {}).nodes.length >= 2);
});
