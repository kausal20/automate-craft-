"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Blocks,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Settings,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";
import type { AuthenticatedUser } from "@/lib/automation";

/* LOGIC EXPLAINED:
This shell wraps every dashboard page and handles sign out. The new logs make
the sign-out flow visible so you can confirm the click, the API request, and
the redirect back to login.
*/

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Connected Apps", href: "/dashboard/apps", icon: Blocks },
  { name: "Logs", href: "/dashboard/logs", icon: ListTodo },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AuthenticatedUser;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      console.log("[DashboardShell] Sign out clicked.");
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      const json = (await response.json()) as {
        error?: string;
      };
      console.log("[DashboardShell] Sign out response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not sign out.");
      }

      router.push("/login");
      router.refresh();
      console.log("[DashboardShell] Redirected to login after sign out.");
    } catch (error) {
      console.error("[DashboardShell] Sign out failed.", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="flex w-72 shrink-0 flex-col border-r border-black/6 bg-white shadow-[2px_0_24px_rgba(28,28,28,0.02)]">
        <div className="border-b border-black/6 px-6 py-6">
          <BrandMark compact href="/" />
        </div>

        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Signed in as
          </p>
          <p className="mt-3 text-sm font-medium text-foreground/72">
            {user.name || user.email}
          </p>
          <p className="mt-1 text-xs text-foreground/48">{user.email}</p>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-3">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" &&
                pathname.startsWith("/dashboard/automations/"));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-200 ${
                  isActive
                    ? "bg-accent/10 font-semibold text-accent shadow-sm"
                    : "font-medium text-foreground/55 hover:bg-black/[0.03] hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-black/6 p-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-foreground/58 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
