"use client";

import React, { useState } from "react";
import { Plus, Zap, MoreHorizontal, PanelLeftClose, PanelLeft, Menu, X, Pencil, Copy, Trash2 } from "lucide-react";
import { AutomationSession } from "@/types/automation";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */
interface AutomationSidebarProps {
  sessions: AutomationSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface SidebarContentProps {
  sessions: AutomationSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onToggle: () => void;
  onCloseMobile?: () => void;
}

/* ────────────────────────────────────────────
   Session Row — a single automation entry
   ──────────────────────────────────────────── */
function SessionRow({
  session,
  isActive,
  onSelect,
}: {
  session: AutomationSession;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <li className="relative">
      <button
        onClick={onSelect}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
          isActive
            ? "bg-[var(--build-accent-soft)] text-[var(--build-accent)] font-medium border-l-2 border-[var(--build-accent)] ml-0"
            : "text-[var(--build-text-secondary)] hover:bg-white/[0.04] hover:text-[var(--build-text-primary)] hover:translate-x-[2px]"
        }`}
      >
        <Zap className={`h-3.5 w-3.5 shrink-0 transition-colors ${isActive ? "text-[var(--build-accent)]" : "text-[var(--build-text-tertiary)] group-hover:text-[var(--build-text-secondary)]"}`} />
        <span className="truncate flex-1 text-left">{session.title.length > 28 ? session.title.slice(0, 28) + "…" : session.title}</span>

        {/* Hover-revealed menu trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--build-text-tertiary)] hover:text-[var(--build-text-primary)] hover:bg-white/[0.06] transition-all"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
          <div className="absolute right-2 top-full z-40 mt-1 w-36 rounded-lg border border-[var(--build-border)] bg-[var(--build-surface-raised)] p-1 shadow-xl animate-fade-slide-down">
            {[
              { icon: Pencil, label: "Rename" },
              { icon: Copy, label: "Duplicate" },
              { icon: Trash2, label: "Delete", destructive: true },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setShowMenu(false)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  item.destructive
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-[var(--build-text-secondary)] hover:bg-white/[0.04] hover:text-[var(--build-text-primary)]"
                }`}
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </li>
  );
}

/* ────────────────────────────────────────────
   Sidebar Content — extracted as proper component
   ──────────────────────────────────────────── */
const SidebarInner = React.memo(function SidebarInner({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onToggle,
  onCloseMobile,
}: SidebarContentProps) {
  // Group sessions
  const now = Date.now();
  const today = sessions.filter((s) => now - s.createdAt < 86400000);
  const yesterday = sessions.filter((s) => now - s.createdAt >= 86400000 && now - s.createdAt < 172800000);
  const older = sessions.filter((s) => now - s.createdAt >= 172800000);

  const handleSelect = (id: string) => {
    onSelectSession(id);
    onCloseMobile?.();
  };

  const renderGroup = (label: string, groupSessions: AutomationSession[]) => {
    if (groupSessions.length === 0) return null;
    return (
      <div className="mb-5">
        <h3 className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--build-text-tertiary)] mb-1.5">
          {label}
        </h3>
        <ul className="space-y-0.5">
          {groupSessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isActive={activeSessionId === session.id}
              onSelect={() => handleSelect(session.id)}
            />
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col w-[260px] shrink-0 bg-[var(--build-bg)] border-r border-[var(--build-border)]">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5 font-semibold text-[var(--build-text-primary)] text-[14px] tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/20">
            <Zap className="h-3.5 w-3.5" />
          </div>
          AutomateCraft
        </div>
        <button onClick={onToggle} className="hidden md:flex p-1.5 rounded-md text-[var(--build-text-tertiary)] hover:text-[var(--build-text-secondary)] hover:bg-white/[0.04] transition-all">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Divider line with subtle gradient */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[var(--build-border)] to-transparent" />

      {/* New Automation Button */}
      <div className="p-3">
        <button
          onClick={() => { onNewSession(); onCloseMobile?.(); }}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--build-accent)] px-4 py-2.5 text-[13px] font-medium text-white transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_20px_var(--build-accent-glow)] active:scale-[0.97]"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
          New Automation
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 build-scrollbar">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-12 text-center px-4">
            <div className="h-10 w-10 rounded-full bg-white/[0.03] flex items-center justify-center mb-3">
              <Zap className="h-5 w-5 text-[var(--build-text-tertiary)]" />
            </div>
            <p className="text-[12px] text-[var(--build-text-tertiary)] leading-relaxed">
              No automations yet.
              <br />Start by describing a workflow.
            </p>
          </div>
        ) : (
          <>
            {renderGroup("Today", today)}
            {renderGroup("Yesterday", yesterday)}
            {renderGroup("Older", older)}
          </>
        )}
      </div>

      {/* Bottom: keyboard shortcut hint */}
      <div className="px-4 py-3 border-t border-[var(--build-border)]">
        <div className="flex items-center gap-2 text-[10px] text-[var(--build-text-tertiary)]">
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-[var(--build-border)] font-mono text-[9px]">Ctrl</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-[var(--build-border)] font-mono text-[9px]">N</kbd>
          <span>New automation</span>
        </div>
      </div>
    </div>
  );
});

/* ────────────────────────────────────────────
   Main Sidebar Component
   ──────────────────────────────────────────── */
export function AutomationSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  isOpen,
  onToggle,
}: AutomationSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Trigger */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-3 left-4 z-40 p-2 rounded-lg bg-[var(--build-surface)] border border-[var(--build-border)] shadow-lg"
      >
        <Menu className="h-5 w-5 text-[var(--build-text-secondary)]" />
      </button>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <div className="relative z-10 animate-slide-in-left">
            <SidebarInner
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={onSelectSession}
              onNewSession={onNewSession}
              onToggle={onToggle}
              onCloseMobile={() => setIsMobileOpen(false)}
            />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-3 right-[-44px] p-2 bg-[var(--build-surface)] rounded-lg text-[var(--build-text-secondary)] border border-[var(--build-border)] shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className={`hidden md:block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${isOpen ? "w-[260px]" : "w-0"}`}>
        <SidebarInner
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={onSelectSession}
          onNewSession={onNewSession}
          onToggle={onToggle}
        />
      </div>

      {/* Collapsed Toggle */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="hidden md:flex fixed top-4 left-4 z-40 p-2 rounded-lg bg-[var(--build-surface)] border border-[var(--build-border)] shadow-lg text-[var(--build-text-secondary)] hover:text-[var(--build-text-primary)] hover:bg-[var(--build-surface-raised)] transition-all"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
