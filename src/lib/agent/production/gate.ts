/**
 * Connect-once gate (pure).
 *
 * For every app the plan needs: zero usable saved accounts -> "missing";
 * exactly one -> use it; more than one -> the user must pick (we never choose
 * silently). A selection is only honoured if it points at one of THIS user's
 * usable accounts for that app.
 */

import { appLabel } from "../brain/catalogue";
import type { ConnectionNeed, ConnectionSelection, SavedAccount } from "./types";

/** Apps that need no saved account (no login involved). */
export const NO_AUTH_APPS = new Set(["webhook", "forms"]);

export type GateResult =
  | { ok: true; chosen: ConnectionSelection[] }
  | { ok: false; needs: ConnectionNeed[]; chosen: ConnectionSelection[] };

export function checkConnections(
  appsRequired: string[],
  accounts: SavedAccount[],
  selections: ConnectionSelection[],
): GateResult {
  const needs: ConnectionNeed[] = [];
  const chosen: ConnectionSelection[] = [];

  for (const app of appsRequired) {
    if (NO_AUTH_APPS.has(app)) continue;
    const usable = accounts.filter((a) => a.integration === app && a.usable);
    const label = appLabel(app);

    if (usable.length === 0) {
      needs.push({ integration: app, label, state: "missing", options: [] });
      continue;
    }
    if (usable.length === 1) {
      chosen.push({ integration: app, connectionId: usable[0].connectionId });
      continue;
    }
    const picked = selections.find((s) => s.integration === app);
    const valid = picked && usable.some((a) => a.connectionId === picked.connectionId);
    if (valid) {
      chosen.push({ integration: app, connectionId: picked!.connectionId });
    } else {
      needs.push({
        integration: app,
        label,
        state: "choose",
        options: usable.map((a) => ({ connectionId: a.connectionId, label: a.label })),
      });
    }
  }

  return needs.length === 0 ? { ok: true, chosen } : { ok: false, needs, chosen };
}
