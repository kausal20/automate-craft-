"use client";

import Link from "next/link";
import type { RefObject } from "react";
import {
  Bot,
  CheckCircle2,
  LockKeyhole,
  MessageSquareText,
  PlugZap,
  Puzzle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  AuthenticatedUser,
  AutomationSetupField,
  ConnectionStatus,
} from "@/lib/automation";
import SocialMiniButtons from "@/components/home/SocialMiniButtons";

/* LOGIC EXPLAINED:
This preview is the bridge between the hero input and the rest of the product
flow. The update keeps it clearly above the fixed 3D canvas and smooths the
entry animation so the transition from prompt to workflow feels deliberate.
*/

type WorkflowResponse = {
  workflow: {
    name: string;
    description: string;
    trigger: string;
    steps: Array<{
      type: string;
      name: string;
      details: Record<string, string>;
    }>;
    integrations: string[];
  };
  fieldDefinitions: AutomationSetupField[];
  source: "openai" | "fallback";
};

type HomeAutomationPreviewProps = {
  isGenerating: boolean;
  result: WorkflowResponse | null;
  user: AuthenticatedUser | null;
  socialAuthEnabled: boolean;
  ssoEnabled: boolean;
  integrationStatus: Record<string, ConnectionStatus>;
  connectionLoading: string | null;
  fieldValues: Record<string, string>;
  error: string | null;
  successMessage: string | null;
  isSaving: boolean;
  allIntegrationsConnected: boolean;
  resumePath: string;
  resultRef: RefObject<HTMLElement | null>;
  onConnectIntegration: (integration: string) => void;
  onFieldChange: (fieldKey: string, value: string) => void;
  onActivate: () => void;
};

