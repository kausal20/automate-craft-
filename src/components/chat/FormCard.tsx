"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronDown, Loader2, Circle, SlidersHorizontal, Shield, Zap } from "lucide-react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export type FieldValue = string | number | boolean;

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "toggle";
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: FieldValue;
};

export type FormCardProps = {
  title: string;
  description: string;
  fields: FieldDef[];
  onSubmit: (values: Record<string, FieldValue>) => void;
  summaryText?: (values: Record<string, FieldValue>) => string;
};

export function FormCard({ title, description, fields, onSubmit, summaryText }: FormCardProps) {
  const reducedMotion = useReducedMotion();
  const [values, setValues] = useState<Record<string, FieldValue>>(() => {
    const initial: Record<string, FieldValue> = {};
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
    await new Promise((resolve) => setTimeout(resolve, 700));
    setStatus("submitted");
    onSubmit(values);
  };

  const updateValue = (key: string, val: FieldValue) => {
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
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="mb-4"
      >
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-emerald-500/[0.02] px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-[30px]" />
          <div className="relative flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </motion.div>
            <div>
              <p className="text-[14px] font-semibold text-white">Configuration Saved</p>
              <p className="text-[12px] text-white/40 mt-0.5">
                {summaryText ? summaryText(values) : "Building your workflow now..."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-5"
    >
      {/* 3D Card with layered depth */}
      <div className="relative group">
        {/* Shadow layer for 3D depth */}
        <div className="absolute inset-0 rounded-2xl bg-accent/[0.03] translate-y-1 blur-xl transition-all duration-300 group-hover:translate-y-2 group-hover:blur-2xl" />

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111] to-[#0c0c0c] shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]">
          {/* Animated gradient top accent */}
          <div className="relative h-[3px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/60 via-cyan-400/60 to-violet-400/60" />
            <motion.div
              className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/60 to-transparent"
              animate={{ x: ["-80px", "600px"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <div className="p-6">
            {/* Ambient glow */}
            <div className="absolute -top-12 -left-12 h-28 w-28 rounded-full bg-accent/8 blur-[40px] pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 h-20 w-20 rounded-full bg-violet-500/5 blur-[30px] pointer-events-none" />

            {/* Header with 3D icon */}
            <div className="relative flex items-start gap-4 mb-6">
              <div className="relative">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/[0.05] shadow-[0_4px_16px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-accent/15">
                  <SlidersHorizontal className="h-5 w-5 text-accent" />
                </div>
                {/* Orbiting dot */}
                {!reducedMotion && (
                  <motion.div
                    className="absolute -inset-1"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute top-0 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-0.5 rounded-full bg-accent/60 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                  </motion.div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent/40">Phase 2 · Setup</span>
                  {/* Circular progress */}
                  <div className="relative h-5 w-5">
                    <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                      <motion.circle
                        cx="10" cy="10" r="8" fill="none" stroke="rgba(59,130,246,0.6)" strokeWidth="2"
                        strokeDasharray={50.265}
                        initial={{ strokeDashoffset: 50.265 }}
                        animate={{ strokeDashoffset: 50.265 - (progressPercent / 100) * 50.265 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/40">{filledCount}</span>
                  </div>
                </div>
                <p className="text-[16px] font-semibold text-white tracking-tight">{title || "Automation Setup"}</p>
                <p className="mt-1 text-[13px] text-white/40 leading-relaxed">{description}</p>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] px-2.5 py-1">
                <Shield className="h-3 w-3 text-emerald-400/60" />
                <span className="text-[10px] font-medium text-white/30">End-to-end encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] px-2.5 py-1">
                <Zap className="h-3 w-3 text-amber-400/60" />
                <span className="text-[10px] font-medium text-white/30">Auto-validated</span>
              </div>
            </div>

            {/* Form fields */}
            <form onSubmit={handleSubmit} className="relative space-y-4">
              <AnimatePresence initial={false}>
                {fields.slice(0, revealedCount).map((field, index) => {
                  const filled = isFieldComplete(field);
                  const isActive = activeField === field.key;
                  return (
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, y: 12, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                      className="overflow-hidden"
                    >
                      {/* Field label with status */}
                      <div className="flex items-center gap-2 mb-2">
                        <AnimatePresence mode="wait">
                          {filled ? (
                            <motion.div key="filled" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            </motion.div>
                          ) : (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                              <Circle className="h-3.5 w-3.5 text-white/12" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <label className="text-[13px] font-medium text-white/55">{field.label}</label>
                      </div>

                      {/* 3D Input fields with inner shadow */}
                      {field.type === "text" || field.type === "number" ? (
                        <div className={`relative rounded-xl transition-all duration-250 ${
                          isActive ? "shadow-[0_0_0_2px_rgba(59,130,246,0.2),0_4px_16px_rgba(59,130,246,0.06)]" : ""
                        }`}>
                          <input
                            type={field.type}
                            value={String(values[field.key] ?? "")}
                            onFocus={() => setActiveField(field.key)}
                            onBlur={() => handleFieldBlur(index)}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={status === "submitting"}
                            className={`w-full rounded-xl border bg-[#0a0a0a] px-4 py-3.5 text-[14px] text-white outline-none transition-all duration-200 placeholder:text-white/18 disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] ${
                              isActive
                                ? "border-accent/40 bg-[#0c0c0c]"
                                : filled
                                  ? "border-emerald-500/20 bg-[#0b0b0b]"
                                  : "border-white/[0.07] hover:border-white/[0.12]"
                            }`}
                          />
                          {/* Active glow line at bottom */}
                          {isActive && (
                            <motion.div
                              layoutId="activeGlow"
                              className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-transparent via-accent/50 to-transparent"
                            />
                          )}
                        </div>
                      ) : field.type === "select" ? (
                        <div className={`relative rounded-xl transition-all duration-250 ${
                          isActive ? "shadow-[0_0_0_2px_rgba(59,130,246,0.2),0_4px_16px_rgba(59,130,246,0.06)]" : ""
                        }`}>
                          <select
                            value={String(values[field.key] ?? "")}
                            onFocus={() => setActiveField(field.key)}
                            onBlur={() => handleFieldBlur(index)}
                            onChange={(e) => {
                              updateValue(field.key, e.target.value);
                              if (index + 1 >= revealedCount) {
                                setRevealedCount(Math.min(index + 2, fields.length));
                              }
                            }}
                            disabled={status === "submitting"}
                            className={`w-full appearance-none rounded-xl border bg-[#0a0a0a] px-4 py-3.5 text-[14px] text-white outline-none transition-all duration-200 disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] ${
                              isActive
                                ? "border-accent/40 bg-[#0c0c0c]"
                                : filled
                                  ? "border-emerald-500/20 bg-[#0b0b0b]"
                                  : "border-white/[0.07] hover:border-white/[0.12]"
                            }`}
                          >
                            <option value="" disabled hidden className="bg-[#1a1a1a] text-white/50">Select an option</option>
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-white">{opt.label}</option>
                            ))}
                          </select>
                          <motion.div
                            animate={{ rotate: isActive ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                          >
                            <ChevronDown className="h-4 w-4 text-white/25" />
                          </motion.div>
                        </div>
                      ) : field.type === "toggle" ? (
                        <div className="flex items-center gap-3 py-1 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateValue(field.key, !Boolean(values[field.key]));
                              if (index + 1 >= revealedCount) {
                                setRevealedCount(Math.min(index + 2, fields.length));
                              }
                            }}
                            disabled={status === "submitting"}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                              Boolean(values[field.key])
                                ? "bg-gradient-to-r from-accent to-cyan-500 shadow-[0_0_12px_rgba(59,130,246,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]"
                                : "bg-white/[0.06] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                            }`}
                          >
                            <motion.span
                              className="pointer-events-none inline-block h-4.5 w-4.5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                              style={{ width: 18, height: 18 }}
                              animate={{ x: Boolean(values[field.key]) ? 22 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                          <span className={`text-[13px] transition-colors ${Boolean(values[field.key]) ? "text-accent/80" : "text-white/30"}`}>
                            {Boolean(values[field.key]) ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      ) : null}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Show all fields */}
              {revealedCount < fields.length && (
                <button
                  type="button"
                  onClick={revealAll}
                  className="text-[12px] font-medium text-accent/50 hover:text-accent transition-colors pl-1"
                >
                  Show {fields.length - revealedCount} more fields →
                </button>
              )}

              {/* Footer — Progress + Submit */}
              <div className="pt-5 border-t border-white/[0.05] mt-2">
                {/* Segmented progress */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {fields.map((_, i) => (
                      <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-white/[0.04]">
                        <motion.div
                          className={`h-full rounded-full ${i < filledCount ? "bg-gradient-to-r from-accent to-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.2)]" : ""}`}
                          initial={{ width: "0%" }}
                          animate={{ width: i < filledCount ? "100%" : "0%" }}
                          transition={{ duration: 0.3, delay: i * 0.04 }}
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-white/25 shrink-0">{filledCount}/{fields.length}</span>
                </div>

                {/* 3D Submit button */}
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="group relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-accent to-blue-600 text-[14px] font-bold text-white transition-all duration-200 shadow-[0_4px_16px_rgba(59,130,246,0.25),0_1px_0_rgba(255,255,255,0.1)_inset] hover:shadow-[0_8px_28px_rgba(59,130,246,0.35)] hover:translate-y-[-1px] active:translate-y-[1px] active:shadow-[0_2px_8px_rgba(59,130,246,0.15)] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  {/* Shine sweep */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <AnimatePresence mode="wait">
                    {status === "submitting" ? (
                      <motion.div key="loading" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </motion.div>
                    ) : (
                      <motion.div key="idle" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2">
                        Configure
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
