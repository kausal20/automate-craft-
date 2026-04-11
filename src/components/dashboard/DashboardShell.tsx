"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Blocks,
  LayoutDashboard,
  Sparkles,
  LogOut,
  Settings,
  User,
  Star,
  Users,
  Coins,
  HelpCircle,
  Plug,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";
import type { AuthenticatedUser } from "@/lib/automation";
import { BuyCreditsModal } from "@/components/dashboard/BuyCreditsModal";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";

type RecentItem = {
  id: string;
  name: string;
};

type CreditsData = {
  totalCredits: number;
  planCredits: number;
  extraCredits: number;
  freeCredits?: number;
  hasSubscription: boolean;
};

export default function DashboardShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AuthenticatedUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isChatWorkspace =
    pathname === "/dashboard/chat" || pathname.startsWith("/dashboard/chat/");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRecents = async () => {
      try {
        const res = await fetch("/api/automations?limit=5");
        const data = await res.json();
        if (data.automations) {
          setRecents(
            (data.automations as Array<{ id: string; name: string }>).map((automation) => ({
              id: automation.id,
              name: automation.name,
            })),
          );
        }
      } catch {
        console.error("Failed to fetch recents");
      }
    };
    void fetchRecents();
  }, [pathname]);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCreditsData(data);
        }
      } catch {
        console.error("Failed to fetch credits");
      }
    };
    void fetchCredits();
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (creditsRef.current && !creditsRef.current.contains(event.target as Node)) {
        setIsCreditsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out.");
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Sign out failed.", error);
    }
  };

  const handleModalSuccess = () => {
    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCreditsData(data);
        }
      } catch {
        console.error("Failed to fetch credits");
      }
    };
    void fetchCredits();
    router.refresh();
  };

  const navItems = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Workspace", href: "/dashboard/chat", icon: Sparkles },
  ];

  const projectItems = [
    { name: "All Projects", href: "/dashboard/projects", icon: Blocks },
    { name: "Starred", href: "#", icon: Star },
    { name: "Created by Me", href: "#", icon: User },
    { name: "Shared with Me", href: "#", icon: Users },
  ];

  const sidebarWidth = isCollapsed ? "w-[80px]" : "w-[240px]";
  const mainMargin = isChatWorkspace ? "ml-0" : isCollapsed ? "ml-[80px]" : "ml-[240px]";

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      {!isChatWorkspace && (
      <aside 
        className={`fixed bottom-0 left-0 top-0 ${sidebarWidth} flex shrink-0 flex-col border-r z-40 transition-all duration-300 ease-in-out border-white/5 bg-[#0f0f0f] ${
          isCollapsed ? "cursor-pointer hover:bg-white/[0.02]" : ""
        }`}
        onClick={(e) => {
          if (!isCollapsed) return;
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('a')) return;
          setIsCollapsed(false);
        }}
      >
        {/* Top Header / Logo Toggle */}
        <div className={`flex h-16 items-center border-b ${isCollapsed ? "justify-center" : "px-6"} ${isChatWorkspace ? "border-[#E5E7EB]" : "border-white/5"}`}>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="group relative flex items-center transition-transform hover:scale-105 active:scale-95"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <BrandMark compact href="#" />
          </button>
        </div>

        {/* Navigation */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? "px-2" : "px-3"} py-4 space-y-6`}>
          {/* Main Nav */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center" : "gap-3"
                } ${
                  pathname === item.href
                    ? isChatWorkspace
                      ? "bg-black/[0.04] text-foreground"
                      : "bg-white/5 text-foreground"
                    : isChatWorkspace
                      ? "text-foreground/60 hover:bg-black/[0.04] hover:text-foreground"
                      : "text-foreground/60 hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ))}

            {/* Projects Section (Non-expandable) */}
            <div className="mt-4">
              {!isCollapsed ? (
                <div className="flex w-full items-center px-3 py-2 text-sm font-medium text-foreground/30 transition-all justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 shrink-0 text-accent/50" />
                    <span className={`uppercase tracking-widest text-[10px] font-bold ${isChatWorkspace ? "text-foreground/30" : "text-white/30"}`}>Projects</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-2 opacity-20">
                  <div className={`h-px w-8 ${isChatWorkspace ? "bg-black/20" : "bg-white/20"}`} />
                </div>
              )}
              
              <div className={`mt-1 space-y-1 ${!isCollapsed ? `ml-4 border-l ${isChatWorkspace ? "border-black/5" : "border-white/5"} pl-2` : "px-2"}`}>
                {projectItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isCollapsed ? "justify-center" : "gap-3"
                    } ${
                      pathname === item.href
                        ? isChatWorkspace
                          ? "bg-black/[0.04] text-foreground"
                          : "bg-white/5 text-foreground"
                        : isChatWorkspace
                          ? "text-foreground/50 hover:bg-black/[0.04] hover:text-foreground"
                          : "text-foreground/50 hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-3.5 w-3.5 shrink-0 ${isCollapsed ? "h-4 w-4" : ""}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                ))}
              </div>
            </div>
            {/* Apps Section */}
            <div className="mt-4">
              {!isCollapsed ? (
                <div className="flex w-full items-center px-3 py-2 text-sm font-medium text-foreground/30 transition-all justify-between">
                  <div className="flex items-center gap-3">
                    <Plug className="h-4 w-4 shrink-0 text-accent/50" />
                    <span className={`uppercase tracking-widest text-[10px] font-bold ${isChatWorkspace ? "text-foreground/30" : "text-white/30"}`}>Integrations</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-2 opacity-20">
                  <div className={`h-px w-8 ${isChatWorkspace ? "bg-black/20" : "bg-white/20"}`} />
                </div>
              )}
              
              <div className={`mt-1 space-y-1 ${!isCollapsed ? `ml-4 border-l ${isChatWorkspace ? "border-black/5" : "border-white/5"} pl-2` : "px-2"}`}>
                <Link
                  href="/dashboard/apps"
                  title={isCollapsed ? "Connect Apps" : undefined}
                  className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isCollapsed ? "justify-center" : "gap-3"
                  } ${
                    pathname === "/dashboard/apps"
                      ? isChatWorkspace
                        ? "bg-black/[0.04] text-foreground"
                        : "bg-white/5 text-foreground"
                      : isChatWorkspace
                        ? "text-foreground/50 hover:bg-black/[0.04] hover:text-foreground"
                        : "text-foreground/50 hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Plug className={`h-3.5 w-3.5 shrink-0 ${isCollapsed ? "h-4 w-4" : ""}`} />
                  {!isCollapsed && <span>Connect Apps</span>}
                </Link>
              </div>
            </div>
          </nav>

          {/* Recents */}
          {recents.length > 0 && !isCollapsed && (
            <div className="space-y-2 px-3 animate-in fade-in duration-500">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Recents</p>
              <div className="space-y-1">
                {recents.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/automations/${item.id}`}
                    className="group block truncate rounded-md py-1 text-[13px] font-medium text-foreground/45 hover:text-foreground"
                  >
                    <span className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/20">•</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* User Footer */}
        <div className={`relative border-t ${isCollapsed ? "p-2" : "p-4"} ${isChatWorkspace ? "border-[#E5E7EB]" : "border-white/5"}`} ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`flex w-full items-center rounded-xl transition-colors ${
              isCollapsed ? "justify-center p-1.5" : "gap-3 p-2"
            } ${isChatWorkspace ? "hover:bg-black/[0.04]" : "hover:bg-white/5"}`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black uppercase ring-2 ring-white/5 shadow-sm`}>
              {user.name?.[0] || user.email[0]}
            </div>
            {!isCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-bold text-foreground/80 truncate">{user.name || "User"}</p>
                <p className="text-[10px] font-medium text-foreground/40 truncate">{user.email}</p>
              </div>
            )}
          </button>

          {/* User Dropdown */}
          {isUserMenuOpen && (
            <div className={`absolute bottom-full mb-2 overflow-hidden rounded-xl border shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              isChatWorkspace ? "border-[#E5E7EB] bg-white" : "border-white/5 bg-[#1a1a1a]"
            } ${
              isCollapsed ? "left-2 w-[160px]" : "left-4 right-4"
            }`}>
              <div className="p-1.5 underline-none">
                <Link
                  href="/dashboard/settings"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-all ${isChatWorkspace ? "hover:bg-black/[0.04] hover:text-foreground" : "hover:bg-white/5 hover:text-foreground"}`}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-all ${isChatWorkspace ? "hover:bg-black/[0.04] hover:text-foreground" : "hover:bg-white/5 hover:text-foreground"}`}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <div className={`my-1 border-t ${isChatWorkspace ? "border-[#E5E7EB]" : "border-white/5"}`} />
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
      )}

      <main className={`${mainMargin} relative min-w-0 flex-1 h-full overflow-hidden transition-all duration-300 ease-in-out`}>
        {/* Top-Right Credits Floating Pill & Dropdown */}
        {pathname === "/" && (
          <div className="fixed right-20 top-6 z-30" ref={creditsRef}>
          <button
            onClick={() => setIsCreditsOpen(!isCreditsOpen)}
            className="flex items-center gap-2.5 rounded-full bg-white/5 px-4 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.5)] border border-white/5 transition-all hover:scale-105 active:scale-95 group"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3B82F6]/10">
              <Coins className="h-3.5 w-3.5 text-[#3B82F6]" />
            </div>
            <span className="text-sm font-bold text-foreground">
              {creditsData ? creditsData.totalCredits.toFixed(2) : "..." }
            </span>
          </button>

          {/* Credits Popover (attached to top-right pill) */}
          {isCreditsOpen && creditsData && (
            <div className="absolute right-0 top-full mt-3 overflow-hidden rounded-[1.5rem] bg-[#111111] p-5 shadow-[0_24px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-200 z-50 w-[300px]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/40">Available Credits</span>
                  <HelpCircle className="h-3.5 w-3.5 text-white/20" />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#3B82F6]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#3B82F6]">
                  <Sparkles className="h-3 w-3" />
                  {creditsData.hasSubscription ? "Premium" : "Standard"}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/20">
                  <Coins className="h-6 w-6 text-[#3B82F6]" />
                </div>
                <span className="text-[2rem] font-bold leading-none tracking-tight text-white">
                  {creditsData.totalCredits.toFixed(2)}
                </span>
              </div>

              <div className="space-y-3.5 pt-5 border-t border-white/5 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/50">Free Credits</span>
                    <HelpCircle className="h-3 w-3 text-white/10" />
                  </div>
                  <span className="text-xs font-bold text-white">
                    {(creditsData.freeCredits || 0).toFixed(2)} <span className="text-white/20 ml-1">/ 10</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/50">Monthly Credits</span>
                    <HelpCircle className="h-3 w-3 text-white/10" />
                  </div>
                  <span className="text-xs font-bold text-white">
                    {creditsData.planCredits.toFixed(2)} <span className="text-white/20 ml-1">/ 50</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/50">Top up Credits</span>
                  <span className="text-xs font-bold text-white">
                    {creditsData.extraCredits.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {!creditsData.hasSubscription ? (
                  <button
                    onClick={() => {
                      setIsCreditsOpen(false);
                      router.push("/pricing");
                    }}
                    className="w-full flex items-center justify-center rounded-xl bg-[#3B82F6] py-3 text-xs font-bold text-white transition-all hover:bg-[#2563EB] hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_20px_rgba(59,130,246,0.2)]"
                  >
                    Manage your Subscriptions
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsCreditsOpen(false);
                      setShowBuyCreditsModal(true);
                    }}
                    className="w-full flex items-center justify-center rounded-xl bg-[#3B82F6] py-3 text-xs font-bold text-white transition-all hover:bg-[#2563EB] hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_20px_rgba(59,130,246,0.2)]"
                  >
                    Buy More Credits
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {children}
      </main>

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
    </div>
  );
}
