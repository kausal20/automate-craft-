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

  // Hide navbar on auth pages (they have their own layout) and dashboard (has sidebar)
  const hiddenRoutes = ["/login", "/signup", "/check-email", "/verify-email", "/onboarding", "/setup"];
  if (pathname.startsWith("/dashboard") || hiddenRoutes.includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 px-4 pt-3 md:px-6">
      <div
        className={`mx-auto max-w-[1180px] rounded-2xl transition-all duration-300 ${
          scrolled
            ? "glass-nav shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
            : "bg-white/[0.03] shadow-[0_4px_18px_rgba(0,0,0,0.2)] backdrop-blur-sm"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 md:px-5">
          <BrandMark compact showName />

          <div className="hidden items-center gap-7 text-[0.95rem] font-medium text-foreground/70 lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-1 py-1 transition-colors duration-200 hover:text-foreground ${
                  pathname === item.href ? "text-foreground" : "text-foreground/70"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex h-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 md:px-6"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-white/60 transition-colors duration-200 hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-accent to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:translate-y-[-1px] active:translate-y-0 md:px-6"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5 text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-colors lg:hidden"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Scroll glow line */}
        {scrolled && (
          <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        )}

        {open ? (
          <div className="border-t border-white/8 px-4 pb-4 pt-3 lg:hidden">
            <div className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5 hover:text-foreground ${
                    pathname === item.href ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-accent to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/8 bg-white/5 px-5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-accent to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
