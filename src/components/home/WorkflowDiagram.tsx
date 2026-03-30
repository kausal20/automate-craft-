"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Bot, Database, MessageSquareText, PencilLine } from "lucide-react";

const nodes = [
  { title: "Form", subtitle: "Capture", icon: PencilLine },
  { title: "AI Processing", subtitle: "Interpret", icon: Bot },
  { title: "WhatsApp", subtitle: "Notify", icon: MessageSquareText },
  { title: "CRM", subtitle: "Sync", icon: Database },
];

function AnimatedLine() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative hidden h-px min-w-12 flex-1 bg-[#E5E7EB] lg:block">
      <motion.div
        className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent"
        animate={shouldReduceMotion ? undefined : { x: ["0%", "100%"] }}
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: 3.6,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }
        }
      />
    </div>
  );
}

export default function WorkflowDiagram() {
  return (
    <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 sm:p-8">
      <div className="hidden items-center gap-6 lg:flex">
        {nodes.map((node, index) => {
          const Icon = node.icon;

          return (
            <div key={node.title} className="flex flex-1 items-center gap-6">
              <article className="min-w-0 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-foreground">{node.title}</h3>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-subtle">
                  {node.subtitle}
                </p>
              </article>
              {index < nodes.length - 1 ? <AnimatedLine /> : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 lg:hidden">
        {nodes.map((node) => {
          const Icon = node.icon;

          return (
            <article key={node.title} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{node.title}</h3>
                  <p className="text-xs uppercase tracking-[0.16em] text-subtle">
                    {node.subtitle}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
