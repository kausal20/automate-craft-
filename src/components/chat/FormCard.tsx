"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, SlidersHorizontal } from "lucide-react";

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "phone" | "textarea" | "email";
  placeholder: string;
};

type FormCardProps = {
  fields: FieldDef[];
  onSubmit: (values: Record<string, string>) => void;
  isDisabled?: boolean;
};

export function FormCard({ fields, onSubmit, isDisabled }: FormCardProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (isDisabled) {
      return;
    }

    onSubmit(values);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-6 shadow-[0_12px_30px_rgba(28,28,28,0.06)]">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/[0.03] text-accent">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Required details
            </p>
            <p className="mt-1 text-sm leading-7 text-subtle">
              Fill in the inputs below so the workflow can be configured correctly.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                {field.label}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  rows={4}
                  disabled={isDisabled}
                  value={values[field.key] || ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="w-full resize-none rounded-[16px] border border-[#E5E7EB] bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                />
              ) : (
                <input
                  type={field.type === "phone" ? "tel" : field.type}
                  disabled={isDisabled}
                  value={values[field.key] || ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 py-3.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                />
              )}
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isDisabled}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-white transition-all hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
