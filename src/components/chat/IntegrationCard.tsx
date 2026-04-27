"use client";

import React, { useState, useEffect } from "react";
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
  BrainCircuit,
  ArrowUpRight,
  Hash,
  FileSpreadsheet,
  Table2,
  GitMerge,
  Database,
  Mail,
  Filter,
  Reply,
  AtSign,
  LayoutTemplate,
} from "lucide-react";

/* ══════════════════════════════════════════
   Types
   ══════════════════════════════════════════ */
export type FieldValue = string | number | boolean;

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "toggle";
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: FieldValue;
};

export type IntegrationCardProps = {
  trigger: string;
  action: string;
  fields: FieldDef[];
  onSubmit: (values: Record<string, FieldValue>) => void;
  timestamp?: number;
  summaryText?: (values: Record<string, FieldValue>) => string;
};

/* ── Helpers ── */
const FIELD_HELPERS: Record<string, string> = {
  // Generic messaging
  phone:          "Include country code (e.g., +1) for WhatsApp delivery",
  target:         "Email or phone number where notifications will be sent",
  message:        "Supports variables like {{name}} from your form data",
  priority:       "High priority sends immediately; Standard queues with rate-limiting",
  enableLogging:  "Records each execution with timestamp for audit compliance",
  // Sheets
  sheetId:        "Paste the full URL or just the Spreadsheet ID from the address bar",
  worksheet:      "Exact name of the tab to monitor (case-sensitive)",
  mapping:        "Auto-detect maps columns by header name; Manual lets you define rules",
  crmPipeline:    "The pipeline or board where new records will be created",
  // Messaging platforms
  channel:        "Use #channel-name for Slack, or +country-code for WhatsApp",
  template:       "Use {{variable}} syntax to inject live data from the trigger",
  mentions:       "Comma-separated @handles or user groups to notify on each run",
  // Email
  mailbox:        "The inbox address this automation will monitor for new mail",
  filter:         "Only matching emails will trigger the automation",
  autoReply:      "Sent immediately when a matching email is received",
};

const FIELD_ICONS: Record<string, React.ElementType> = {
  // Generic messaging
  phone:          Phone,
  target:         AtSign,
  message:        MessageSquare,
  priority:       Gauge,
  enableLogging:  ShieldCheck,
  // Sheets
  sheetId:        FileSpreadsheet,
  worksheet:      Table2,
  mapping:        GitMerge,
  crmPipeline:    Database,
  // Messaging platforms
  channel:        Hash,
  template:       LayoutTemplate,
  mentions:       AtSign,
  // Email
  mailbox:        Mail,
  filter:         Filter,
  autoReply:      Reply,
};

/* ══════════════════════════════════════════
   Typewriter Effect
   ══════════════════════════════════════════ */
