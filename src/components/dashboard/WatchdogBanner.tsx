"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type Lang = "en" | "hi";
interface AlertText {
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
}
interface OpenAlert {
  id: string;
  text: { en: AlertText; hi: AlertText };
}

const LANG_KEY = "ac_lang";

export default function WatchdogBanner() {
  const [alerts, setAlerts] = useState<OpenAlert[]>([]);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved === "hi" || saved === "en") setLang(saved);
    } catch {
      /* storage blocked: stay on English */
    }
    let cancelled = false;
    fetch("/api/watchdog/alerts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.alerts)) setAlerts(data.alerts);
      })
      .catch(() => {
        /* a failed check must never break the dashboard */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (alerts.length === 0) return null;

  const switchLang = (next: Lang) => {
    setLang(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <section aria-label="Needs your attention" className="mx-auto w-full max-w-6xl px-4 pt-4">
      <div className="mb-2 flex items-center justify-between text-xs text-white/60">
        <span className="font-semibold uppercase tracking-wide">
          {lang === "hi" ? "ध्यान दें" : "Needs your attention"}
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={() => switchLang("en")}
            aria-pressed={lang === "en"}
            className={lang === "en" ? "font-semibold text-white" : "underline"}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => switchLang("hi")}
            aria-pressed={lang === "hi"}
            className={lang === "hi" ? "font-semibold text-white" : "underline"}
          >
            हिंदी
          </button>
        </span>
      </div>
      <ul className="space-y-2">
        {alerts.map((alert) => {
          const t = alert.text[lang];
          return (
            <li
              key={alert.id}
              className="flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-amber-100">{t.title}</p>
                  <p className="mt-1 text-sm leading-6 text-amber-100/80">{t.body}</p>
                </div>
              </div>
              <Link
                href={t.actionHref}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-amber-300 px-5 text-sm font-semibold text-black hover:bg-amber-200"
              >
                {t.actionLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
