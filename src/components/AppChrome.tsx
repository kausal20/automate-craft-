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
  const showNavbar = pathname === "/";
  const hideFooter =
    pathname.startsWith("/dashboard") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/how-credits-work" ||
    pathname === "/";

  return (
    <div className="flex min-h-screen flex-col">
      {showNavbar ? navbar : null}
      <div className="flex-1">{children}</div>
      {hideFooter ? null : footer}
    </div>
  );
}
