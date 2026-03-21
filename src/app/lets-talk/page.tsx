"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";

/* LOGIC EXPLAINED:
This form used to wait for one second and then pretend it had been submitted.
The fix replaces that fake success flow with a real API request, readable form
state, and clear error handling so the page behaves like a real product page.
*/

type ConsultationFormState = {
  name: string;
  email: string;
  company: string;
  automationRequirement: string;
  budget: string;
};

const initialFormState: ConsultationFormState = {
  name: "",
  email: "",
  company: "",
  automationRequirement: "",
  budget: "",
};

export default function LetsTalkPage() {
  const [form, setForm] = useState<ConsultationFormState>(initialFormState);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("[LetsTalkPage] Consultation submit started.", form);
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
      console.log("[LetsTalkPage] Consultation response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not submit consultation request.");
      }

      setSubmitted(true);
      setForm(initialFormState);
    } catch (requestError) {
      console.error("[LetsTalkPage] Consultation submit failed.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not submit consultation request.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <PageIntro
        eyebrow="Let's Talk"
        title="Talk through the workflow before you commit."
        description="Tell us what you want to automate and we will help shape the right starting point for your business."
      />

      <section className="section-space bg-[#F9FAFB] pt-0">
        <div className="site-container grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal>
            <div className="card-surface h-full rounded-2xl p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                Consultation
              </p>
              <h2 className="mt-6 text-[2.2rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground md:text-[2.6rem]">
                Best for high-value workflows and custom rollouts.
              </h2>
              <p className="mt-6 text-sm leading-8 text-subtle">
                Use this form when you want help mapping a larger process, a
                multi-step integration flow, or an automation strategy that needs
                business context.
              </p>

              <div className="mt-8 space-y-3">
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
              <div className="card-surface rounded-2xl p-8 text-center">
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
                className="card-surface rounded-2xl p-6 md:p-8"
              >
                {error ? (
                  <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">
                      Name
                    </label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Your name"
                      className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="you@company.com"
                      className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
                    />
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
                    className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Automation requirement
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.automationRequirement}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        automationRequirement: event.target.value,
                      }))
                    }
                    placeholder="Describe the workflow you want to automate."
                    className="w-full resize-none rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Budget
                  </label>
                  <select
                    required
                    value={form.budget}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        budget: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
                  >
                    <option value="">Select a budget range</option>
                    <option>Under $50 / month</option>
                    <option>$50 to $150 / month</option>
                    <option>$150 to $500 / month</option>
                    <option>$500+ / month</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="button-hover mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-white transition-all duration-300 hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-70"
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
