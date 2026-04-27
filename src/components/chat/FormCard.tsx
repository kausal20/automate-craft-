"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Settings2,
  Phone,
  MessageSquare,
  Gauge,
  ShieldCheck,
  Lock,
  Zap,
  Check,
} from "lucide-react";

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

/* ── Helper text per field key ── */
const FIELD_HELPERS: Record<string, string> = {
  phone: "Include country code (e.g., +1) for WhatsApp delivery",
  message: "Supports variables like {{name}} from your form data",
  priority: "High priority sends immediately; Standard queues",
  enableLogging: "Records each execution for audit compliance",
};

/* ── Icon per field key ── */
const FIELD_ICONS: Record<string, React.ElementType> = {
  phone: Phone,
  message: MessageSquare,
  priority: Gauge,
  enableLogging: ShieldCheck,
};

/* ── Group definitions ── */
const FIELD_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Destination", keys: ["phone"] },
  { label: "Content", keys: ["message"] },
  { label: "Delivery settings", keys: ["priority", "enableLogging"] },
];

function getFieldGroup(key: string): string {
  for (const g of FIELD_GROUPS) {
    if (g.keys.includes(key)) return g.label;
  }
  return "";
}

/* ────────────────────────────────────────────
   Submitted State
   ──────────────────────────────────────────── */
function SubmittedCard({ values, fields, summaryText }: { values: Record<string, FieldValue>; fields: FieldDef[]; summaryText?: (v: Record<string, FieldValue>) => string }) {
  const summary = summaryText
    ? summaryText(values)
    : buildSummary(values, fields);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-4"
    >
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)] opacity-80">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/[0.1] ring-1 ring-emerald-400/20">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <motion.div
                className="absolute inset-0 rounded-lg border border-emerald-400/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-emerald-400/80">Configuration locked</p>
              <p className="text-[11px] text-white/25 mt-0.5">Building your workflow…</p>
            </div>
          </div>
          <p className="text-[11px] text-white/30 leading-relaxed pl-10">{summary}</p>
        </div>
      </div>
    </motion.div>
  );
}

function buildSummary(values: Record<string, FieldValue>, fields: FieldDef[]): string {
  const parts: string[] = [];
  for (const f of fields) {
    const v = values[f.key];
    if (f.type === "toggle") {
      parts.push(`${f.label}: ${v ? "On" : "Off"}`);
    } else if (v && String(v).trim()) {
      const display = String(v).length > 20 ? String(v).slice(0, 20) + "…" : String(v);
      parts.push(`${f.label}: ${display}`);
    }
  }
  return parts.join(" · ");
}

/* ────────────────────────────────────────────
   Step Dots
   ──────────────────────────────────────────── */
