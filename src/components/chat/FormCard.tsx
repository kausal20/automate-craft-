"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, SlidersHorizontal, CheckCircle2, ChevronDown, Loader2, Circle } from "lucide-react";

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
  const [revealedCount, setRevealedCount] = useState(1); // Start by revealing the first field

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status !== "idle") return;

    setStatus("submitting");
    await new Promise((resolve) => setTimeout(resolve, 800));
    setStatus("submitted");
    onSubmit(values);
  };

  const updateValue = (key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const isFieldComplete = (field: FieldDef) => {
    if (field.type === "toggle") return true;
    const value = values[field.key];
    return String(value ?? "").trim().length > 0;
  };

  // How many fields are filled
  const filledCount = fields.filter(isFieldComplete).length;
  const progressPercent = fields.length > 0 ? (filledCount / fields.length) * 100 : 0;

  // When user fills a field, reveal the next one
  const handleFieldBlur = (fieldIndex: number) => {
    setActiveField(null);
    if (isFieldComplete(fields[fieldIndex]) && fieldIndex + 1 >= revealedCount) {
      setRevealedCount(Math.min(fieldIndex + 2, fields.length));
    }
  };

  // Always reveal all fields if they click "show all"
  const revealAll = () => setRevealedCount(fields.length);

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
      <div className="relative overflow-hidden rounded-[22px] border border-[#222] bg-[#111] shadow-2xl shadow-black/40">
        {/* Top gradient accent strip */}
        <div className="h-[3px] w-full bg-gradient-to-r from-accent via-cyan-400 to-accent" />

        <div className="p-6">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent ring-1 ring-accent/20">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/80">
                  Setup Required
                </p>
                <span className="text-[11px] font-medium text-white/30">
                  Step {Math.min(filledCount + 1, fields.length)} of {fields.length}
                </span>
              </div>
              <p className="mt-1 text-[16px] font-semibold tracking-wide text-white">
                {title || "Automation Setup"}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                {description}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative mt-7 space-y-5">
            <AnimatePresence initial={false}>
              {fields.slice(0, revealedCount).map((field, index) => {
                const filled = isFieldComplete(field);
                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 16, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 ml-1">
                      {filled ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-white/20" />
                      )}
                      <label className="block text-[13px] font-medium text-white/80">
                        {field.label}
                      </label>
                    </div>

                    {field.type === "text" || field.type === "number" ? (
                      <div
                        className={`relative flex items-center rounded-[14px] border bg-[#1a1a1a] px-4 py-3 transition-all duration-200 ${
                          activeField === field.key
                            ? "border-accent ring-1 ring-accent/30 shadow-[0_0_12px_rgba(79,142,247,0.15)]"
                            : filled
                              ? "border-emerald-500/20"
                              : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <input
                          type={field.type}
                          value={values[field.key]}
                          onFocus={() => setActiveField(field.key)}
                          onBlur={() => handleFieldBlur(index)}
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
                            : filled
                              ? "border-emerald-500/20"
                              : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <select
                          value={values[field.key]}
                          onFocus={() => setActiveField(field.key)}
                          onBlur={() => handleFieldBlur(index)}
                          onChange={(e) => {
                            updateValue(field.key, e.target.value);
                            // Auto-reveal next when select is chosen
                            if (index + 1 >= revealedCount) {
                              setRevealedCount(Math.min(index + 2, fields.length));
                            }
                          }}
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
                          onClick={() => {
                            updateValue(field.key, !values[field.key]);
                            if (index + 1 >= revealedCount) {
                              setRevealedCount(Math.min(index + 2, fields.length));
                            }
                          }}
                          disabled={status === "submitting"}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 ${
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
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Show all fields link */}
            {revealedCount < fields.length && (
              <button
                type="button"
                onClick={revealAll}
                className="text-[12px] font-medium text-accent/70 hover:text-accent transition-colors ml-1"
              >
                Show all {fields.length - revealedCount} remaining fields →
              </button>
            )}

            {/* Footer with progress bar and submit */}
            <div className="pt-5 border-t border-white/5 mt-6">
              {/* Progress bar */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-400"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[11px] font-medium tabular-nums text-white/40 shrink-0">
                  {filledCount}/{fields.length}
                </span>
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-cyan-500 text-[14px] font-bold text-white transition-all duration-200 hover:shadow-[0_4px_20px_rgba(59,130,246,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="flex items-center gap-2"
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
      </div>
    </motion.div>
  );
}
