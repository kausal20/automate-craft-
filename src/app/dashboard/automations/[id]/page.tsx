"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pause,
  Play,
  Save,
  ScrollText,
  Trash2,
} from "lucide-react";
import type { AutomationSetupField, ConnectionStatus } from "@/lib/automation";

/* LOGIC EXPLAINED:
This page loads one saved automation and lets you update its name and setup
values. The fix adds logs around load, save, run, pause, and delete so you can
trace each action from the browser and quickly see where the request failed.
*/

type AutomationDetail = {
  id: string;
  name: string;
  status: "active" | "paused";
  formInputs: Record<string, string>;
  integrationStatus: Record<string, ConnectionStatus>;
  webhookId: string;
  workflow: {
    trigger: string;
    steps: Array<{
      type: string;
      name: string;
      details: Record<string, string>;
    }>;
    integrations: string[];
  };
};

function renderFieldInput(
  field: AutomationSetupField,
  value: string,
  onChange: (value: string) => void,
) {
  const className =
    "w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

  if (field.type === "textarea") {
    return (
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className={`${className} resize-none`}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        value={value || field.options?.[0] || ""}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      >
        {(field.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  const type =
    field.type === "phone"
      ? "tel"
      : field.type === "email"
        ? "email"
        : "text";

  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      className={className}
    />
  );
}

export default function AutomationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const automationId = params.id;
  const [automation, setAutomation] = useState<AutomationDetail | null>(null);
  const [fieldDefinitions, setFieldDefinitions] = useState<AutomationSetupField[]>([]);
  const [name, setName] = useState("");
  const [formInputs, setFormInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAutomation = async () => {
    console.log("[AutomationDetailPage] Loading automation.", automationId);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        automation?: AutomationDetail;
        fieldDefinitions?: AutomationSetupField[];
        error?: string;
      };
      console.log("[AutomationDetailPage] Load response received.", json);

      if (!response.ok || !json.automation) {
        throw new Error(json.error || "Could not load automation.");
      }

      setAutomation(json.automation);
      setName(json.automation.name);
      setFormInputs(json.automation.formInputs || {});
      setFieldDefinitions(json.fieldDefinitions || []);
      console.log("[AutomationDetailPage] Automation stored in state.");
    } catch (requestError) {
      console.error("[AutomationDetailPage] Failed to load automation.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load automation.",
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshAutomation = useEffectEvent(() => {
    void loadAutomation();
  });

  useEffect(() => {
    if (!automationId) {
      return;
    }

    refreshAutomation();
  }, [automationId]);

  const handleSave = async () => {
    console.log("[AutomationDetailPage] Saving automation.", automationId);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          formInputs,
        }),
      });
      const json = (await response.json()) as {
        automation?: AutomationDetail;
        error?: string;
      };
      console.log("[AutomationDetailPage] Save response received.", json);

      if (!response.ok || !json.automation) {
        throw new Error(json.error || "Could not save automation.");
      }

      setAutomation(json.automation);
      setSuccess("Automation settings updated.");
    } catch (requestError) {
      console.error("[AutomationDetailPage] Failed to save automation.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save automation.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!automation) {
      console.log("[AutomationDetailPage] Status change blocked because automation is missing.");
      return;
    }

    console.log("[AutomationDetailPage] Toggling status for automation.", automationId);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: automation.status === "active" ? "paused" : "active",
        }),
      });
      const json = (await response.json()) as {
        automation?: AutomationDetail;
        error?: string;
      };
      console.log("[AutomationDetailPage] Status response received.", json);

      if (!response.ok || !json.automation) {
        throw new Error(json.error || "Could not update automation status.");
      }

      setAutomation(json.automation);
      setSuccess(
        json.automation.status === "active"
          ? "Automation resumed."
          : "Automation paused.",
      );
    } catch (requestError) {
      console.error("[AutomationDetailPage] Failed to update status.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update automation status.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    console.log("[AutomationDetailPage] Running automation.", automationId);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/run-automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ automationId }),
      });
      const json = (await response.json()) as { error?: string };
      console.log("[AutomationDetailPage] Run response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not run automation.");
      }

      setSuccess("Automation run started successfully.");
    } catch (requestError) {
      console.error("[AutomationDetailPage] Failed to run automation.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not run automation.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    console.log("[AutomationDetailPage] Deleting automation.", automationId);
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { error?: string };
      console.log("[AutomationDetailPage] Delete response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not delete automation.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (requestError) {
      console.error("[AutomationDetailPage] Failed to delete automation.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete automation.",
      );
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="card-surface rounded-[2rem] p-10 text-center text-foreground/56">
          Loading automation...
        </div>
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="card-surface rounded-[2rem] p-10 text-center text-red-500">
          {error || "Automation not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/58 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-foreground">
            Customize Automation
          </h1>
          <p className="mt-2 text-foreground/58">
            Update setup values, manage execution status, and keep this workflow
            aligned with your operation.
          </p>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${
            automation.status === "active"
              ? "bg-green-50 text-green-700"
              : "bg-black/[0.05] text-foreground/56"
          }`}
        >
          {automation.status}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="card-surface rounded-[2rem] p-6 sm:p-8">
          <label className="mb-2 block text-sm font-semibold text-foreground">
            Automation name
          </label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
          />

          <div className="mt-8 space-y-5">
            {fieldDefinitions.map((field) => (
              <div key={field.key}>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  {field.label}
                </label>
                {renderFieldInput(field, formInputs[field.key] || "", (value) =>
                  setFormInputs((current) => ({
                    ...current,
                    [field.key]: value,
                  }))
                )}
                <p className="mt-2 text-xs leading-6 text-foreground/48">
                  {field.helpText}
                </p>
              </div>
            ))}
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm font-medium text-green-700">
              {success}
            </div>
          ) : null}

          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </section>

        <aside className="space-y-6">
          <section className="card-surface rounded-[2rem] p-6">
            <h2 className="text-xl font-semibold text-foreground">Workflow</h2>
            <div className="mt-5 rounded-[1.5rem] border border-accent/15 bg-accent/[0.05] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                Trigger
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {automation.workflow.trigger}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {automation.workflow.steps.map((step, index) => (
                <div
                  key={`${step.name}-${index}`}
                  className="rounded-[1.4rem] border border-black/8 bg-white p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/40">
                    {step.type}
                  </p>
                  <p className="mt-2 font-semibold text-foreground">{step.name}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card-surface rounded-[2rem] p-6">
            <h2 className="text-xl font-semibold text-foreground">Management</h2>
            <div className="mt-5 space-y-3">
              <button
                onClick={() => void handleRun()}
                disabled={saving || automation.status !== "active"}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play className="h-4 w-4" />
                Run Automation
              </button>

              <button
                onClick={() => void handleStatusToggle()}
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {automation.status === "active" ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause Automation
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Resume Automation
                  </>
                )}
              </button>

              <Link
                href="/dashboard/logs"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
              >
                <ScrollText className="h-4 w-4" />
                View Logs
              </Link>

              <button
                onClick={() => void handleDelete()}
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-5 text-sm font-semibold text-red-600 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Delete Automation
              </button>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-black/8 bg-black/[0.02] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/40">
                Webhook
              </p>
              <p className="mt-2 text-sm font-medium text-foreground/70">
                /api/webhook/{automation.webhookId}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
