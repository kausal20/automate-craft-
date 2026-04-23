import { z } from "zod";

export const supportedIntegrations = [
  "google",
  "whatsapp",
  "email",
  "slack",
  "hubspot",
  "salesforce",
  "razorpay",
  "webhook",
  "forms",
  "sheets",
  "crm",
] as const;

export const supportedRequiredFields = [
  "phoneNumber",
  "message",
  "formId",
  "emailAddress",
  "subject",
  "sheetId",
  "webhookUrl",
  "leadSource",
  "customerName",
  "companyName",
] as const;

export const integrationSchema = z.enum(supportedIntegrations);
export const requiredFieldSchema = z.enum(supportedRequiredFields);
export const automationFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "select",
  "phone",
  "email",
]);

export const automationSetupFieldSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Field keys can only contain letters, numbers, hyphens, and underscores.",
    ),
  label: z.string().trim().min(2).max(80),
  type: automationFieldTypeSchema,
  placeholder: z.string().trim().min(2).max(160),
  helpText: z.string().trim().min(4).max(240),
  required: z.boolean().default(true),
  options: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  integration: integrationSchema.optional(),
});

export const automationStepSchema = z.object({
  type: z.enum([
    "action",
    "transform",
    "notification",
    "condition",
    "delay",
    "save",
  ]),
  name: z.string().min(2).max(120),
  details: z.record(z.string(), z.string()).default({}),
});

export const automationWorkflowSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().min(3).max(240),
  trigger: z.string().min(3).max(160),
  steps: z.array(automationStepSchema).min(1).max(8),
  integrations: z.array(integrationSchema).max(6).default([]),
  requiredFields: z.array(requiredFieldSchema).max(10).default([]),
  setupFields: z.array(automationSetupFieldSchema).max(12).default([]),
});

export const automationStatusSchema = z.enum(["active", "paused"]);
export const runStatusSchema = z.enum(["running", "success", "error"]);
export const connectionStatusSchema = z.enum(["connected", "disconnected"]);
export const automationConfigSchema = z.record(z.string(), z.string());
export const integrationStatusMapSchema = z.record(
  z.string(),
  connectionStatusSchema,
);
export const executionLogSchema = z.object({
  at: z.string(),
  level: z.enum(["info", "success", "error"]),
  message: z.string(),
  stepName: z.string().optional(),
});

export type SupportedIntegration = z.infer<typeof integrationSchema>;
export type RequiredFieldKey = z.infer<typeof requiredFieldSchema>;
export type AutomationSetupField = z.infer<typeof automationSetupFieldSchema>;
export type AutomationWorkflow = z.infer<typeof automationWorkflowSchema>;
export type AutomationStatus = z.infer<typeof automationStatusSchema>;
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type ExecutionLog = z.infer<typeof executionLogSchema>;

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  mode: "supabase" | "local";
  onboarded?: boolean;
  emailVerified?: boolean;
};

export type AutomationRecord = {
  id: string;
  userId: string;
  name: string;
  status: AutomationStatus;
  workflow: AutomationWorkflow;
  formInputs: Record<string, string>;
  integrationStatus: Record<string, ConnectionStatus>;
  webhookId: string;
  createdAt: string;
  updatedAt: string;
};

