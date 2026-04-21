import DeleteAccountSection from "@/components/dashboard/DeleteAccountSection";
import {
  BrainCircuit,
  Database,
  KeyRound,
  ShieldCheck,
  UserRound,
  Webhook,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { env, hasOpenAIKey, isSupabaseAuthEnabled, isSupabaseMode } from "@/lib/env";

const statusCards = [
  {
    title: "Authentication",
    description: isSupabaseAuthEnabled()
      ? "Supabase Auth is active for session handling and user identity."
      : "Local credential auth is active. Set Supabase keys to move to managed auth.",
    value: isSupabaseAuthEnabled() ? "Supabase mode" : "Local mode",
    icon: ShieldCheck,
  },
  {
    title: "Database",
    description: isSupabaseMode()
      ? "Automations, runs, and integrations are stored in Supabase PostgreSQL."
      : "Data is stored locally in data/automatecraft-local.json until Supabase is configured.",
    value: isSupabaseMode() ? "Supabase PostgreSQL" : "Local JSON store",
    icon: Database,
  },
  {
    title: "AI generation",
    description: hasOpenAIKey()
      ? `Workflow generation uses ${env.openaiModel}.`
      : "OpenAI is not configured, so the deterministic fallback workflow builder is active.",
    value: hasOpenAIKey() ? "OpenAI enabled" : "Fallback mode",
    icon: BrainCircuit,
  },
  {
    title: "Webhooks",
    description:
      "Each saved automation gets a unique webhook path that can trigger execution.",
    value: "/api/webhook/:id",
    icon: Webhook,
  },
];

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground">
          Settings
        </h1>
        <p className="mt-2 text-foreground/58">
          Review the current account, environment mode, and execution setup for
          your workspace.
        </p>
      </div>

      <section className="card-surface rounded-[2rem] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent/[0.05] text-accent ring-1 ring-accent/15 shadow-[0_4px_12px_rgba(59,130,246,0.1)]">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent/70">
                Current account
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground tracking-tight">
                {user.name || "AutomateCraft user"}
              </h2>
              <p className="mt-1 text-foreground/45">{user.email}</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] px-5 py-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              Session mode
            </p>
            <p className="mt-2 text-sm font-semibold capitalize text-foreground">
              {user.mode}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {statusCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="card-surface rounded-[2rem] p-6 transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)] hover:border-white/[0.1]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent/[0.05] text-accent ring-1 ring-accent/15 shadow-[0_4px_12px_rgba(59,130,246,0.08)]">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-foreground tracking-tight">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/45">
                {card.description}
              </p>
              <p className="mt-5 rounded-full bg-white/[0.04] border border-white/[0.06] px-4 py-2 text-sm font-semibold text-white/65">
                {card.value}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 card-surface rounded-[2rem] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent/[0.05] text-accent ring-1 ring-accent/15 shadow-[0_4px_12px_rgba(59,130,246,0.08)]">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Security and execution notes
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
              All dashboard API routes require an authenticated user and only
              return automations that belong to that user. Saved automations can
              be triggered manually from the dashboard or externally through
              their unique webhook path, and every run writes structured logs for
              traceability.
            </p>
          </div>
        </div>
      </section>

      <DeleteAccountSection />
    </div>
  );
}
