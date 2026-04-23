"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Settings2, CheckCircle2 } from "lucide-react";

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

type EngineCard = {
  id: string;
  label: string;
  value: string;
  icon: React.ElementType;
  accentColor: string;
  borderColor: string;
  iconBg: string;
  delay: number;
};

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
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay, skip, text]);

  useEffect(() => {
    if (!started || skip) return;
    let index = 0;
    const speed = 18;
    const timer = setInterval(() => {
      index += 2;
      if (index > text.length) index = text.length;
      setDisplayed(text.slice(0, index));
      if (index === text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [started, text, skip]);

  return (
    <span>
      {displayed}
      {!skip && displayed.length < text.length && started && (
        <span className="inline-block w-[2px] h-[13px] ml-[1px] mb-[-2px] bg-current animate-pulse opacity-60" />
      )}
    </span>
  );
}

export function EngineAnalysisCard({
  trigger,
  action,
  setupFields,
  timestamp,
}: EngineAnalysisCardProps) {
  const reducedMotion = useReducedMotion();
  const isNew = Date.now() - (timestamp || 0) < 3000;
  const BASE_DELAY = isNew ? 0 : 0;

  const cards: EngineCard[] = [
    {
      id: "trigger",
      label: "Trigger detected",
      value: trigger,
      icon: Zap,
      accentColor: "text-amber-400",
      borderColor: "border-amber-400/20",
      iconBg: "bg-amber-400/[0.08]",
      delay: BASE_DELAY,
    },
    {
      id: "action",
      label: "Action detected",
      value: action,
      icon: ArrowRight,
      accentColor: "text-violet-400",
      borderColor: "border-violet-400/20",
      iconBg: "bg-violet-400/[0.08]",
      delay: BASE_DELAY + (isNew ? 600 : 0),
    },
    {
      id: "setup",
      label: "Setup required",
      value: setupFields.join(", "),
      icon: Settings2,
      accentColor: "text-accent",
      borderColor: "border-accent/20",
      iconBg: "bg-accent/[0.08]",
      delay: BASE_DELAY + (isNew ? 1200 : 0),
    },
  ];

  return (
    <div className="w-full mb-3" role="status" aria-label="Engine analysis results">
      {/* Phase label — inline, muted */}
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent/40 mb-2.5 ml-1">
        Phase 1 · Analysis
      </p>

      {/* Cards with connecting pipeline line */}
      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-[17px] top-4 bottom-4 w-px bg-gradient-to-b from-amber-400/20 via-violet-400/20 to-accent/20" />

        <div className="space-y-2.5">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              isNew={isNew}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardItem({ card, isNew, reducedMotion }: { card: EngineCard; isNew: boolean; reducedMotion: boolean }) {
  const skipAnimation = reducedMotion || !isNew;
  const [visible, setVisible] = useState(skipAnimation);

  useEffect(() => {
    if (skipAnimation) return;
    const timer = setTimeout(() => setVisible(true), card.delay);
    return () => clearTimeout(timer);
  }, [card.delay, skipAnimation]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className={`relative flex items-start gap-3.5 rounded-xl border ${card.borderColor} bg-gradient-to-br from-white/[0.03] to-white/[0.01] px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.03)] overflow-hidden`}
          >
            {/* Subtle shimmer on new cards — only if motion allowed */}
            {isNew && !reducedMotion && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent pointer-events-none"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1.2, ease: "easeInOut", delay: card.delay / 1000 + 0.3 }}
              />
            )}

            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${card.iconBg} ring-1 ring-white/[0.06]`}
            >
              <card.icon className={`h-3.5 w-3.5 ${card.accentColor}`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${card.accentColor} opacity-60 mb-1`}>
                {card.label}
              </p>
              <p className="text-[13px] font-medium text-white/80 leading-snug">
                <TypewriterText text={card.value} delay={card.delay + 100} skip={reducedMotion || !isNew} />
              </p>
            </div>

            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-white/10" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
