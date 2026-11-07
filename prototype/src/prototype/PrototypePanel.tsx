"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Map, X } from "lucide-react";
import { resetMockData } from "@/mock/db";
import { clearSessionCookie, hasSessionCookie, setSessionCookie } from "@/mock/session";
import { ROUTE_GROUPS } from "./routes";

/**
 * Floating tool for moving around the prototype. It is not part of the product
 * design: remove <PrototypePanel /> from src/app/layout.tsx to see pages clean.
 */
export function PrototypePanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setOpen(false);
    setSignedIn(hasSessionCookie());
  }, [pathname]);

  const toggleSession = () => {
    if (signedIn) clearSessionCookie();
    else setSessionCookie();
    window.location.assign(signedIn ? "/" : "/dashboard");
  };

  const reset = () => {
    resetMockData();
    window.location.assign("/dashboard");
  };

  return (
    <div className="fixed bottom-3 right-3 z-[10000] font-sans text-[13px]">
      {open ? (
        <div className="flex max-h-[min(70vh,560px)] w-[280px] max-w-[calc(100vw-24px)] flex-col rounded-lg border border-white/15 bg-[#141416] text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <Link href="/prototype" className="font-semibold hover:underline">
              All pages
            </Link>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close panel" className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-1 py-1" aria-label="Prototype pages">
            {ROUTE_GROUPS.map((group) => (
              <div key={group.title} className="py-1">
                <p className="px-2 py-1 text-[11px] font-medium text-white/50">{group.title}</p>
                {group.routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={`block rounded px-2 py-1.5 hover:bg-white/10 ${
                      pathname === route.href.split("?")[0] ? "text-[#7fb0ff]" : "text-white/85"
                    }`}
                  >
                    {route.name}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="grid grid-cols-2 gap-1 border-t border-white/10 p-2">
            <button type="button" onClick={toggleSession} className="rounded px-2 py-1.5 text-left text-white/85 hover:bg-white/10">
              {signedIn ? "Sign out" : "Sign in"}
            </button>
            <button type="button" onClick={reset} className="rounded px-2 py-1.5 text-left text-white/85 hover:bg-white/10">
              Reset mock data
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-[#141416] px-3 font-medium text-white/85 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:text-white"
        >
          <Map className="h-3.5 w-3.5" />
          Prototype
          <ChevronDown className="h-3.5 w-3.5 rotate-180" />
        </button>
      )}
    </div>
  );
}
