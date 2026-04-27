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
    { id: "trigger", label: "Trigger", value: trigger, icon: Zap, color: "text-amber-400", bg: "bg-amber-400/[0.08]", glow: "shadow-[0_0_12px_rgba(245,158,11,0.08)]", borderHover: "hover:border-amber-400/20", delay: 0 },
    { id: "action", label: "Action", value: action, icon: ArrowRight, color: "text-violet-400", bg: "bg-violet-400/[0.08]", glow: "shadow-[0_0_12px_rgba(139,92,246,0.08)]", borderHover: "hover:border-violet-400/20", delay: isNew ? 400 : 0 },
    { id: "setup", label: "Setup", value: setupFields.join(" · "), icon: Settings2, color: "text-accent", bg: "bg-accent/[0.08]", glow: "shadow-[0_0_12px_rgba(59,130,246,0.08)]", borderHover: "hover:border-accent/20", delay: isNew ? 800 : 0 },
  ];

  return (
    <div className="mb-3">
      <p className="text-[11px] font-medium text-white/25 mb-2.5">I analyzed your request and identified:</p>
      <div className="space-y-2">
        {items.map((item) => (
          <AnalysisRow key={item.id} item={item} isNew={isNew} />
        ))}
      </div>
    </div>
  );
}

function AnalysisRow({ item, isNew }: { item: { id: string; label: string; value: string; icon: React.ElementType; color: string; bg: string; glow: string; borderHover: string; delay: number }; isNew: boolean }) {
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
          className={`liquid-glass flex items-center gap-3 rounded-xl border border-white/[0.06] px-3.5 py-3 transition-all duration-200 ${item.glow} ${item.borderHover} hover:scale-[1.01]`}
        >
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.bg} ring-1 ring-white/[0.04]`}>
            <Icon className={`h-3.5 w-3.5 ${item.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${item.color} opacity-60 mr-2`}>{item.label}</span>
            <span className="text-[13px] text-white/70 font-medium">
              <TypewriterText text={item.value} delay={item.delay + 100} skip={!isNew} />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
