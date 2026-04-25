"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

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
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle") return;
    setStatus("submitting");
    await new Promise((r) => setTimeout(r, 600));
    setStatus("submitted");
    onSubmit(values);
  };

  const update = (key: string, val: FieldValue) => setValues((p) => ({ ...p, [key]: val }));

  const filledCount = fields.filter((f) => {
    if (f.type === "toggle") return true;
    return String(values[f.key] ?? "").trim().length > 0;
  }).length;

  if (status === "submitted") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3 mb-3"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <span className="text-[13px] text-white/60">
          {summaryText ? summaryText(values) : "Configuration saved. Building your workflow…"}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full mb-4"
    >
      <div className="rounded-xl border border-white/[0.06] bg-[#0e0e10] overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <p className="text-[11px] font-medium text-accent/50 mb-1">I need a few details to continue</p>
          <h3 className="text-[15px] font-semibold text-white/90">{title || "Setup Configuration"}</h3>
          <p className="text-[12px] text-white/35 mt-1 leading-relaxed">{description}</p>
        </div>

        {/* Fields */}
        <form onSubmit={handleSubmit} className="px-5 pb-5">
          <div className="space-y-3.5">
            {fields.map((field) => {
              const isFocused = focusedKey === field.key;
              const filled = field.type === "toggle" ? true : String(values[field.key] ?? "").trim().length > 0;

              return (
                <div key={field.key}>
                  <label className="flex items-center gap-1.5 mb-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full transition-colors ${filled ? "bg-emerald-400" : "bg-white/10"}`} />
                    <span className="text-[12px] font-medium text-white/45">{field.label}</span>
                  </label>

                  {(field.type === "text" || field.type === "number") && (
                    <input
                      type={field.type}
                      value={String(values[field.key] ?? "")}
                      onFocus={() => setFocusedKey(field.key)}
                      onBlur={() => setFocusedKey(null)}
                      onChange={(e) => update(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={status === "submitting"}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-[13px] text-white bg-white/[0.02] outline-none transition-all placeholder:text-white/15 disabled:opacity-50 ${
                        isFocused
                          ? "border-accent/30 shadow-[0_0_0_2px_rgba(59,130,246,0.08)]"
                          : filled
                          ? "border-emerald-500/15"
                          : "border-white/[0.06] hover:border-white/[0.1]"
                      }`}
                    />
                  )}

                  {field.type === "select" && (
                    <div className="relative">
                      <select
                        value={String(values[field.key] ?? "")}
                        onFocus={() => setFocusedKey(field.key)}
                        onBlur={() => setFocusedKey(null)}
                        onChange={(e) => update(field.key, e.target.value)}
                        disabled={status === "submitting"}
                        className={`w-full appearance-none rounded-lg border px-3.5 py-2.5 text-[13px] text-white bg-white/[0.02] outline-none transition-all disabled:opacity-50 ${
                          isFocused
                            ? "border-accent/30 shadow-[0_0_0_2px_rgba(59,130,246,0.08)]"
                            : filled
                            ? "border-emerald-500/15"
                            : "border-white/[0.06] hover:border-white/[0.1]"
                        }`}
                      >
                        <option value="" disabled hidden className="bg-[#1a1a1a] text-white/50">Select…</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-white">{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20 pointer-events-none" />
                    </div>
                  )}

                  {field.type === "toggle" && (
                    <div className="flex items-center gap-2.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => update(field.key, !Boolean(values[field.key]))}
                        disabled={status === "submitting"}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
                          Boolean(values[field.key]) ? "bg-accent" : "bg-white/[0.08]"
                        }`}
                      >
                        <motion.span
                          className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm"
                          animate={{ x: Boolean(values[field.key]) ? 18 : 3 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                      <span className={`text-[12px] ${Boolean(values[field.key]) ? "text-accent/70" : "text-white/25"}`}>
                        {Boolean(values[field.key]) ? "On" : "Off"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {fields.map((_, i) => (
                <div key={i} className={`h-1 w-5 rounded-full transition-colors ${i < filledCount ? "bg-accent/50" : "bg-white/[0.05]"}`} />
              ))}
              <span className="ml-2 text-[10px] text-white/20">{filledCount}/{fields.length}</span>
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-accent/90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <AnimatePresence mode="wait">
                {status === "submitting" ? (
                  <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div key="go" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                    Continue <ArrowRight className="h-3.5 w-3.5" />
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
