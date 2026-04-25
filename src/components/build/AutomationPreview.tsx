"use client";

import { Maximize2, Zap, Play, Rocket } from "lucide-react";
import { AutomationBlueprint } from "@/types/automation";

interface AutomationPreviewProps {
  blueprint?: AutomationBlueprint;
  isGenerating: boolean;
}

export function AutomationPreview({ blueprint, isGenerating }: AutomationPreviewProps) {
  const hasNodes = blueprint && (blueprint.trigger || blueprint.actions.length > 0);

  return (
    <div className="hidden lg:flex flex-col w-[420px] bg-gray-50 dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shrink-0 h-full">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Automation Preview</h2>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-y-auto p-8 custom-scrollbar">
        {!hasNodes ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center p-8 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 w-full h-64">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 mb-4">
                <Zap className="h-6 w-6 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Your automation will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Trigger Node */}
            {blueprint.trigger && (
              <div className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 animate-slide-up-fade">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-2 w-2 rounded-full bg-sky-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Trigger</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{blueprint.trigger}</p>
              </div>
            )}

            {/* Actions */}
            {blueprint.actions.map((action, idx) => (
              <div key={idx} className="flex flex-col items-center w-full max-w-[280px]">
                {/* SVG Connector */}
                <div className="h-12 w-px bg-gray-200 dark:bg-gray-800 relative">
                  <div className="absolute inset-0 bg-sky-500/50 animate-flow-down origin-top" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 border-r border-b border-gray-300 dark:border-gray-700 rotate-45" />
                </div>

                {/* Action Node */}
                <div 
                  className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 animate-slide-up-fade"
                  style={{ animationDelay: `${(idx + 1) * 150}ms` }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-2 w-2 rounded-full bg-violet-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Action</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{action}</p>
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex flex-col items-center w-full max-w-[280px] mt-2 opacity-50">
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 border-dashed border-l-2" />
                <div className="w-full bg-transparent rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-4 flex items-center justify-center h-16">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
        <div className="flex gap-3">
          <button 
            disabled={!blueprint || isGenerating}
            className="flex-1 flex justify-center items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" />
            Test Run
          </button>
          <button 
            disabled={!blueprint || isGenerating}
            className="flex-1 flex justify-center items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Rocket className="h-4 w-4" />
            Deploy
          </button>
        </div>
      </div>
    </div>
  );
}
