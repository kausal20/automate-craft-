"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, SlidersHorizontal, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "toggle";
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: any;
};

export type FormCardProps = {
  title: string;
  description: string;
  fields: FieldDef[];
  onSubmit: (values: Record<string, any>) => void;
  summaryText?: (values: Record<string, any>) => string;
};

export function FormCard({ title, description, fields, onSubmit, summaryText }: FormCardProps) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        initial[f.key] = f.defaultValue;
      } else if (f.type === "toggle") {
        initial[f.key] = false;
      } else {
        initial[f.key] = "";
      }
    });
    return initial;
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [activeField, setActiveField] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status !== "idle") return;

    setStatus("submitting");
    
    // Simulate slight network/processing delay for premium feel
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    setStatus("submitted");
    onSubmit(values);
  };

  const updateValue = (key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const remainingInputs = fields.filter((field) => {
    if (field.type === "toggle") return false;
    const value = values[field.key];
    return String(value ?? "").trim().length === 0;
  }).length;

  if (status === "submitted") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full flex justify-end mb-6"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 shadow-lg">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <span className="text-[14px] text-white/80">
            {summaryText ? summaryText(values) : "Configuration saved successfully."}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[85%] mb-6"
    >
      <div className="relative overflow-hidden rounded-[22px] border border-[#222] bg-[#111] p-6 shadow-2xl shadow-black/40">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-accent ring-1 ring-white/10">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/80">
              Setup Required
            </p>
            <p className="mt-1 text-[16px] font-semibold tracking-wide text-white">
              {title || "Automation Setup"}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
              {description}
            </p>
            <div className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/70">
              {remainingInputs > 0 ? `${remainingInputs} inputs remaining` : "All required inputs completed"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative mt-7 space-y-5">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="block text-[13px] font-medium text-white/80 ml-1">
                {field.label}
              </label>

              {field.type === "text" || field.type === "number" ? (
                <div
                  className={`relative flex items-center rounded-[14px] border bg-[#1a1a1a] px-4 py-3 transition-all duration-200 ${
                    activeField === field.key
                      ? "border-accent ring-1 ring-accent/30 shadow-[0_0_12px_rgba(79,142,247,0.15)]"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    type={field.type}
                    value={values[field.key]}
                    onFocus={() => setActiveField(field.key)}
                    onBlur={() => setActiveField(null)}
                    onChange={(e) => updateValue(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={status === "submitting"}
                    className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/30 disabled:opacity-50"
                  />
                </div>
              ) : field.type === "select" ? (
                <div
                  className={`relative rounded-[14px] border bg-[#1a1a1a] transition-all duration-200 ${
                    activeField === field.key
                      ? "border-accent ring-1 ring-accent/30 shadow-[0_0_12px_rgba(79,142,247,0.15)]"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <select
                    value={values[field.key]}
                    onFocus={() => setActiveField(field.key)}
                    onBlur={() => setActiveField(null)}
                    onChange={(e) => updateValue(field.key, e.target.value)}
                    disabled={status === "submitting"}
                    className="w-full appearance-none bg-transparent px-4 py-3 text-[14px] text-white outline-none disabled:opacity-50"
                  >
                    <option value="" disabled hidden className="bg-[#1a1a1a] text-white/50">
                      Select an option
                    </option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                </div>
              ) : field.type === "toggle" ? (
                <div className="flex items-center gap-3 py-1 ml-1">
                  <button
                    type="button"
                    onClick={() => updateValue(field.key, !values[field.key])}
                    disabled={status === "submitting"}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                      values[field.key] ? "bg-accent" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        values[field.key] ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-[13px] text-white/60">
                    {values[field.key] ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ) : null}
            </div>
          ))}

          <div className="flex justify-end pt-4 border-t border-white/5 mt-6">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="group relative flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-6 text-[13px] font-bold text-black transition-all duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AnimatePresence mode="wait">
                {status === "submitting" ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-1.5"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
