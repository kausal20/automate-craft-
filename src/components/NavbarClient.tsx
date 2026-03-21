"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { Menu, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "Why Us", href: "/why-us" },
  { label: "Let's Talk", href: "/lets-talk" },
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

  const ctaHref = isAuthenticated ? "/dashboard" : "/signup";
  const ctaLabel = isAuthenticated ? "Dashboard" : "Get Started";

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 px-4 pt-3 md:px-6">
      <div
        className={`mx-auto max-w-[1200px] rounded-2xl transition-all duration-300 ${
          scrolled
            ? "glass-nav shadow-[0_12px_28px_rgba(28,28,28,0.08)]"
            : "bg-white/70 shadow-[0_6px_20px_rgba(28,28,28,0.05)] backdrop-blur-sm"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2.5 md:px-5">
          <BrandMark compact />

          <div className="hidden items-center gap-8 text-[0.95rem] font-medium text-foreground/72 lg:flex">
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

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href={ctaHref}
              className="button-hover inline-flex h-10 items-center justify-center rounded-full border border-transparent bg-foreground px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(28,28,28,0.12)] hover:bg-black/85 md:px-6"
            >
              {ctaLabel}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-foreground shadow-[0_4px_16px_rgba(28,28,28,0.05)] lg:hidden"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-[#E5E7EB] px-4 pb-4 pt-3 lg:hidden">
            <div className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-black/[0.03] hover:text-foreground ${
                    pathname === item.href ? "text-foreground" : "text-foreground/72"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <Link
              href={ctaHref}
              onClick={() => setOpen(false)}
              className="button-hover mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-white transition-all hover:bg-black/85"
            >
              {ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
