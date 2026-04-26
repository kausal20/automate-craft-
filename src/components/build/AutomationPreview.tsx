"use client";

import { Maximize2, Zap, Play, Rocket, CheckCircle2 } from "lucide-react";
import { AutomationBlueprint } from "@/types/automation";

/* ────────────────────────────────────────────
   Props
   ──────────────────────────────────────────── */
interface AutomationPreviewProps {
  blueprint?: AutomationBlueprint;
  isGenerating: boolean;
}

/* ────────────────────────────────────────────
   SVG Node — rendered inside foreignObject
   ──────────────────────────────────────────── */
function SvgNode({
  x,
  y,
  label,
  type,
  delay = 0,
  isActive = false,
}: {
  x: number;
  y: number;
  label: string;
  type: "trigger" | "action" | "output";
  delay?: number;
  isActive?: boolean;
}) {
  const colors = {
    trigger: { dot: "#0ea5e9", accent: "sky", border: "rgba(14,165,233,0.2)" },
    action: { dot: "#8b5cf6", accent: "violet", border: "rgba(139,92,246,0.2)" },
    output: { dot: "#10b981", accent: "emerald", border: "rgba(16,185,129,0.2)" },
  };
  const c = colors[type];
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <foreignObject x={x} y={y} width="260" height="72" className="overflow-visible">
      <div
        className="h-full w-full rounded-xl border bg-[var(--build-surface-raised)] p-3.5 flex items-center gap-3 transition-all animate-scale-in"
        style={{
          animationDelay: `${delay}ms`,
          borderColor: isActive ? c.border : "var(--build-border)",
          boxShadow: isActive ? `0 0 20px ${c.border}` : "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {/* Type indicator dot */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`h-2.5 w-2.5 rounded-full ${isActive ? "animate-pulse" : ""}`}
            style={{ backgroundColor: c.dot }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-semibold uppercase tracking-[0.1em] block mb-0.5" style={{ color: c.dot, opacity: 0.7 }}>
            {typeLabel}
          </span>
          <p className="text-[12px] font-medium text-[var(--build-text-primary)] truncate leading-tight">
            {label}
          </p>
        </div>
      </div>
    </foreignObject>
  );
}

/* ────────────────────────────────────────────
   SVG Connector Path
   ──────────────────────────────────────────── */
function SvgConnector({ fromY, toY, isActive = false }: { fromY: number; toY: number; isActive?: boolean }) {
  const x = 130; // center of 260px node width
  const startY = fromY + 72; // bottom of source node
  const endY = toY; // top of target node
  const midY = startY + (endY - startY) / 2;

  const pathD = `M ${x},${startY} C ${x},${midY} ${x},${midY} ${x},${endY}`;

  return (
    <g>
      {/* Base path */}
      <path
        d={pathD}
        stroke="var(--build-border)"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="6 4"
        className="animate-[dashFlow_1.5s_linear_infinite]"
      />

      {/* Animated data packet */}
      {isActive && (
        <circle r="3" fill="var(--build-accent)" opacity="0.8">
          <animateMotion dur="1.8s" repeatCount="indefinite" path={pathD} />
        </circle>
      )}

      {/* Arrow tip */}
      <polygon
        points={`${x - 4},${endY - 6} ${x},${endY} ${x + 4},${endY - 6}`}
        fill="var(--build-border)"
      />
    </g>
  );
}

/* ────────────────────────────────────────────
   Empty State
   ──────────────────────────────────────────── */
function EmptyPreview() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="relative flex flex-col items-center justify-center text-center w-full h-64">
        {/* Ghost nodes */}
        <svg viewBox="0 0 260 260" className="w-full max-w-[220px] opacity-[0.04]">
          <rect x="30" y="10" width="200" height="50" rx="12" stroke="white" strokeWidth="1" fill="none" strokeDasharray="4 4" />
          <line x1="130" y1="60" x2="130" y2="100" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
          <rect x="30" y="100" width="200" height="50" rx="12" stroke="white" strokeWidth="1" fill="none" strokeDasharray="4 4" />
          <line x1="130" y1="150" x2="130" y2="190" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
          <rect x="30" y="190" width="200" height="50" rx="12" stroke="white" strokeWidth="1" fill="none" strokeDasharray="4 4" />
        </svg>

        {/* Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.03] mb-3">
            <Zap className="h-5 w-5 text-[var(--build-text-tertiary)]" />
          </div>
          <p className="text-[13px] font-medium text-[var(--build-text-tertiary)]">
            Your automation will appear here
          </p>
          <p className="text-[11px] text-[var(--build-text-tertiary)] opacity-60 mt-1">
            Describe a workflow to get started
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────── */
export function AutomationPreview({ blueprint, isGenerating }: AutomationPreviewProps) {
  const hasNodes = blueprint && (blueprint.trigger || blueprint.actions.length > 0);

  // Calculate positions
  const nodeHeight = 72;
  const gap = 48;
  const startX = 0;
  const nodes: { label: string; type: "trigger" | "action" | "output"; y: number }[] = [];

  if (blueprint?.trigger) {
    nodes.push({ label: blueprint.trigger, type: "trigger", y: 20 });
  }
  blueprint?.actions.forEach((action, idx) => {
    nodes.push({ label: action, type: "action", y: 20 + (idx + 1) * (nodeHeight + gap) });
  });

  const totalHeight = nodes.length > 0 ? nodes[nodes.length - 1].y + nodeHeight + 40 : 300;

  return (
    <div className="hidden lg:flex flex-col w-[420px] bg-[var(--build-bg)] border-l border-[var(--build-border)] shrink-0 h-full">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-6 border-b border-[var(--build-border)]">
        <h2 className="text-[13px] font-semibold text-[var(--build-text-primary)]">Automation Preview</h2>
        <button className="p-1.5 rounded-md text-[var(--build-text-tertiary)] hover:text-[var(--build-text-secondary)] hover:bg-white/[0.04] transition-all">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 relative overflow-y-auto p-6 build-scrollbar">
        {!hasNodes ? (
          <EmptyPreview />
        ) : (
          <div className="flex justify-center">
            <svg
              viewBox={`-10 0 280 ${totalHeight}`}
              width="280"
              height={totalHeight}
              className="overflow-visible"
            >
              {/* Connectors */}
              {nodes.map((node, idx) => {
                if (idx === 0) return null;
                return (
                  <SvgConnector
                    key={`conn-${idx}`}
                    fromY={nodes[idx - 1].y}
                    toY={node.y}
                    isActive={isGenerating}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node, idx) => (
                <SvgNode
                  key={`node-${idx}`}
                  x={startX}
                  y={node.y}
                  label={node.label}
                  type={node.type}
                  delay={idx * 150}
                  isActive={isGenerating && idx === nodes.length - 1}
                />
              ))}

              {/* Generating placeholder */}
              {isGenerating && nodes.length > 0 && (
                <g>
                  <SvgConnector fromY={nodes[nodes.length - 1].y} toY={nodes[nodes.length - 1].y + nodeHeight + gap} isActive />
                  <foreignObject x={startX} y={nodes[nodes.length - 1].y + nodeHeight + gap} width="260" height="72" className="overflow-visible">
                    <div className="h-full w-full rounded-xl border-2 border-dashed border-[var(--build-border)] flex items-center justify-center animate-pulse">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--build-accent)] animate-dot-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              )}
            </svg>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-[var(--build-border)]">
        <div className="flex gap-2.5">
          <button
            disabled={!blueprint || isGenerating}
            className="flex-1 flex justify-center items-center gap-2 rounded-lg border border-[var(--build-border)] bg-white/[0.02] px-4 py-2.5 text-[13px] font-medium text-[var(--build-text-secondary)] transition-all hover:bg-white/[0.04] hover:text-[var(--build-text-primary)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" />
            Test Run
          </button>
          <button
            disabled={!blueprint || isGenerating}
            className="flex-1 flex justify-center items-center gap-2 rounded-lg bg-[var(--build-accent)] px-4 py-2.5 text-[13px] font-medium text-white transition-all hover:brightness-110 hover:shadow-[0_0_16px_var(--build-accent-glow)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Rocket className="h-4 w-4" />
            Deploy
          </button>
        </div>
      </div>
    </div>
  );
}
