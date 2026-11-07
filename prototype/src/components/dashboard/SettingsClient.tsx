"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Bell, Palette, Cpu, Trash2,
  ChevronRight, Check, Loader2, X, Copy, ExternalLink,
  Moon, Sun, Monitor, AlertTriangle, Lock, Webhook,
  Database, BrainCircuit, ShieldCheck,
} from "lucide-react";
import type { AuthenticatedUser } from "@/lib/automation";

type SystemInfo = {
  authMode: "supabase" | "local";
  dbMode: "supabase" | "local";
  aiMode: "openai" | "fallback";
  aiModel: string | null;
  webhookBase: string;
};

const TABS = [
  { id: "security",      label: "Security",       icon: Shield },
  { id: "notifications", label: "Notifications",  icon: Bell },
  { id: "appearance",    label: "Appearance",      icon: Palette },
  { id: "system",        label: "System",          icon: Cpu },
  { id: "danger",        label: "Danger Zone",     icon: Trash2, danger: true },
] as const;

type TabId = typeof TABS[number]["id"];

// ─── tiny helpers ────────────────────────────────────────────────
function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
      ok ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
         : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
      {label}
    </span>
  );
}

function Row({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5">
      <span className="text-[13px] text-white/40">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[13px] font-medium text-white/80 ${mono ? "font-mono" : ""}`}>{value}</span>
        {copy && (
          <button
            onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="text-white/25 hover:text-white/60 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-4">
      <div>
        <p className="text-[13px] font-medium text-white/80">{label}</p>
        {desc && <p className="mt-0.5 text-[11.5px] text-white/35">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${value ? "bg-accent" : "bg-white/10"}`}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md"
          animate={{ x: value ? 20 : 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        />
      </button>
    </div>
  );
}

// ─── Tab panels ──────────────────────────────────────────────────

function ProfileTab({ user }: { user: AuthenticatedUser }) {
  const [name, setName] = useState(user.name ?? "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-semibold text-white">Profile</h2>
        <p className="mt-1 text-[13px] text-white/40">Manage your name and account identity.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 text-xl font-bold text-accent ring-1 ring-accent/20">
          {initials}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-white/80">{user.name ?? "No name set"}</p>
          <p className="text-[12px] text-white/35">{user.email}</p>
          <p className="mt-1 text-[11px] text-white/20">
            {user.mode === "supabase" ? "Google / Email account" : "Local account"}
          </p>
        </div>
      </div>

      {/* Name field */}
      <div className="space-y-2">
        <label className="text-[12px] font-semibold uppercase tracking-widest text-white/25">Display Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[14px] text-white placeholder:text-white/20 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-semibold uppercase tracking-widest text-white/25">Email</label>
        <input
          value={user.email}
          disabled
          className="w-full rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-[14px] text-white/30 cursor-not-allowed outline-none"
        />
        <p className="text-[11px] text-white/20">Email cannot be changed here.</p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] hover:bg-[#5c95fb] transition-all active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
        {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
      </button>
    </div>
  );
}

function SecurityTab() {
  const [show2FA, setShow2FA] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-semibold text-white">Security</h2>
        <p className="mt-1 text-[13px] text-white/40">Protect your account and manage sessions.</p>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white/80">Session Active</p>
              <p className="text-[11px] text-white/30">Your session is valid and secure.</p>
            </div>
            <Badge ok label="Active" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/40">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white/80">Two-Factor Auth</p>
                <p className="text-[11px] text-white/30">Add an extra layer of protection.</p>
              </div>
            </div>
            <button
              onClick={() => setShow2FA(!show2FA)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all"
            >
              {show2FA ? "Cancel" : "Enable"}
            </button>
          </div>
          <AnimatePresence>
            {show2FA && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="rounded-xl border border-accent/15 bg-accent/[0.04] p-4">
                  <p className="text-[12.5px] text-accent/80">2FA setup coming soon. You can configure it once your account is on Plus plan.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/40">
              <ExternalLink className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white/80">Sign Out All Devices</p>
              <p className="text-[11px] text-white/30">Revoke all active sessions immediately.</p>
            </div>
          </div>
          <button className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all">
            Sign out all
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    automationSuccess: true,
    automationFail: true,
    weeklyDigest: false,
    productUpdates: true,
    creditAlerts: true,
  });

  const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-semibold text-white">Notifications</h2>
        <p className="mt-1 text-[13px] text-white/40">Choose what you want to be notified about.</p>
      </div>
      <div className="space-y-2.5">
        <Toggle label="Automation success" desc="Get notified when a workflow runs successfully." value={prefs.automationSuccess} onChange={() => toggle("automationSuccess")} />
        <Toggle label="Automation failure" desc="Alerts when a workflow encounters an error." value={prefs.automationFail} onChange={() => toggle("automationFail")} />
        <Toggle label="Weekly digest" desc="A summary of your automation activity every Monday." value={prefs.weeklyDigest} onChange={() => toggle("weeklyDigest")} />
        <Toggle label="Product updates" desc="News about new features and improvements." value={prefs.productUpdates} onChange={() => toggle("productUpdates")} />
        <Toggle label="Low credit alerts" desc="Alert when your credits drop below 5." value={prefs.creditAlerts} onChange={() => toggle("creditAlerts")} />
      </div>
      <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] hover:bg-[#5c95fb] transition-all active:scale-[0.98]">
        <Check className="h-3.5 w-3.5" /> Save preferences
      </button>
    </div>
  );
}

function AppearanceTab() {
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  const themes = [
    { id: "dark", label: "Dark", icon: Moon },
    { id: "light", label: "Light", icon: Sun },
    { id: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-semibold text-white">Appearance</h2>
        <p className="mt-1 text-[13px] text-white/40">Customize how the interface looks and feels.</p>
      </div>

      <div className="space-y-3">
        <label className="text-[12px] font-semibold uppercase tracking-widest text-white/25">Theme</label>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-center gap-2.5 rounded-xl border py-5 transition-all ${
                  active
                    ? "border-accent/40 bg-accent/[0.06] shadow-[0_0_16px_rgba(59,130,246,0.1)]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-accent" : "text-white/35"}`} />
                <span className={`text-[12px] font-semibold ${active ? "text-white/90" : "text-white/40"}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[12px] font-semibold uppercase tracking-widest text-white/25">Density</label>
        <div className="flex gap-3">
          {(["comfortable", "compact"] as const).map(d => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={`flex-1 rounded-xl border py-3 text-[13px] font-semibold capitalize transition-all ${
                density === d
                  ? "border-accent/40 bg-accent/[0.06] text-accent"
                  : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.1]"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] hover:bg-[#5c95fb] transition-all active:scale-[0.98]">
        <Check className="h-3.5 w-3.5" /> Apply
      </button>
    </div>
  );
}

function SystemTab({ info }: { info: SystemInfo }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-semibold text-white">System</h2>
        <p className="mt-1 text-[13px] text-white/40">Live environment configuration and integration info.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: ShieldCheck, label: "Authentication", ok: info.authMode === "supabase", okLabel: "Supabase", badLabel: "Local mode" },
          { icon: Database, label: "Database", ok: info.dbMode === "supabase", okLabel: "Supabase PostgreSQL", badLabel: "Local JSON" },
          { icon: BrainCircuit, label: "AI Engine", ok: info.aiMode === "openai", okLabel: `OpenAI · ${info.aiModel}`, badLabel: "Fallback mode" },
          { icon: Webhook, label: "Webhooks", ok: true, okLabel: "Active", badLabel: "" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/50">
                  <Icon className="h-4 w-4" />
                </div>
                <Badge ok={card.ok} label={card.ok ? card.okLabel : card.badLabel} />
              </div>
              <p className="text-[13px] font-semibold text-white/75">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2.5">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-white/25">Webhook</p>
        <Row label="Endpoint pattern" value={info.webhookBase} mono copy />
        <p className="text-[11.5px] text-white/25 leading-relaxed">Each automation gets a unique `:id` path. Trigger externally via `POST {info.webhookBase}`.</p>
      </div>
    </div>
  );
}

function DangerTab() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const CONFIRM_WORD = "DELETE";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (res.ok) window.location.href = "/";
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-semibold text-white">Danger Zone</h2>
        <p className="mt-1 text-[13px] text-white/40">Irreversible account actions. Proceed with caution.</p>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-red-400">Delete Account</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-red-300/50">
              Permanently deletes your account, all automations, webhook routes, integrations, and remaining credits. This cannot be undone.
            </p>
            <button
              onClick={() => setShowConfirm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(220,38,38,0.25)] hover:bg-red-700 transition-all active:scale-[0.98]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete my account
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl border border-red-500/30 bg-[#130808] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-red-400">Confirm deletion</p>
              <button onClick={() => { setShowConfirm(false); setTyped(""); }} className="text-white/25 hover:text-white/60">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[13px] text-white/40">
              Type <span className="font-mono font-bold text-red-400">{CONFIRM_WORD}</span> to confirm.
            </p>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value.toUpperCase())}
              placeholder={CONFIRM_WORD}
              className="w-full rounded-xl border border-red-500/20 bg-white/[0.03] px-4 py-3 font-mono text-[14px] text-red-400 placeholder:text-white/15 outline-none focus:border-red-500/40 transition-all"
            />
            <button
              onClick={handleDelete}
              disabled={typed !== CONFIRM_WORD || deleting}
              className="w-full rounded-xl bg-red-600 py-3 text-[13px] font-bold text-white transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {deleting ? "Deleting..." : "Permanently delete account"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function SettingsClient({ user: _user, systemInfo }: { user: AuthenticatedUser; systemInfo: SystemInfo }) {
  const [activeTab, setActiveTab] = useState<TabId>("security");

  const tabContent: Record<TabId, React.ReactNode> = {
    security: <SecurityTab />,
    notifications: <NotificationsTab />,
    appearance: <AppearanceTab />,
    system: <SystemTab info={systemInfo} />,
    danger: <DangerTab />,
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-[13px] text-white/35">Manage your account, preferences, and workspace.</p>
      </div>

      <div className="flex gap-8 flex-col lg:flex-row">
        {/* Sidebar nav */}
        <nav className="flex lg:flex-col gap-1 lg:w-52 shrink-0 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-150 text-left ${
                  active
                    ? tab.id === "danger"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-white/[0.06] text-white"
                    : tab.id === "danger"
                    ? "text-red-400/60 hover:bg-red-500/[0.05] hover:text-red-400"
                    : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="settings-tab-bg"
                    className={`absolute inset-0 rounded-xl ${tab.id === "danger" ? "bg-red-500/10" : "bg-white/[0.06]"}`}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <Icon className={`relative h-4 w-4 shrink-0 ${active && tab.id !== "danger" ? "text-accent" : ""}`} />
                <span className="relative">{tab.label}</span>
                {active && <ChevronRight className="relative ml-auto h-3.5 w-3.5 hidden lg:block opacity-40" />}
              </button>
            );
          })}
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f11] p-6 lg:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {tabContent[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
