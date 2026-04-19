"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { Menu, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const navigation = [
  { label: "Pricing", href: "/pricing" },
  { label: "Why Us", href: "/why-us" },
];

export default function NavbarClient({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  /* LOGIC EXPLAINED:
  The homepage needed two strict modes:
  1. Public Home shows the marketing header.
  2. Authenticated Home shows no public header at all.
  This component now renders only for the logged-out homepage and keeps the
  header limited to the exact links and actions requested.
  */
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const handleScroll = useEffectEvent(() => {
    setScrolled(window.scrollY > 18);
  });

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pathname !== "/" || isAuthenticated) {
    return null;
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 px-4 pt-3 md:px-6">
      <div
        className={`mx-auto max-w-[1180px] rounded-2xl transition-all duration-300 ${
          scrolled
            ? "glass-nav shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
            : "bg-white/5 shadow-[0_4px_18px_rgba(0,0,0,0.2)] backdrop-blur-sm"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 md:px-5">
          <BrandMark compact showName />

          <div className="hidden items-center gap-7 text-[0.95rem] font-medium text-foreground/72 lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`link-hover rounded-md px-1 py-1 transition-colors ${
                  pathname === item.href ? "text-foreground" : "text-foreground/72"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <Link
              href="/login"
              className="text-sm font-semibold text-white/70 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-dark button-hover inline-flex h-10 flex-shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold shadow-[0_6px_18px_rgba(28,28,28,0.12)] md:px-6"
            >
              Sign up
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] lg:hidden"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-white/10 px-4 pb-4 pt-3 lg:hidden">
            <div className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5 hover:text-foreground ${
                    pathname === item.href ? "text-foreground" : "text-foreground/72"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="btn-dark button-hover inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-all"
              >
                Sign up
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
