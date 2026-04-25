"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Settings2 } from "lucide-react";

type EngineAnalysisCardProps = {
  trigger: string;
  action: string;
  setupFields: string[];
  timestamp?: number;
};

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
    }, 16);
    return () => clearInterval(timer);
  }, [started, text, skip]);

  return <>{displayed}</>;
}

export function EngineAnalysisCard({ trigger, action, setupFields, timestamp }: EngineAnalysisCardProps) {
  const isNew = Date.now() - (timestamp || 0) < 3000;

  const items = [
    { id: "trigger", label: "Trigger", value: trigger, icon: Zap, color: "text-amber-400", bg: "bg-amber-400/8", delay: 0 },
    { id: "action", label: "Action", value: action, icon: ArrowRight, color: "text-violet-400", bg: "bg-violet-400/8", delay: isNew ? 400 : 0 },
    { id: "setup", label: "Setup", value: setupFields.join(" · "), icon: Settings2, color: "text-accent", bg: "bg-accent/8", delay: isNew ? 800 : 0 },
  ];

  return (
    <div className="mb-3">
      <p className="text-[11px] font-medium text-white/25 mb-2">I analyzed your request and identified:</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <AnalysisRow key={item.id} item={item} isNew={isNew} />
        ))}
      </div>
    </div>
  );
}

function AnalysisRow({ item, isNew }: { item: { id: string; label: string; value: string; icon: React.ElementType; color: string; bg: string; delay: number }; isNew: boolean }) {
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
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5"
        >
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${item.bg}`}>
            <Icon className={`h-3 w-3 ${item.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/20 mr-2">{item.label}</span>
            <span className="text-[13px] text-white/70">
              <TypewriterText text={item.value} delay={item.delay + 100} skip={!isNew} />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
