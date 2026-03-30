"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useRef } from "react";
import { Menu, X, Loader2, Coins, ChevronDown } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { BuyCreditsModal } from "@/components/dashboard/BuyCreditsModal";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";

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
  const router = useRouter();
  const isHome = pathname === "/";
  const isPricing = pathname === "/pricing";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Popover state
  const [creditsData, setCreditsData] = useState<{
    totalCredits: number;
    planCredits: number;
    extraCredits: number;
    hasSubscription: boolean;
  } | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Modal flow state
  const [isCheckingPlan, setIsCheckingPlan] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);

  const handleScroll = useEffectEvent(() => {
    setScrolled(window.scrollY > 18);
  });

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/credits")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setCreditsData(data);
        })
        .catch(console.error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBuyCreditsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCheckingPlan) return;
    setIsCheckingPlan(true);

    try {
      const res = await fetch("/api/credits");
      if (res.ok) {
        const data = await res.json();
        if (data.hasSubscription) {
          setShowBuyCreditsModal(true);
        } else {
          setShowSubscriptionModal(true);
        }
      } else {
        // Fallback to routing if the API fails
        router.push("/dashboard");
      }
    } catch (err) {
      console.error(err);
      router.push("/dashboard");
    } finally {
      setIsCheckingPlan(false);
      setOpen(false); // Close mobile menu if open
    }
  };

  const handleModalSuccess = () => {
    if (isAuthenticated) {
      fetch("/api/credits")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setCreditsData(data);
        });
    }
    router.refresh();
  };

  const ctaHref = isAuthenticated ? "/dashboard" : "/signup";
  const ctaLabel = isAuthenticated ? "Dashboard" : "Get Started";

  return (
    <>
      {!isPricing && (
        <nav className="fixed left-0 right-0 top-0 z-50 px-4 pt-3 md:px-6">
          <div
            className={`mx-auto max-w-[1180px] rounded-2xl transition-all duration-300 ${
              scrolled
                ? "glass-nav shadow-[0_10px_24px_rgba(28,28,28,0.07)]"
                : "bg-white/82 shadow-[0_4px_18px_rgba(28,28,28,0.04)] backdrop-blur-sm"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-2 md:px-5">
              <BrandMark compact />

              <div className={`hidden items-center gap-7 text-[0.95rem] font-medium text-foreground/72 lg:flex ${isHome ? "invisible pointer-events-none" : ""}`}>
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
                {isAuthenticated && (
                  <div className="relative" ref={popoverRef}>
                    <button
                      onClick={() => setShowPopover(!showPopover)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111111] shadow-[0_4px_16px_rgba(28,28,28,0.05)] transition-all hover:bg-black/[0.02] hover:-translate-y-0.5"
                    >
                      <Coins className="h-4 w-4 text-[#F59E0B]" />
                      {creditsData ? creditsData.totalCredits.toLocaleString() : <Loader2 className="h-3 w-3 animate-spin text-black/40" />}
                      <ChevronDown className={`h-3 w-3 text-black/40 transition-transform duration-200 ${showPopover ? "rotate-180" : ""}`} />
                    </button>

                    {showPopover && creditsData && (
                      <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[320px] rounded-[1.75rem] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] origin-top-right animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Available Credits</span>
                          <span className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#111111]">
                            {creditsData.hasSubscription ? "Active Plan" : "Free Plan"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                           <Coins className="h-8 w-8 text-[#F59E0B]" />
                           <span className="text-[2.5rem] font-bold leading-none tracking-tight text-[#111111]">
                             {creditsData.totalCredits.toLocaleString()}
                           </span>
                        </div>

                        <div className="space-y-3.5 border-t border-black/5 pt-5 mb-6">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-[#6B7280]">Plan Credits (Monthly)</span>
                            <span className="font-bold text-[#111111]">{creditsData.planCredits.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-[#6B7280]">Top Up Credits</span>
                            <span className="font-bold text-[#111111]">{creditsData.extraCredits.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                           <Link
                             href="/pricing"
                             onClick={() => setShowPopover(false)}
                             className="flex w-full items-center justify-center rounded-2xl bg-black/5 py-3.5 text-sm font-bold text-[#111111] transition-colors hover:bg-black/10"
                           >
                             Manage your Subscriptions
                           </Link>
                           <button
                             onClick={() => {
                               setShowPopover(false);
                               if (creditsData.hasSubscription) {
                                 setShowBuyCreditsModal(true);
                               } else {
                                 setShowSubscriptionModal(true);
                               }
                             }}
                             className="flex w-full items-center justify-center rounded-2xl bg-[#111111] py-3.5 text-sm font-bold text-white transition-all hover:bg-black/90 shadow-[0_4px_14px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
                           >
                             Buy More Credits
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <Link
                  href={ctaHref}
                  className="btn-dark button-hover inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold shadow-[0_6px_18px_rgba(28,28,28,0.12)] md:px-6"
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
                {!isHome ? (
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
                ) : null}

                <Link
                  href={ctaHref}
                  onClick={() => setOpen(false)}
                  className="btn-dark button-hover mt-3 inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-all"
                >
                  {ctaLabel}
                </Link>
                {isAuthenticated && (
                  <button
                    onClick={handleBuyCreditsClick}
                    disabled={isCheckingPlan}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-foreground transition-all disabled:opacity-70"
                  >
                    {isCheckingPlan ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#6B7280]" />
                    ) : (
                      "Buy Credits"
                    )}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </nav>
      )}

      {/* Global Modals */}
      <BuyCreditsModal
        isOpen={showBuyCreditsModal}
        onClose={() => setShowBuyCreditsModal(false)}
        onSuccess={handleModalSuccess}
      />
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
