"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function AppChrome({
  navbar,
  footer,
  children,
}: {
  navbar: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  // Show navbar on all public pages, hide on auth + dashboard
  const hiddenNavbarRoutes = ["/login", "/signup", "/check-email", "/verify-email", "/onboarding", "/setup", "/lets-talk"];
  const showNavbar = !pathname.startsWith("/dashboard") && !hiddenNavbarRoutes.includes(pathname);

  const hideFooterRoutes = ["/login", "/signup", "/check-email", "/verify-email", "/onboarding", "/setup", "/lets-talk"];
  const hideFooter = pathname.startsWith("/dashboard") || hideFooterRoutes.includes(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {showNavbar ? navbar : null}
      <div className="flex-1">{children}</div>
      {hideFooter ? null : footer}
    </div>
  );
}
