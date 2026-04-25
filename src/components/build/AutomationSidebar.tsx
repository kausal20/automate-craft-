"use client";

import { useState, useEffect } from "react";
import { Plus, Zap, MoreHorizontal, PanelLeftClose, PanelLeft, Menu, X } from "lucide-react";
import { AutomationSession } from "@/types/automation";

interface AutomationSidebarProps {
  sessions: AutomationSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function AutomationSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  isOpen,
  onToggle,
}: AutomationSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Grouping logic (simplified for mockup)
  const today = sessions.filter((s) => Date.now() - s.createdAt < 86400000);
  const older = sessions.filter((s) => Date.now() - s.createdAt >= 86400000);

  const renderGroup = (label: string, groupSessions: AutomationSession[]) => {
    if (groupSessions.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
          {label}
        </h3>
        <ul className="space-y-0.5">
          {groupSessions.map((session) => (
            <li key={session.id}>
              <button
                onClick={() => {
                  onSelectSession(session.id);
                  setIsMobileOpen(false);
                }}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeSessionId === session.id
                    ? "bg-gray-200 dark:bg-gray-800 text-sky-600 dark:text-sky-400 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Zap className={`h-3.5 w-3.5 shrink-0 ${activeSessionId === session.id ? "text-sky-500" : "text-gray-400"}`} />
                  <span className="truncate max-w-[150px]">{session.title.slice(0, 28)}{session.title.length > 28 ? '...' : ''}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 w-[260px] shrink-0 transition-all duration-300">
      <div className="flex h-14 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500 text-white">
            <Zap className="h-3.5 w-3.5" />
          </div>
          AutomateCraft
        </div>
        <button onClick={onToggle} className="hidden md:flex p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={() => {
            onNewSession();
            setIsMobileOpen(false);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Automation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
        {renderGroup("Today", today)}
        {renderGroup("Older", older)}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-3 left-4 z-40 p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
          <div className="relative z-10 w-[260px] animate-slide-in-left">
            <SidebarContent />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-3 right-[-40px] p-2 bg-white dark:bg-gray-900 rounded-md text-gray-600 dark:text-gray-300 shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className={`hidden md:block transition-all duration-300 overflow-hidden ${isOpen ? 'w-[260px]' : 'w-0'}`}>
        <SidebarContent />
      </div>

      {/* Collapsed Toggle Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="hidden md:flex fixed top-4 left-4 z-40 p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
