import { buildDeterministicWorkflow, type AutomationRecord } from "@/lib/automation";
import { DEMO_USER } from "./user";
import { daysAgo } from "./time";

/**
 * Sample automations. Workflows come from the deterministic builder copied
 * from production, so steps and setup fields have the real shape. Add a row
 * here to add one to every page.
 */
const SEEDS = [
  {
    id: "auto-lead-routing",
    name: "Website lead to WhatsApp and CRM",
    prompt: "When a website form is submitted, send a WhatsApp greeting and add the lead to the CRM",
    status: "active",
    createdDays: 41,
    connected: ["forms", "whatsapp", "crm"],
    formInputs: { client_whatsapp_number: "+91 98000 11223" },
  },
  {
    id: "auto-support-escalation",
    name: "Priority support escalation",
    prompt: "When a support request arrives by webhook, send an email and save it to a Google Sheet",
    status: "active",
    createdDays: 28,
    connected: ["webhook", "email", "google", "sheets"],
    formInputs: {},
  },
  {
    id: "auto-invoice-log",
    name: "Razorpay payments to finance sheet",
    prompt: "When a webhook reports a payment, append a row to a Google Sheet and send an email receipt",
    status: "active",
    createdDays: 19,
    connected: ["webhook", "google", "sheets", "email"],
    formInputs: {},
  },
  {
    id: "auto-demo-followup",
    name: "Demo request follow-up",
    prompt: "When a Google Form demo request comes in, send a WhatsApp follow-up and an email",
    status: "paused",
    createdDays: 12,
    connected: ["google", "forms", "email"],
    formInputs: {},
  },
  {
    id: "auto-weekly-digest",
    name: "Weekly pipeline digest",
    prompt: "Every incoming CRM update goes into a Google Sheet and the team gets an email",
    status: "active",
    createdDays: 6,
    connected: ["crm", "google", "sheets", "email"],
    formInputs: {},
  },
  {
    id: "auto-onboarding-kit",
    name: "New customer onboarding kit",
    prompt: "When a form is submitted send a welcome email and a WhatsApp greeting",
    status: "paused",
    createdDays: 2,
    connected: ["forms", "email"],
    formInputs: {},
  },
] as const;

export function seedAutomations(): AutomationRecord[] {
  return SEEDS.map((seed) => {
    const workflow = buildDeterministicWorkflow(seed.prompt);
    return {
      id: seed.id,
      userId: DEMO_USER.id,
      name: seed.name,
      status: seed.status,
      workflow: { ...workflow, name: seed.name, description: seed.prompt },
      formInputs: { ...seed.formInputs },
      integrationStatus: Object.fromEntries(
        workflow.integrations.map((integration) => [
          integration,
          (seed.connected as readonly string[]).includes(integration) ? "connected" : "disconnected",
        ]),
      ),
      webhookId: `wh_${seed.id.replace("auto-", "").replaceAll("-", "_")}`,
      createdAt: daysAgo(seed.createdDays),
      updatedAt: daysAgo(Math.max(seed.createdDays - 3, 0)),
    };
  });
}
