/**
 * Strict plan schema returned by any planner brain.
 *
 * Field names deliberately mirror the existing PlannedTrigger / PlannedStep
 * types in agent/models/plan.ts so lowering into a WorkflowPlan is a field
 * copy. `appsRequired` is recomputed by code — the model's value is ignored.
 */

import { z } from "zod";
import { STEP_KINDS, TRIGGER_KINDS } from "@/lib/workflow";

const snake = /^[a-z][a-z0-9_]*$/;
const refPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*|\[\d+\])*$/;

const paramSourceSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("literal"), value: z.string().max(4000) }).strict(),
  z.object({ source: z.literal("trigger"), ref: z.string().max(240).regex(refPattern) }).strict(),
  z.object({ source: z.literal("step"), ref: z.string().max(240).regex(refPattern) }).strict(),
  z.object({ source: z.literal("template"), value: z.string().max(4000) }).strict(),
  z.object({ source: z.literal("secret"), ref: z.string().max(240).regex(refPattern) }).strict(),
]);

const triggerSchema = z
  .object({
    kind: z.enum(TRIGGER_KINDS),
    /** App slug. A string on purpose: unknown slugs must reach the catalogue check, not die in the parser. */
    integration: z.string().regex(snake).max(40).nullable(),
    config: z.record(z.string(), z.string().max(500)).default({}),
  })
  .strict();

const stepSchema = z
  .object({
    id: z.string().regex(snake).max(60),
    label: z.string().trim().min(2).max(120),
    kind: z.enum(STEP_KINDS),
    integration: z.string().regex(snake).max(40).nullable(),
    operation: z.string().regex(snake).max(80),
    params: z.record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).max(80), paramSourceSchema).default({}),
    next: z.array(z.string().regex(snake).max(60)).max(8).default([]),
    errorPolicy: z.enum(["fail", "continue", "retry"]).default("fail"),
  })
  .strict();

const missingFieldSchema = z
  .object({
    /** Stable key, e.g. "whatsapp.to". */
    key: z.string().trim().min(2).max(80),
    stepId: z.string().regex(snake).max(60).nullable().default(null),
    param: z.string().max(80).nullable().default(null),
    /** One simple question, written in the user's own language. */
    question: z.string().trim().min(3).max(300),
  })
  .strict();

export const brainPlanSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    /** One or two sentences, in the user's language. */
    summary: z.string().trim().min(2).max(600),
    /** Language the user wrote in: "en", "hi", "hinglish", or another tag. */
    language: z.string().trim().min(2).max(20),
    trigger: triggerSchema,
    steps: z.array(stepSchema).min(1).max(30),
    /** Ignored. Code derives the real list from trigger + steps. */
    appsRequired: z.array(z.string()).max(30).default([]),
    missingFields: z.array(missingFieldSchema).max(30).default([]),
    /** Things the user asked for that the model knows it cannot do. Any entry rejects the plan. */
    unsupportedRequests: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  })
  .strict();

export type BrainPlan = z.infer<typeof brainPlanSchema>;
export type BrainPlanStep = z.infer<typeof stepSchema>;
export type BrainMissingField = z.infer<typeof missingFieldSchema>;