function renderFieldInput(
  field: AutomationSetupField,
  value: string,
  disabled: boolean,
  onChange: (nextValue: string) => void,
) {
  const commonClassName =
    "w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-foreground/42";

  if (field.type === "textarea") {
    return (
      <textarea
        rows={4}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className={`${commonClassName} resize-none`}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        value={value || field.options?.[0] || ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={commonClassName}
      >
        {(field.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  const htmlType =
    field.type === "phone"
      ? "tel"
      : field.type === "email"
        ? "email"
        : "text";

  return (
    <input
      type={htmlType}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      className={commonClassName}
    />
  );
}

export default function HomeAutomationPreview({
  isGenerating,
  result,
  user,
  socialAuthEnabled,
  ssoEnabled,
  integrationStatus,
  connectionLoading,
  fieldValues,
  error,
  successMessage,
  isSaving,
  allIntegrationsConnected,
  resumePath,
  resultRef,
  onConnectIntegration,
  onFieldChange,
  onActivate,
}: HomeAutomationPreviewProps) {
  return (
    <AnimatePresence mode="wait">
      {isGenerating || result || error || successMessage ? (
        <motion.section
          ref={resultRef}
          key="automation-preview"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 bg-white pb-12"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="card-surface overflow-hidden rounded-[2.5rem] border border-white/70 p-6 sm:p-8 lg:p-10">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-7 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-accent/10 text-accent">
                    <Bot className="h-10 w-10 animate-pulse" />
                    <div className="absolute inset-0 animate-ping rounded-[1.75rem] bg-accent/14 opacity-70" />
                  </div>
                  <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                    Building your automation plan
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/58">
                    Understanding the workflow, selecting the right
                    integrations, and shaping the setup form you will actually
                    need to launch it.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-10 border-b border-black/6 pb-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-black/[0.02] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                        <MessageSquareText className="h-4 w-4" />
                        Generated blueprint
                      </div>

                      <h2 className="mt-6 text-3xl font-semibold tracking-[-0.055em] text-foreground sm:text-4xl">
                        {result?.workflow.name || "Automation draft"}
                      </h2>
                      <p className="mt-4 max-w-2xl text-base leading-8 text-foreground/60">
                        {result?.workflow.description}
                      </p>

                      <div className="mt-7 rounded-[1.75rem] border border-accent/15 bg-accent/[0.05] p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                          Trigger
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {result?.workflow.trigger}
                        </p>
                      </div>

                      <div className="mt-6 space-y-3">
                        {result?.workflow.steps.map((step, index) => (
                          <div
                            key={`${step.name}-${index}`}
                            className="flex gap-4 rounded-[1.6rem] border border-black/8 bg-white p-5"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] text-sm font-semibold text-foreground/62">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/38">
                                {step.type}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                {step.name}
                              </p>
                              <div className="mt-3 space-y-1.5 text-sm leading-6 text-foreground/60">
                                {Object.entries(step.details).map(([key, value]) => (
                                  <p key={key}>
                                    <span className="font-semibold text-foreground/72">
                                      {key}:
                                    </span>{" "}
                                    {value}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-[1.75rem] border border-black/8 bg-black/[0.02] p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                            <Puzzle className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Required integrations
                            </p>
                            <p className="text-sm text-foreground/52">
                              Connect the services needed for this workflow.
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 space-y-3">
                          {result?.workflow.integrations.map((integration) => {
                            const isConnected =
                              integrationStatus[integration] === "connected";

                            return (
                              <div
                                key={integration}
                                className="flex items-center justify-between rounded-[1.35rem] border border-black/8 bg-white p-4"
                              >
                                <div>
                                  <p className="font-semibold capitalize text-foreground">
                                    {integration}
                                  </p>
                                  <p className="text-sm text-foreground/52">
                                    {user
                                      ? isConnected
                                        ? "Connected"
                                        : "Needs connection"
                                      : "Sign in to connect"}
                                  </p>
                                </div>

                                <button
                                  onClick={() => onConnectIntegration(integration)}
                                  disabled={
                                    !user ||
                                    isConnected ||
                                    connectionLoading === integration
                                  }
                                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition-all ${
                                    isConnected
                                      ? "bg-green-50 text-green-700"
                                      : "btn-dark hover:bg-[#2a2a2a]"
                                  } disabled:cursor-not-allowed disabled:opacity-55`}
                                >
                                  {connectionLoading === integration
                                    ? "Connecting..."
                                    : isConnected
                                      ? "Connected"
                                      : "Connect"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-[1.75rem] border border-black/8 bg-white p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                            <PlugZap className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Setup form
                            </p>
                            <p className="text-sm text-foreground/52">
                              AI-generated from the workflow requirements.
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 space-y-4">
                          {result?.fieldDefinitions.map((field) => (
                            <div key={field.key}>
                              <label className="mb-2 block text-sm font-semibold text-foreground">
                                {field.label}
                              </label>
                              {renderFieldInput(
                                field,
                                fieldValues[field.key] || "",
                                !user,
                                (nextValue) => onFieldChange(field.key, nextValue),
                              )}
                              <p className="mt-2 text-xs leading-6 text-foreground/48">
                                {field.helpText}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {!user ? (
                        <div className="rounded-[1.85rem] border border-black/8 bg-[#f8fbff] p-6">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                              <LockKeyhole className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                                Ready to activate this automation?
                              </h3>
                              <p className="mt-3 text-sm leading-7 text-foreground/60">
                                You can preview the workflow before signing in.
                                Create an account to connect apps, complete the
                                setup form, and launch the automation.
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-col gap-3">
                            <Link
                              href={`/signup?next=${encodeURIComponent(resumePath)}`}
                              className="btn-dark inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition-all hover:-translate-y-0.5"
                            >
                              Create Account
                            </Link>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <Link
                                href={`/login?next=${encodeURIComponent(resumePath)}`}
                                className="inline-flex h-12 items-center justify-center rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
                              >
                                Sign In
                              </Link>

                              <SocialMiniButtons
                                resumePath={resumePath}
                                socialAuthEnabled={socialAuthEnabled}
                                ssoEnabled={ssoEnabled}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {error ? (
                            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
                              {error}
                            </div>
                          ) : null}

                          {successMessage ? (
                            <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm font-medium text-green-700">
                              {successMessage}
                            </div>
                          ) : null}

                          <div className="mb-4 rounded-xl border border-[#3B82F6]/10 bg-[#3B82F6]/[0.02] py-3 px-4 text-center">
                            <p className="text-xs font-semibold text-[#6B7280]">
                              Estimated usage: <span className="text-[#111111]">5 credits</span> to create • ~<span className="text-[#111111]">{
                                1 +
                                (result?.workflow.integrations.includes("whatsapp") ? 2 : 0) +
                                (result?.workflow.integrations.includes("email") ? 1 : 0) +
                                ((result?.workflow.steps || []).some(s => s.name.toLowerCase().includes("crm")) ? 1 : 0)
                              } credits</span> per run
                            </p>
                          </div>

                          <button
                            onClick={onActivate}
                            disabled={isSaving || !allIntegrationsConnected}
                            className="btn-dark inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1.2rem] px-8 text-base font-semibold shadow-[0_14px_32px_rgba(28,28,28,0.14)] transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                            {isSaving ? "Activating..." : "Activate Automation"}
                          </button>

                          {!allIntegrationsConnected ? (
                            <p className="mt-3 text-center text-xs text-foreground/48">
                              Connect each required integration before activation.
                            </p>
                          ) : null}

                          {successMessage ? (
                            <Link
                              href="/dashboard"
                              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
                            >
                              Open Dashboard
                            </Link>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>

                  {error && !result ? (
                    <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
                      {error}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
