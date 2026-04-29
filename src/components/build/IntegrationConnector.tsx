"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { AutomationIntegration } from "@/types/automation";

interface IntegrationConnectorProps {
  integrations: AutomationIntegration[];
  estimatedCost: number;
  onActivate: () => void;
  onDismiss: () => void;
}

export function IntegrationConnector({
  integrations: initialIntegrations,
  estimatedCost,
  onActivate,
  onDismiss,
}: IntegrationConnectorProps) {
  const [integrations, setIntegrations] = useState(initialIntegrations);

  const handleConnect = (id: string) => {
    /* debug removed */
    // Simulate connection after a brief delay
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) => (i.id === id ? { ...i, connected: true } : i))
      );
    }, 1000);
  };

  const allConnected = integrations.every((i) => i.connected);

  return (
    <div className="relative mt-4 w-full max-w-[85%] rounded-xl border-l-4 border-sky-500 bg-white dark:bg-gray-900 shadow-sm border-t border-r border-b border-gray-200 dark:border-gray-800 animate-slide-up-fade">
      <button
        onClick={onDismiss}
        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-5">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Connect your apps to continue
        </h4>

        <div className="space-y-3 mb-5">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white dark:bg-gray-800 shadow-sm text-lg">
                  {integration.icon}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {integration.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {integration.connected ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        <span className="text-xs text-gray-500">Not connected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!integration.connected ? (
                <button
                  onClick={() => handleConnect(integration.id)}
                  className="rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Connect
                </button>
              ) : (
                <div className="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Ready
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-md">
            ~{estimatedCost} credits per run
          </div>
          <button
            onClick={onActivate}
            disabled={!allConnected}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Activate Automation
          </button>
        </div>
      </div>
    </div>
  );
}