export type AutomationRunRecord = {
  id: string;
  automationId: string;
  userId: string;
  status: z.infer<typeof runStatusSchema>;
  logs: ExecutionLog[];
  triggerSource: "manual" | "webhook";
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type IntegrationConnectionRecord = {
  id: string;
  userId: string;
  integration: SupportedIntegration;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
};

const legacyRequiredFieldDefinitions: Record<
  RequiredFieldKey,
  Omit<AutomationSetupField, "key" | "required">
> = {
  phoneNumber: {
    label: "Phone number",
    type: "phone",
    placeholder: "+91 98765 43210",
    helpText: "The phone number used for outbound WhatsApp actions.",
    integration: "whatsapp",
  },
  message: {
    label: "Message",
    type: "textarea",
    placeholder: "Write the message that should be sent.",
    helpText: "Used for notification-style automation steps.",
    integration: "whatsapp",
  },
  formId: {
    label: "Form",
    type: "select",
    placeholder: "Choose a form",
    helpText: "Select which incoming form should trigger this workflow.",
    options: ["Website Contact Form", "Lead Magnet Form", "Support Request Form"],
    integration: "forms",
  },
  emailAddress: {
    label: "Email address",
    type: "email",
    placeholder: "hello@company.com",
    helpText: "Used for email actions or fallback contact routing.",
    integration: "email",
  },
  subject: {
    label: "Email subject",
    type: "text",
    placeholder: "Thanks for reaching out",
    helpText: "Optional subject line for email-based steps.",
    integration: "email",
  },
  sheetId: {
    label: "Google Sheet",
    type: "select",
    placeholder: "Choose a sheet",
    helpText: "Select the destination spreadsheet.",
    options: ["Leads Tracker", "Support Queue", "Customer Pipeline"],
    integration: "sheets",
  },
  webhookUrl: {
    label: "Webhook URL",
    type: "text",
    placeholder: "https://example.com/hooks/lead",
    helpText: "Used when the automation forwards data to another system.",
    integration: "webhook",
  },
  leadSource: {
    label: "Lead source",
    type: "select",
    placeholder: "Choose a lead source",
    helpText: "Helps route the workflow to the correct downstream logic.",
    options: ["Website", "Ads", "Referral"],
    integration: "crm",
  },
  customerName: {
    label: "Customer name variable",
    type: "text",
    placeholder: "{{name}}",
    helpText: "Use a variable token or fallback value for personalization.",
  },
  companyName: {
    label: "Company name",
    type: "text",
    placeholder: "AutomateCraft",
    helpText: "Useful for CRM sync or outbound message context.",
  },
};

function dedupeIntegrations(integrations: SupportedIntegration[]) {
  return Array.from(new Set(integrations));
}

function dedupeRequiredFields(fields: RequiredFieldKey[]) {
  return Array.from(new Set(fields));
}

function dedupeSetupFields(fields: AutomationSetupField[]) {
  return Array.from(new Map(fields.map((field) => [field.key, field])).values());
}

export function buildLegacyFieldDefinition(
  field: RequiredFieldKey,
): AutomationSetupField {
  const definition = legacyRequiredFieldDefinitions[field];

  return {
    key: field,
    required: true,
    ...definition,
  };
}

export function getWorkflowFieldDefinitions(
  workflow: Pick<AutomationWorkflow, "requiredFields" | "setupFields">,
) {
  if (workflow.setupFields.length > 0) {
    return workflow.setupFields;
  }

  return workflow.requiredFields.map((field) => buildLegacyFieldDefinition(field));
}

function createTextField(
  key: string,
  label: string,
  placeholder: string,
  helpText: string,
  integration?: SupportedIntegration,
): AutomationSetupField {
  return {
    key,
    label,
    type: "text",
    placeholder,
    helpText,
    required: true,
    integration,
  };
}

function createPhoneField(
  key: string,
  label: string,
  placeholder: string,
  helpText: string,
): AutomationSetupField {
  return {
    key,
    label,
    type: "phone",
    placeholder,
    helpText,
    required: true,
    integration: "whatsapp",
  };
}

function createTextareaField(
  key: string,
  label: string,
  placeholder: string,
  helpText: string,
  integration?: SupportedIntegration,
): AutomationSetupField {
  return {
    key,
    label,
    type: "textarea",
    placeholder,
    helpText,
    required: true,
    integration,
  };
}

function createSelectField(
  key: string,
  label: string,
  options: string[],
  helpText: string,
  integration?: SupportedIntegration,
): AutomationSetupField {
  return {
    key,
    label,
    type: "select",
    placeholder: options[0] || "Select an option",
    helpText,
    required: true,
    options,
    integration,
  };
}

export function buildDeterministicWorkflow(prompt: string): AutomationWorkflow {
  const normalized = prompt.toLowerCase();
  const mentionsGoogleForm =
    normalized.includes("google form") || normalized.includes("google forms");
  const hasWhatsApp = normalized.includes("whatsapp");
  const hasEmail = normalized.includes("email");
  const hasSupport = normalized.includes("support");
  const hasSheet =
    normalized.includes("google sheet") || normalized.includes("sheet");
  const hasCrm =
    normalized.includes("crm") ||
    normalized.includes("hubspot") ||
    normalized.includes("salesforce");
  const hasForm = normalized.includes("form");
  const hasWebhook = normalized.includes("webhook");
  const wantsGreeting =
    normalized.includes("greeting") ||
    normalized.includes("welcome") ||
    normalized.includes("follow-up");

  const integrations: SupportedIntegration[] = [];
  const requiredFields: RequiredFieldKey[] = [];
  const setupFields: AutomationSetupField[] = [];

  if (mentionsGoogleForm) {
    integrations.push("google", "forms");
    requiredFields.push("formId");
    setupFields.push(
      createSelectField(
        "google_form_connection",
        "Google Form connection",
        [
          "Website Lead Form",
          "Consultation Request Form",
          "Customer Intake Form",
        ],
        "Choose the Google Form that should trigger this automation.",
        "google",
      ),
    );
  } else if (hasForm) {
    integrations.push("forms");
    requiredFields.push("formId");
    setupFields.push(buildLegacyFieldDefinition("formId"));
  }

  if (hasWhatsApp) {
    integrations.push("whatsapp");
    requiredFields.push("phoneNumber", "message");
    setupFields.push(
      createPhoneField(
        "client_whatsapp_number",
        hasForm ? "Client WhatsApp number" : "Primary WhatsApp number",
        "+91 98765 43210",
        "This number receives the internal WhatsApp notification or serves as the sender configuration.",
      ),
    );

    if (hasForm) {
      setupFields.push(
        createTextField(
          "submitter_whatsapp_field",
          "Form field for submitter WhatsApp number",
          "phone_number",
          "Enter the Google Form question key or mapped field that contains the submitter's WhatsApp number.",
          mentionsGoogleForm ? "google" : "forms",
        ),
      );
    }

    setupFields.push(
      createTextareaField(
        wantsGreeting ? "greeting_message_content" : "whatsapp_message_content",
        wantsGreeting ? "Greeting message content" : "WhatsApp message content",
        wantsGreeting
          ? "Thanks for filling out the form. We have received your request."
          : "Write the WhatsApp message that should be sent.",
        "This message will be sent automatically by the workflow.",
        "whatsapp",
      ),
    );
  }

  if (hasEmail) {
    integrations.push("email");
    requiredFields.push("emailAddress", "subject");
    setupFields.push(
      {
        key: "recipient_email_address",
        label: "Recipient email address",
        type: "email",
        placeholder: "hello@company.com",
        helpText: "Used for the email notification or follow-up step.",
        required: true,
        integration: "email",
      },
      createTextField(
        "email_subject_line",
        "Email subject line",
        "Thanks for your submission",
        "The subject line used when the automation sends an email.",
        "email",
      ),
    );
  }

  if (hasSheet) {
    integrations.push("google", "sheets");
    requiredFields.push("sheetId");
    setupFields.push(
      createSelectField(
        "google_sheet_destination",
        "Google Sheet destination",
        ["Leads Tracker", "Support Queue", "Operations Board"],
        "Choose where the automation should save structured records.",
        "sheets",
      ),
    );
  }

  if (hasCrm) {
    integrations.push("crm");
    requiredFields.push("leadSource");
    setupFields.push(
      createSelectField(
        "crm_pipeline_stage",
        "CRM pipeline stage",
        ["New lead", "Qualified", "Needs review"],
        "Select which CRM stage new records should enter.",
        "crm",
      ),
    );
  }

  if (hasSupport) {
    requiredFields.push("customerName");
    setupFields.push(
      createTextField(
        "customer_name_variable",
        "Customer name variable",
        "{{name}}",
        "Use the customer name token or fallback text for personalization.",
      ),
    );
  }

  if (hasWebhook) {
    integrations.push("webhook");
    requiredFields.push("webhookUrl");
    setupFields.push(buildLegacyFieldDefinition("webhookUrl"));
  }

  const steps: AutomationWorkflow["steps"] = [
    {
      type: "transform",
      name: "Normalize incoming payload",
      details: {
        description: "Prepare the trigger payload for downstream actions.",
      },
    },
  ];

  if (hasForm || mentionsGoogleForm) {
    steps.push({
      type: "action",
      name: mentionsGoogleForm
        ? "Capture Google Form submission"
        : "Capture form submission",
      details: {
        description: "Read the inbound submission and extract mapped values.",
      },
    });
  }

  if (hasCrm) {
    steps.push({
      type: "action",
      name: "Create or update CRM contact",
      details: {
        description: "Sync the lead details into the connected CRM.",
      },
    });
  }

  if (hasWhatsApp) {
    steps.push({
      type: "notification",
      name: hasForm
        ? "Send internal WhatsApp notification"
        : "Send WhatsApp follow-up",
      details: {
        description: hasForm
          ? "Notify the client team on WhatsApp with the submitted form details."
          : "Send the configured WhatsApp message to the target contact.",
      },
    });

    if (hasForm && wantsGreeting) {
      steps.push({
        type: "notification",
        name: "Send greeting to the submitter",
        details: {
          description:
            "Reply to the person who submitted the form using the configured greeting message.",
        },
      });
    }
  }

  if (hasEmail) {
    steps.push({
      type: "notification",
      name: "Send email follow-up",
      details: {
        description: "Send the configured email to the captured address.",
      },
    });
  }

  if (hasSheet) {
    steps.push({
      type: "save",
      name: "Append row to Google Sheet",
      details: {
        description: "Write a row to the selected spreadsheet for tracking.",
      },
    });
  }

  if (steps.length === 1) {
    steps.push(
      {
        type: "action",
        name: "Persist automation data",
        details: {
          description: "Store the incoming record for tracking and follow-up.",
        },
      },
      {
        type: "notification",
        name: "Notify the team",
        details: {
          description: "Alert the assigned operator that the automation completed.",
        },
      },
    );
  }

  return {
    name: prompt.length > 72 ? `${prompt.slice(0, 69)}...` : prompt,
    description:
      "Auto-generated from the prompt using the deterministic fallback workflow builder.",
    trigger:
      mentionsGoogleForm || hasForm
        ? "New form submission"
        : hasSupport
          ? "New support request"
          : hasWebhook
            ? "Incoming webhook event"
            : "Incoming business event",
    steps: steps.slice(0, 6),
    integrations: dedupeIntegrations(integrations),
    requiredFields: dedupeRequiredFields(requiredFields),
    setupFields: dedupeSetupFields(setupFields),
  };
}
