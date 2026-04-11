"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";

type ConsultationFormState = {
  name: string;
  email: string;
  company: string;
  automationRequirement: string;
  budget: string;
};

type FieldErrors = Partial<Record<keyof ConsultationFormState, string>>;

const initialFormState: ConsultationFormState = {
  name: "",
  email: "",
  company: "",
  automationRequirement: "",
  budget: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form: ConsultationFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (form.automationRequirement.trim().length < 10) {
    errors.automationRequirement =
      "Please describe your requirement in at least 10 characters.";
  }

  if (!form.budget) {
    errors.budget = "Select a budget range.";
  }

  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1.5 text-xs font-medium text-red-500">{message}</p>
  );
}

export default function LetsTalkPage() {
  const [form, setForm] = useState<ConsultationFormState>(initialFormState);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<keyof ConsultationFormState>>(new Set());

  const markTouched = (field: keyof ConsultationFormState) => {
    setTouched((prev) => new Set(prev).add(field));
  };

  const handleBlur = (field: keyof ConsultationFormState) => {
    markTouched(field);
    const errors = validateForm(form);
    setFieldErrors(errors);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate all fields on submit
    const errors = validateForm(form);
    setFieldErrors(errors);
    setTouched(new Set(Object.keys(form) as (keyof ConsultationFormState)[]));

    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || "Could not submit consultation request.");
      }

      setSubmitted(true);
      setForm(initialFormState);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not submit consultation request.",
      );
    } finally {
      setLoading(false);
    }
  };

  const visibleError = (field: keyof ConsultationFormState) =>
    touched.has(field) ? fieldErrors[field] : undefined;

  return (
    <main className="min-h-screen">
      <PageIntro
        eyebrow="Let's Talk"
        title="Talk through the workflow before you commit."
        description="Share the process you want to automate and we will help shape the right starting point for your team."
      />

      <section className="section-space section-muted pt-0">
        <div className="site-container grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal>
            <div className="card-surface h-full rounded-[24px] p-6 md:p-8">
              <p className="eyebrow">Consultation</p>
              <h2 className="mt-6 text-[2.2rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground md:text-[2.6rem]">
                Best for high-value workflows and custom rollout planning.
              </h2>
              <p className="mt-7 text-[0.97rem] leading-8 text-subtle">
                Use this form when you want help mapping a larger process, a
                multi-step integration flow, or an automation strategy that needs
                business context.
              </p>

              <div className="mt-10 space-y-3">
                {[
                  "Share the process you want to automate",
                  "Add budget and company context",
                  "Get a tailored follow-up from our team",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-subtle">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            {submitted ? (
              <div className="card-surface rounded-[24px] p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="mt-6 text-3xl font-bold tracking-[-0.04em] text-foreground">
                  Consultation request received
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-foreground/68">
                  Thanks for sharing your workflow details. Our team will follow up
                  with next steps and a proposed consultation slot.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="card-surface rounded-[24px] p-6 md:p-8"
              >
                {error ? (
                  <div className="mb-6 rounded-[20px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">
                      Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      onBlur={() => handleBlur("name")}
                      placeholder="Your name"
                      className={`w-full rounded-[18px] border bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 ${
                        visibleError("name")
                          ? "border-red-300"
                          : "border-white/10"
                      }`}
                    />
                    <FieldError message={visibleError("name")} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      onBlur={() => handleBlur("email")}
                      placeholder="you@company.com"
                      className={`w-full rounded-[18px] border bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 ${
                        visibleError("email")
                          ? "border-red-300"
                          : "border-white/10"
                      }`}
                    />
                    <FieldError message={visibleError("email")} />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Company
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        company: event.target.value,
                      }))
                    }
                    placeholder="Company name"
                    className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Automation requirement
                  </label>
                  <textarea
                    rows={5}
                    value={form.automationRequirement}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        automationRequirement: event.target.value,
                      }))
                    }
                    onBlur={() => handleBlur("automationRequirement")}
                    placeholder="Describe the workflow you want to automate."
                    className={`w-full resize-none rounded-[18px] border bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 ${
                      visibleError("automationRequirement")
                        ? "border-red-300"
                        : "border-white/10"
                    }`}
                  />
                  <FieldError message={visibleError("automationRequirement")} />
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Budget
                  </label>
                  <select
                    value={form.budget}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        budget: event.target.value,
                      }))
                    }
                    onBlur={() => handleBlur("budget")}
                    className={`w-full rounded-[18px] border bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 ${
                      visibleError("budget")
                        ? "border-red-300"
                        : "border-white/10"
                    }`}
                  >
                    <option value="">Select a budget range</option>
                    <option>Under $50 / month</option>
                    <option>$50 to $150 / month</option>
                    <option>$150 to $500 / month</option>
                    <option>$500+ / month</option>
                  </select>
                  <FieldError message={visibleError("budget")} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="button-hover mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black transition-all duration-300 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70 shadow-[0_8px_20px_rgba(255,255,255,0.1)]"
                >
                  {loading ? "Sending..." : "Book Free Automation Consultation"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </main>
  );
}