function TypewriterText({ text, delay = 0, skip = false }: { text: string; delay?: number; skip?: boolean }) {
  const [displayed, setDisplayed] = useState(skip ? text : "");
  const [started, setStarted] = useState(skip);

  useEffect(() => {
    if (skip) { setDisplayed(text); return; }
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay, skip, text]);

  useEffect(() => {
    if (!started || skip) return;
    let i = 0;
    const timer = setInterval(() => {
      i += 2;
      if (i > text.length) i = text.length;
      setDisplayed(text.slice(0, i));
      if (i === text.length) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [started, text, skip]);

  return <>{displayed}</>;
}

/* ══════════════════════════════════════════
   Analysis Row (Trigger / Action)
   ══════════════════════════════════════════ */
type AnalysisItem = {
  id: string;
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  ringColor: string;
  delay: number;
};

function AnalysisRow({ item, isNew }: { item: AnalysisItem; isNew: boolean }) {
  const [visible, setVisible] = useState(!isNew);
  const Icon = item.icon;

  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(() => setVisible(true), item.delay);
    return () => clearTimeout(t);
  }, [isNew, item.delay]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -8, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3.5 py-2.5 transition-all duration-200 hover:bg-white/[0.025] hover:border-white/[0.07]"
        >
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${item.bg} ring-1 ${item.ringColor}`}>
            <Icon className={`h-3 w-3 ${item.color}`} />
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className={`text-[9px] font-bold uppercase tracking-[0.14em] ${item.color} opacity-70 shrink-0`}>{item.label}</span>
            <span className="text-[13px] text-white/70 font-medium truncate">
              <TypewriterText text={item.value} delay={item.delay + 100} skip={!isNew} />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════
   Custom Select Dropdown
   ══════════════════════════════════════════ */
function CustomSelect({
  options, value, onChange, disabled, isFocused, setIsFocused, filled
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: FieldValue) => void;
  disabled: boolean;
  isFocused: boolean;
  setIsFocused: (v: boolean) => void;
  filled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsFocused]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(o => !o); setIsFocused(true); }}
        className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-[13px] text-left transition-all duration-200 disabled:opacity-50 cursor-pointer ${
          open
            ? "border-accent/25 shadow-[0_0_0_2px_rgba(59,130,246,0.08)] bg-white/[0.025] text-white"
            : filled
            ? "border-emerald-500/12 bg-white/[0.015] text-white"
            : "border-white/[0.05] hover:border-white/[0.08] bg-white/[0.015] text-white/40"
        }`}
      >
        <span>{selected?.label ?? "Select…"}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown className={`h-3.5 w-3.5 ${open ? "text-accent/50" : "text-white/20"}`} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/[0.07] bg-[#0d1117] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); setIsFocused(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] text-left transition-colors duration-100 hover:bg-white/[0.04] ${
                  opt.value === value ? "text-accent/90 bg-accent/[0.04]" : "text-white/65"
                }`}
              >
                {opt.label}
                {opt.value === value && <Check className="h-3 w-3 text-accent/60" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════
   Single Form Field
   ══════════════════════════════════════════ */
function IntegrationField({
  field,
  value,
  onChange,
  disabled,
  animDelay,
}: {
  field: FieldDef;
  value: FieldValue;
  onChange: (val: FieldValue) => void;
  disabled: boolean;
  animDelay: number;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const filled = field.type === "toggle" ? true : String(value ?? "").trim().length > 0;
  const Icon = FIELD_ICONS[field.key] || Settings2;
  const helper = FIELD_HELPERS[field.key];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animDelay, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Label */}
      <label className="flex items-center gap-2 mb-1.5">
        <div className={`flex h-[18px] w-[18px] items-center justify-center rounded transition-colors duration-200 ${
          isFocused ? "bg-accent/[0.12]" : filled ? "bg-emerald-400/[0.1]" : "bg-white/[0.04]"
        }`}>
          {filled && !isFocused ? (
            <Check className="h-2.5 w-2.5 text-emerald-400/70" />
          ) : (
            <Icon className={`h-2.5 w-2.5 transition-colors duration-150 ${isFocused ? "text-accent/60" : "text-white/20"}`} />
          )}
        </div>
        <span className={`text-[12px] font-medium transition-colors duration-150 ${isFocused ? "text-white/70" : "text-white/40"}`}>
          {field.label}
        </span>
      </label>

      {/* Text / Number Input */}
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
            className={`w-full rounded-lg border px-3.5 py-2.5 text-[13px] text-white bg-white/[0.015] outline-none transition-all duration-200 placeholder:text-white/12 disabled:opacity-50 ${
              isFocused
                ? "border-accent/25 shadow-[0_0_0_2px_rgba(59,130,246,0.08)] bg-white/[0.025]"
                : filled
                ? "border-emerald-500/12"
                : "border-white/[0.05] hover:border-white/[0.08]"
            }`}
          />
          <AnimatePresence>
            {filled && !isFocused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/40" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Custom Select Dropdown */}
      {field.type === "select" && (
        <CustomSelect
          options={field.options ?? []}
          value={String(value ?? "")}
          onChange={onChange}
          disabled={disabled}
          isFocused={isFocused}
          setIsFocused={setIsFocused}
          filled={filled}
        />
      )}

      {/* Toggle */}
      {field.type === "toggle" && (
        <div className="flex items-center gap-3 py-0.5">
          <button
            type="button"
            onClick={() => onChange(!Boolean(value))}
            disabled={disabled}
            className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 disabled:opacity-50 ${
              Boolean(value) ? "bg-accent shadow-[0_0_8px_rgba(59,130,246,0.15)]" : "bg-white/[0.07] hover:bg-white/[0.1]"
            }`}
          >
            <motion.span
              className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm"
              animate={{ x: Boolean(value) ? 20 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-[12px] font-medium transition-colors duration-200 ${Boolean(value) ? "text-accent/70" : "text-white/20"}`}>
            {Boolean(value) ? "Enabled" : "Disabled"}
          </span>
        </div>
      )}

      {/* Helper */}
      {helper && (
        <p className={`mt-1.5 text-[10px] leading-relaxed transition-colors duration-150 ${isFocused ? "text-white/20" : "text-white/10"}`}>
          {helper}
        </p>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   Submitted State
   ══════════════════════════════════════════ */
export function IntegrationCardSubmitted({
  trigger,
  action,
  values,
  fields,
}: {
  trigger: string;
  action: string;
  values?: Record<string, FieldValue>;
  fields?: FieldDef[];
}) {
  const summary = values && fields ? buildSummary(values, fields) : "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-3"
    >
      <div className="rounded-xl border border-emerald-500/12 bg-emerald-500/[0.025] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.15)] opacity-75">
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="relative flex h-6 w-6 items-center justify-center rounded-md bg-emerald-400/[0.1] ring-1 ring-emerald-400/15">
              <Lock className="h-3 w-3 text-emerald-400" />
              <motion.div
                className="absolute inset-0 rounded-md border border-emerald-400/15"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-emerald-400/75">Configuration locked</p>
            </div>
          </div>
          <div className="pl-[34px] space-y-1">
            <p className="text-[11px] text-white/30 flex items-center gap-1.5">
              <Zap className="h-2.5 w-2.5 text-amber-400/50 shrink-0" />
              {trigger}
              <ArrowRight className="h-2 w-2 text-white/10" />
              {action}
            </p>
            {summary && (
              <p className="text-[10px] text-white/18 leading-relaxed">{summary}</p>
            )}
          </div>
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
      const display = String(v).length > 18 ? String(v).slice(0, 18) + "…" : String(v);
      parts.push(display);
    }
  }
  return parts.join(" · ");
}

/* ══════════════════════════════════════════
   Main IntegrationCard
   ══════════════════════════════════════════ */
export function IntegrationCard({ trigger, action, fields, onSubmit, timestamp, summaryText }: IntegrationCardProps) {
  const isNew = Date.now() - (timestamp || 0) < 4000;

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

  const update = (key: string, val: FieldValue) => setValues((p) => ({ ...p, [key]: val }));

  const filledCount = fields.filter((f) => {
    if (f.type === "toggle") return true;
    return String(values[f.key] ?? "").trim().length > 0;
  }).length;
  const allFilled = filledCount === fields.length;
  const progress = (filledCount / fields.length) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle") return;
    setStatus("submitting");
    await new Promise((r) => setTimeout(r, 700));
    setStatus("submitted");
    onSubmit(values);
  };

  // Analysis items — only Trigger and Action (Setup is now the form itself)
  const analysisItems: AnalysisItem[] = [
    {
      id: "trigger", label: "Trigger", value: trigger,
      icon: Zap, color: "text-amber-400", bg: "bg-amber-400/[0.08]",
      ringColor: "ring-amber-400/15", delay: isNew ? 200 : 0,
    },
    {
      id: "action", label: "Action", value: action,
      icon: ArrowUpRight, color: "text-violet-400", bg: "bg-violet-400/[0.08]",
      ringColor: "ring-violet-400/15", delay: isNew ? 500 : 0,
    },
  ];

  // Base delay for form fields (after analysis animation completes)
  const formBaseDelay = isNew ? 0.9 : 0;

  if (status === "submitted") {
    return (
      <IntegrationCardSubmitted
        trigger={trigger}
        action={action}
        values={values}
        fields={fields}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mb-4"
    >
      <div className="liquid-glass rounded-xl border border-white/[0.07] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.35)]">

        {/* ═══ SECTION 1: Analysis ═══ */}
        <div className="px-5 pt-5 pb-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: isNew ? 0.1 : 0, duration: 0.2 }}
            className="flex items-center gap-2.5 mb-3.5"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/[0.08] ring-1 ring-accent/[0.12]">
              <BrainCircuit className="h-3.5 w-3.5 text-accent/70" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white/85">Analysis complete</p>
              <p className="text-[10px] text-white/25 mt-0.5">I mapped out your automation flow</p>
            </div>
          </motion.div>

          {/* Trigger + Action rows */}
          <div className="space-y-1.5">
            {analysisItems.map((item) => (
              <AnalysisRow key={item.id} item={item} isNew={isNew} />
            ))}
          </div>
        </div>

        {/* ═══ DIVIDER ═══ */}
        <div className="mx-5">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        {/* ═══ SECTION 2: Form Fields ═══ */}
        <form onSubmit={handleSubmit} className="px-5 pt-4 pb-5">
          {/* Form header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: formBaseDelay, duration: 0.2 }}
            className="flex items-center gap-2.5 mb-4"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06]">
              <Settings2 className="h-3.5 w-3.5 text-white/30" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-white/50">I need a few details to connect your services</p>
            </div>
          </motion.div>

          {/* Fields */}
          <div className="space-y-4">
            {fields.map((field, i) => (
              <IntegrationField
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(val) => update(field.key, val)}
                disabled={status === "submitting"}
                animDelay={formBaseDelay + 0.1 + i * 0.08}
              />
            ))}
          </div>

          {/* ═══ DIVIDER ═══ */}
          <div className="mt-5 mb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          </div>

          {/* ═══ FOOTER ═══ */}
          <div className="flex items-center justify-between">
            {/* Progress */}
            <div className="flex items-center gap-2.5 flex-1 mr-4">
              <div className="relative flex-1 h-1.5 rounded-full bg-white/[0.03] overflow-hidden max-w-[120px]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: allFilled
                      ? "linear-gradient(90deg, rgba(52,211,153,0.5), rgba(52,211,153,0.85))"
                      : "linear-gradient(90deg, rgba(59,130,246,0.35), rgba(59,130,246,0.75))",
                  }}
                  animate={{ width: `${Math.max(progress, 4)}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              <span className="text-[10px] text-white/18 tabular-nums font-medium">{filledCount}/{fields.length}</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "submitting"}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed ${
                allFilled
                  ? "bg-accent text-white shadow-[0_4px_16px_rgba(59,130,246,0.35),0_0_0_1px_rgba(59,130,246,0.2)] hover:shadow-[0_6px_24px_rgba(59,130,246,0.45)] hover:brightness-110"
                  : "bg-accent/70 text-white/90 shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:bg-accent/85"
              } ${status === "submitting" ? "opacity-50" : ""}`}
            >
              <AnimatePresence mode="wait">
                {status === "submitting" ? (
                  <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building…
                  </motion.div>
                ) : allFilled ? (
                  <motion.div key="build" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                    Build Automation <Zap className="h-3 w-3" />
                  </motion.div>
                ) : (
                  <motion.div key="continue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                    Continue <ArrowRight className="h-3 w-3" />
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
