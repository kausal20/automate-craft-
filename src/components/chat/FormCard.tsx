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
  const [revealedCount, setRevealedCount] = useState(1);

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

  const filledCount = fields.filter(isFieldComplete).length;
  const progressPercent = fields.length > 0 ? (filledCount / fields.length) * 100 : 0;

  const handleFieldBlur = (fieldIndex: number) => {
    setActiveField(null);
    if (isFieldComplete(fields[fieldIndex]) && fieldIndex + 1 >= revealedCount) {
      setRevealedCount(Math.min(fieldIndex + 2, fields.length));
    }
  };

  const revealAll = () => setRevealedCount(fields.length);

  if (status === "submitted") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full flex justify-end mb-6"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </motion.div>
          <span className="text-[14px] text-white/75">
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
      <div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0c0c0c] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {/* Animated gradient top strip */}
        <div className="relative h-[2px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent via-cyan-400 to-accent" />
          <motion.div
            className="absolute top-0 h-full w-24 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            animate={{ x: ["-96px", "500px"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="p-6">
          {/* Corner glow */}
          <div className="absolute -top-16 -left-16 h-32 w-32 rounded-full bg-accent/10 blur-[50px] pointer-events-none" />

          <div className="relative flex items-start gap-4">
            {/* Icon with gradient ring */}
            <div className="relative">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent/[0.04] ring-1 ring-accent/15">
                <SlidersHorizontal className="h-5 w-5 text-accent" />
              </div>
              {/* Animated ring */}
              <motion.div
                className="absolute -inset-0.5 rounded-2xl border border-accent/20"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/80">
                  Setup Required
                </p>
                {/* Circular step indicator */}
                <div className="relative h-5 w-5">
                  <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                    <motion.circle
                      cx="10" cy="10" r="8" fill="none" stroke="rgba(59,130,246,0.7)" strokeWidth="2"
                      strokeDasharray={50.265}
                      initial={{ strokeDashoffset: 50.265 }}
                      animate={{ strokeDashoffset: 50.265 - (progressPercent / 100) * 50.265 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/50">
                    {filledCount}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-[16px] font-semibold tracking-wide text-white">
                {title || "Automation Setup"}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">
                {description}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative mt-7 space-y-5">
            <AnimatePresence initial={false}>
              {fields.slice(0, revealedCount).map((field, index) => {
                const filled = isFieldComplete(field);
                const isActive = activeField === field.key;
                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 16, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                    className="space-y-2.5 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 ml-1">
                      <AnimatePresence mode="wait">
                        {filled ? (
                          <motion.div key="filled" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          </motion.div>
                        ) : (
                          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Circle className="h-3.5 w-3.5 text-white/15" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <label className="block text-[13px] font-medium text-white/70">
                        {field.label}
                      </label>
                    </div>

                    {field.type === "text" || field.type === "number" ? (
                      <div
                        className={`relative flex items-center rounded-[14px] border bg-white/[0.02] px-4 py-3.5 transition-all duration-300 ${
                          isActive
                            ? "border-accent/40 ring-1 ring-accent/20 shadow-[0_0_20px_rgba(59,130,246,0.08)] bg-white/[0.03]"
                            : filled
                              ? "border-emerald-500/15 bg-emerald-500/[0.02]"
                              : "border-white/[0.06] hover:border-white/10"
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
                          className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/25 disabled:opacity-50"
                        />
                      </div>
                    ) : field.type === "select" ? (
                      <div
                        className={`relative rounded-[14px] border bg-white/[0.02] transition-all duration-300 ${
                          isActive
                            ? "border-accent/40 ring-1 ring-accent/20 shadow-[0_0_20px_rgba(59,130,246,0.08)] bg-white/[0.03]"
                            : filled
                              ? "border-emerald-500/15 bg-emerald-500/[0.02]"
                              : "border-white/[0.06] hover:border-white/10"
                        }`}
                      >
                        <select
                          value={values[field.key]}
                          onFocus={() => setActiveField(field.key)}
                          onBlur={() => handleFieldBlur(index)}
                          onChange={(e) => {
                            updateValue(field.key, e.target.value);
                            if (index + 1 >= revealedCount) {
                              setRevealedCount(Math.min(index + 2, fields.length));
                            }
                          }}
                          disabled={status === "submitting"}
                          className="w-full appearance-none bg-transparent px-4 py-3.5 text-[14px] text-white outline-none disabled:opacity-50"
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
                        <motion.div
                          animate={{ rotate: isActive ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                        >
                          <ChevronDown className="h-4 w-4 text-white/30" />
                        </motion.div>
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
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 ${
                            values[field.key]
                              ? "bg-gradient-to-r from-accent to-cyan-500 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                              : "bg-white/[0.06] hover:bg-white/10"
                          }`}
                        >
                          <motion.span
                            className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] ring-0"
                            animate={{ x: values[field.key] ? 20 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                        <span className="text-[13px] text-white/50">
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
                className="text-[12px] font-medium text-accent/60 hover:text-accent transition-colors ml-1"
              >
                Show all {fields.length - revealedCount} remaining fields →
              </button>
            )}

            {/* Footer with segmented progress and submit */}
            <div className="pt-5 border-t border-white/[0.04] mt-6">
              {/* Segmented progress bar */}
              <div className="mb-4 flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {fields.map((_, i) => (
                    <motion.div
                      key={i}
                      className="h-1 flex-1 rounded-full overflow-hidden bg-white/[0.04]"
                    >
                      <motion.div
                        className={`h-full rounded-full ${i < filledCount ? "bg-gradient-to-r from-accent to-cyan-400" : ""}`}
                        initial={{ width: "0%" }}
                        animate={{ width: i < filledCount ? "100%" : "0%" }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                      />
                    </motion.div>
                  ))}
                </div>
                <span className="text-[11px] font-medium tabular-nums text-white/30 shrink-0">
                  {filledCount}/{fields.length}
                </span>
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-cyan-500 text-[14px] font-bold text-white transition-all duration-300 hover:shadow-[0_8px_32px_rgba(59,130,246,0.25)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {/* Animated shine sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
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