function StepDots({ groups, filledGroups }: { groups: string[]; filledGroups: Set<string> }) {
  return (
    <div className="flex items-center gap-1">
      {groups.map((g, i) => {
        const isFilled = filledGroups.has(g);
        return (
          <div key={g} className="flex items-center gap-1">
            <motion.div
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                isFilled ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" : "bg-white/[0.08]"
              }`}
              animate={isFilled ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            />
            {i < groups.length - 1 && (
              <div className={`h-px w-3 transition-colors duration-300 ${isFilled ? "bg-emerald-400/30" : "bg-white/[0.06]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────
   Single Field Renderer
   ──────────────────────────────────────────── */
function FormField({
  field,
  value,
  onChange,
  disabled,
  index,
}: {
  field: FieldDef;
  value: FieldValue;
  onChange: (val: FieldValue) => void;
  disabled: boolean;
  index: number;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const filled = field.type === "toggle" ? true : String(value ?? "").trim().length > 0;
  const Icon = FIELD_ICONS[field.key] || Settings2;
  const helper = FIELD_HELPERS[field.key];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Label row */}
      <label className="flex items-center gap-2 mb-2">
        <div className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors duration-200 ${
          isFocused ? "bg-accent/[0.1] ring-1 ring-accent/20" : filled ? "bg-emerald-400/[0.08] ring-1 ring-emerald-400/15" : "bg-white/[0.04] ring-1 ring-white/[0.06]"
        }`}>
          {filled && !isFocused ? (
            <Check className="h-2.5 w-2.5 text-emerald-400" />
          ) : (
            <Icon className={`h-2.5 w-2.5 transition-colors duration-200 ${isFocused ? "text-accent/70" : "text-white/20"}`} />
          )}
        </div>
        <span className={`text-[12px] font-medium transition-colors duration-200 ${isFocused ? "text-white/70" : "text-white/45"}`}>
          {field.label}
        </span>
      </label>

      {/* Input */}
      {(field.type === "text" || field.type === "number") && (
        <div className="relative">
          <input
            type={field.type}
            value={String(value ?? "")}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={`w-full rounded-xl border px-4 py-3 text-[13px] text-white bg-white/[0.015] outline-none transition-all duration-200 placeholder:text-white/15 disabled:opacity-50 ${
              isFocused
                ? "border-accent/30 shadow-[0_0_0_3px_rgba(59,130,246,0.1)] bg-white/[0.025]"
                : filled
                ? "border-emerald-500/15 bg-white/[0.02]"
                : "border-white/[0.06] hover:border-white/[0.1]"
            }`}
          />
          {/* Filled checkmark at right edge */}
          <AnimatePresence>
            {filled && !isFocused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/50" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Select */}
      {field.type === "select" && (
        <div className="relative">
          <select
            value={String(value ?? "")}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`w-full appearance-none rounded-xl border px-4 py-3 text-[13px] text-white bg-white/[0.015] outline-none transition-all duration-200 disabled:opacity-50 cursor-pointer ${
              isFocused
                ? "border-accent/30 shadow-[0_0_0_3px_rgba(59,130,246,0.1)] bg-white/[0.025]"
                : filled
                ? "border-emerald-500/15 bg-white/[0.02]"
                : "border-white/[0.06] hover:border-white/[0.1]"
            }`}
          >
            <option value="" disabled hidden className="bg-[#111] text-white/50">Select…</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#111] text-white">{opt.label}</option>
            ))}
          </select>
          <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none transition-colors duration-200 ${
            isFocused ? "text-accent/50" : "text-white/15"
          }`} />
        </div>
      )}

      {/* Toggle */}
      {field.type === "toggle" && (
        <div className="flex items-center gap-3 py-1">
          <button
            type="button"
            onClick={() => onChange(!Boolean(value))}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 disabled:opacity-50 ${
              Boolean(value) ? "bg-accent shadow-[0_0_10px_rgba(59,130,246,0.2)]" : "bg-white/[0.08] hover:bg-white/[0.12]"
            }`}
          >
            <motion.span
              className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
              animate={{ x: Boolean(value) ? 22 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-[12px] font-medium transition-colors duration-200 ${Boolean(value) ? "text-accent/80" : "text-white/25"}`}>
            {Boolean(value) ? "Enabled" : "Disabled"}
          </span>
        </div>
      )}

      {/* Helper text */}
      {helper && (
        <p className={`mt-1.5 text-[10px] leading-relaxed transition-colors duration-200 ${isFocused ? "text-white/25" : "text-white/12"}`}>
          {helper}
        </p>
      )}
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Main FormCard
   ──────────────────────────────────────────── */
export function FormCard({ title, description, fields, onSubmit, summaryText }: FormCardProps) {
  const [values, setValues] = useState<Record<string, FieldValue>>(() => {
    const initial: Record<string, FieldValue> = {};
    fields.forEach((f) => {
      if (f.defaultValue !== undefined) initial[f.key] = f.defaultValue;
      else if (f.type === "toggle") initial[f.key] = false;
      else initial[f.key] = "";
    });
    return initial;
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle") return;
    setStatus("submitting");
    await new Promise((r) => setTimeout(r, 700));
    setStatus("submitted");
    onSubmit(values);
  };

  const update = (key: string, val: FieldValue) => setValues((p) => ({ ...p, [key]: val }));

  // Field fill tracking
  const filledCount = fields.filter((f) => {
    if (f.type === "toggle") return true;
    return String(values[f.key] ?? "").trim().length > 0;
  }).length;

  const allFilled = filledCount === fields.length;
  const progress = (filledCount / fields.length) * 100;

  // Group tracking for step dots
  const usedGroups: string[] = [];
  const filledGroups = new Set<string>();
  for (const f of fields) {
    const g = getFieldGroup(f.key);
    if (g && !usedGroups.includes(g)) usedGroups.push(g);
    const filled = f.type === "toggle" ? true : String(values[f.key] ?? "").trim().length > 0;
    if (filled && g) filledGroups.add(g);
  }

  // Submitted state
  if (status === "submitted") {
    return <SubmittedCard values={values} fields={fields} summaryText={summaryText} />;
  }

  // Build grouped field layout
  let lastGroup = "";
  let fieldIndex = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-4"
    >
      <div className="liquid-glass rounded-xl border border-white/[0.08] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-shadow duration-300 hover:shadow-[0_10px_36px_rgba(0,0,0,0.45)]">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.04]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/[0.08] ring-1 ring-accent/[0.12]">
                <Settings2 className="h-4 w-4 text-accent/70" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-white/90">{title || "Setup Configuration"}</h3>
                <p className="text-[11px] text-accent/40 mt-0.5">I need a few details to continue</p>
              </div>
            </div>

            {/* Step dots */}
            {usedGroups.length > 1 && (
              <div className="flex items-center gap-2 pt-1">
                <StepDots groups={usedGroups} filledGroups={filledGroups} />
              </div>
            )}
          </div>

          {description && (
            <p className="text-[12px] text-white/25 mt-3 leading-relaxed pl-11">{description}</p>
          )}
        </div>

        {/* ── Fields ── */}
        <form onSubmit={handleSubmit} className="px-5 py-5">
          <div className="space-y-5">
            {fields.map((field) => {
              const group = getFieldGroup(field.key);
              const showGroupLabel = group && group !== lastGroup;
              if (showGroupLabel) lastGroup = group;
              const currentIndex = fieldIndex++;

              return (
                <div key={field.key}>
                  {/* Group separator + label */}
                  {showGroupLabel && currentIndex > 0 && (
                    <div className="mb-4 mt-1">
                      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                    </div>
                  )}
                  {showGroupLabel && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: currentIndex * 0.08 }}
                      className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/15 mb-3"
                    >
                      {group}
                    </motion.p>
                  )}

                  <FormField
                    field={field}
                    value={values[field.key]}
                    onChange={(val) => update(field.key, val)}
                    disabled={status === "submitting"}
                    index={currentIndex}
                  />
                </div>
              );
            })}
          </div>

          {/* ── Footer ── */}
          <div className="mt-6 pt-4 border-t border-white/[0.04]">
            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: allFilled
                      ? "linear-gradient(90deg, rgba(52,211,153,0.6), rgba(52,211,153,0.9))"
                      : "linear-gradient(90deg, rgba(59,130,246,0.4), rgba(59,130,246,0.8))",
                  }}
                  animate={{ width: `${Math.max(progress, 3)}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
                {/* Glow at edge */}
                {progress > 5 && (
                  <motion.div
                    className="absolute top-0 h-full w-4 rounded-full"
                    style={{
                      background: allFilled
                        ? "radial-gradient(circle, rgba(52,211,153,0.5) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)",
                      right: `${100 - progress}%`,
                    }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <span className="text-[10px] text-white/20 tabular-nums font-medium shrink-0">
                {filledCount}/{fields.length}
              </span>
            </div>

            {/* Submit button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-[9px] font-mono text-white/15">⇧⏎</kbd>
                <span className="text-[10px] text-white/12">Submit</span>
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed ${
                  allFilled
                    ? "bg-accent text-white shadow-[0_4px_20px_rgba(59,130,246,0.4),0_0_0_1px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.5)] hover:brightness-110"
                    : "bg-accent/80 text-white/90 shadow-[0_2px_10px_rgba(59,130,246,0.2)] hover:bg-accent hover:shadow-[0_4px_16px_rgba(59,130,246,0.3)]"
                } ${status === "submitting" ? "opacity-60" : ""}`}
              >
                <AnimatePresence mode="wait">
                  {status === "submitting" ? (
                    <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Building…
                    </motion.div>
                  ) : allFilled ? (
                    <motion.div key="build" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      Build Automation <Zap className="h-3.5 w-3.5" />
                    </motion.div>
                  ) : (
                    <motion.div key="continue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                      Continue <ArrowRight className="h-3.5 w-3.5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
