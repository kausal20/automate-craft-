"use client";

/**
 * Connected Apps: sign in ONCE per account; every app on it is covered.
 * Plus "Add your own connector" — paste a remote MCP server link.
 */

import { useEffect, useState } from "react";

type State = "connected" | "needs_reconnect" | "not_connected" | "no_sign_in_needed";

interface StoreCard {
  account: string;
  displayName: string;
  tagline: string;
  authKind: "oauth2" | "api_key" | "bot_token" | "no_auth";
  covers: Array<{ slug: string; name: string }>;
  state: State;
  accountLabel: string | null;
  credentialFields: string[];
}

interface CustomCard {
  id: string;
  displayName: string;
  url: string;
  state: "connected" | "needs_reconnect";
  message: string | null;
  approvedTools: number;
  totalTools: number;
}

interface InspectedTool {
  name: string;
  description: string;
  inputs: Array<{ name: string; required: boolean }>;
  supported: boolean;
  note: string | null;
}

const BADGE: Record<State, { text: string; cls: string }> = {
  connected: { text: "Connected", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  needs_reconnect: { text: "Needs reconnect", cls: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  not_connected: { text: "Not connected", cls: "bg-white/[0.04] text-white/50 border-white/10" },
  no_sign_in_needed: { text: "No sign-in needed", cls: "bg-white/[0.04] text-white/50 border-white/10" },
};

const FIELD_LABEL: Record<string, string> = {
  botToken: "Bot token", apiKey: "API key", apiToken: "API token", shopSubdomain: "Shop name (the part before .myshopify.com)",
  accessToken: "Access token", appSecretKey: "App secret", url: "Store web address", consumerKey: "Consumer key",
  consumerSecret: "Consumer secret", businessAccountId: "Business account ID", host: "SMTP server", port: "Port",
  user: "Username", password: "Password", secure: "Use SSL (true/false)", keyId: "Key ID", keySecret: "Key secret", secretKey: "Secret key",
};

export default function ConnectorStore() {
  const [store, setStore] = useState<StoreCard[]>([]);
  const [custom, setCustom] = useState<CustomCard[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyFor, setKeyFor] = useState<StoreCard | null>(null);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});

  // add-your-own
  const [url, setUrl] = useState("");
  const [authType, setAuthType] = useState<"none" | "bearer" | "header">("none");
  const [token, setToken] = useState("");
  const [headerName, setHeaderName] = useState("X-API-Key");
  const [inspected, setInspected] = useState<{ serverName: string; tools: InspectedTool[] } | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const auth = () =>
    authType === "bearer" ? { type: "bearer", token } : authType === "header" ? { type: "header", headerName, value: token } : { type: "none" };

  async function load(check = false) {
    try {
      const res = await fetch(`/api/connections/store${check ? "?check=1" : ""}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStore(json.store);
      setCustom(json.custom);
      setCount(json.storeAppCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load your apps.");
    }
  }
  useEffect(() => {
    void load(true);
  }, []);

  async function connect(card: StoreCard) {
    setError(null);
    if (card.authKind === "api_key" || card.authKind === "bot_token") {
      setKeyFor(card);
      setKeyValues({});
      return;
    }
    const res = await fetch(`/api/connections/${card.account}/connect`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (json.authorizationUrl) window.location.href = json.authorizationUrl;
    else setError(json.error ?? "This app can't be connected right now.");
  }

  async function saveKey() {
    if (!keyFor) return;
    const res = await fetch(`/api/connections/${keyFor.account}/connect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ credentialPayload: keyValues }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error ?? "That didn't work. Check the details.");
    setKeyFor(null);
    setKeyValues({});
    void load(true);
  }

  async function inspect() {
    setBusy(true);
    setError(null);
    setInspected(null);
    const res = await fetch("/api/connectors/mcp/inspect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, auth: auth() }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "We couldn't check that link.");
    setInspected(json);
    setApproved({});
  }

  async function saveCustom() {
    setBusy(true);
    const approvedTools = Object.entries(approved).filter(([, on]) => on).map(([n]) => n);
    const res = await fetch("/api/connectors/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, auth: auth(), approvedTools }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Nothing was saved.");
    setInspected(null);
    setUrl("");
    setToken("");
    void load();
  }

  async function customAction(id: string, action: "health" | "delete") {
    await fetch(action === "health" ? `/api/connectors/mcp/${id}/health` : `/api/connectors/mcp/${id}`, { method: action === "health" ? "POST" : "DELETE" });
    void load();
  }

  return (
    <section className="flex flex-col gap-5" aria-label="Connected apps">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Your apps — connect once</h2>
        {count !== null && <span className="text-[12px] text-white/40">{count} apps in the store</span>}
      </div>
      {error && <p role="alert" className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-[13px] text-amber-200">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {store.map((card) => (
          <div key={card.account} className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-medium text-white">{card.displayName}</h3>
                <p className="text-[12px] text-white/45">{card.tagline}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${BADGE[card.state].cls}`}>{BADGE[card.state].text}</span>
            </div>
            {card.covers.length > 1 && (
              <ul className="flex flex-wrap gap-1.5" aria-label={`Covered by ${card.displayName}`}>
                {card.covers.map((c) => (
                  <li key={c.slug} className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/70">{c.name}</li>
                ))}
              </ul>
            )}
            {card.accountLabel && card.state !== "not_connected" && <p className="text-[12px] text-white/40">{card.accountLabel}</p>}
            {card.state !== "no_sign_in_needed" && (
              <button onClick={() => void connect(card)} className="mt-auto h-9 rounded-lg border border-white/10 bg-white/[0.05] text-[13px] font-medium text-white hover:bg-white/[0.1]">
                {card.state === "connected" ? "Reconnect" : card.state === "needs_reconnect" ? "Reconnect (1 tap)" : "Connect"}
              </button>
            )}
          </div>
        ))}
      </div>

      {keyFor && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-[14px] font-medium text-white">Connect {keyFor.displayName}</h3>
          <p className="mb-3 text-[12px] text-white/45">Your keys are stored encrypted and never shown again.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {keyFor.credentialFields.map((f) => (
              <label key={f} className="flex flex-col gap-1 text-[12px] text-white/60">
                {FIELD_LABEL[f] ?? f}
                <input
                  type={/token|key|secret|password/i.test(f) ? "password" : "text"}
                  autoComplete="off"
                  value={keyValues[f] ?? ""}
                  onChange={(e) => setKeyValues({ ...keyValues, [f]: e.target.value })}
                  className="h-9 rounded-md border border-white/10 bg-black/40 px-2 text-[13px] text-white"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => void saveKey()} className="h-9 rounded-lg bg-white px-4 text-[13px] font-semibold text-black">Save</button>
            <button onClick={() => setKeyFor(null)} className="h-9 rounded-lg px-4 text-[13px] text-white/60">Cancel</button>
          </div>
        </div>
      )}

      {custom.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {custom.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-medium text-white">{c.displayName}</h3>
                  <p className="break-all text-[11px] text-white/40">{c.url}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${BADGE[c.state].cls}`}>{BADGE[c.state].text}</span>
              </div>
              <p className="mt-2 text-[12px] text-white/50">{c.approvedTools} of {c.totalTools} tools switched on · only you can use it</p>
              {c.message && <p className="mt-1 text-[12px] text-amber-200">{c.message}</p>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => void customAction(c.id, "health")} className="h-8 rounded-md border border-white/10 px-3 text-[12px] text-white/80">Check</button>
                <button onClick={() => void customAction(c.id, "delete")} className="h-8 rounded-md px-3 text-[12px] text-red-300">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.015] p-4">
        <h3 className="text-[15px] font-medium text-white">Add your own connector</h3>
        <p className="mt-1 text-[12px] text-white/45">
          App not in the store? Paste the web link of its MCP server. Only secure (https) links to servers on the internet work —
          commands that run on your own computer can&apos;t be added, and nothing is installed or run on our servers.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-app.example.com/mcp"
            aria-label="MCP server link"
            className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 text-[13px] text-white"
          />
          <select value={authType} onChange={(e) => setAuthType(e.target.value as typeof authType)} aria-label="Key type" className="h-9 rounded-md border border-white/10 bg-black/40 px-2 text-[13px] text-white">
            <option value="none">No key needed</option>
            <option value="bearer">Bearer token</option>
            <option value="header">API key header</option>
          </select>
        </div>
        {authType !== "none" && (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {authType === "header" && (
              <input value={headerName} onChange={(e) => setHeaderName(e.target.value)} aria-label="Header name" className="h-9 rounded-md border border-white/10 bg-black/40 px-2 text-[13px] text-white sm:w-40" />
            )}
            <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Key or token" aria-label="Key or token" className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 text-[13px] text-white" />
          </div>
        )}
        <button disabled={busy || !url} onClick={() => void inspect()} className="mt-3 h-9 rounded-lg bg-white px-4 text-[13px] font-semibold text-black disabled:opacity-50">
          {busy ? "Checking…" : "Check this link"}
        </button>

        {inspected && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-[13px] text-white">
              <span className="font-medium">{inspected.serverName}</span> offers {inspected.tools.length} tool{inspected.tools.length === 1 ? "" : "s"}. Switch on only the ones you want AutomateCraft to use.
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {inspected.tools.map((t) => (
                <li key={t.name} className="flex items-start justify-between gap-3 rounded-md bg-white/[0.03] p-2">
                  <div className="min-w-0">
                    <p className="text-[13px] text-white">{t.name}</p>
                    <p className="text-[12px] text-white/50">{t.description}</p>
                    {t.inputs.length > 0 && <p className="text-[11px] text-white/35">Needs: {t.inputs.map((i) => i.name + (i.required ? "" : " (optional)")).join(", ")}</p>}
                    {t.note && <p className="text-[11px] text-amber-200">{t.note}</p>}
                  </div>
                  <input
                    type="checkbox"
                    disabled={!t.supported}
                    checked={Boolean(approved[t.name])}
                    onChange={(e) => setApproved({ ...approved, [t.name]: e.target.checked })}
                    aria-label={`Allow ${t.name}`}
                    className="mt-1 h-4 w-4"
                  />
                </li>
              ))}
            </ul>
            <button disabled={busy} onClick={() => void saveCustom()} className="mt-3 h-9 rounded-lg bg-white px-4 text-[13px] font-semibold text-black disabled:opacity-50">
              Save connector
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
