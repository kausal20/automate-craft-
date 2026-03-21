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
  const hideChrome =
    pathname.startsWith("/dashboard") ||
    pathname === "/login" ||
    pathname === "/signup";

  return (
    <div className="flex min-h-screen flex-col">
      {hideChrome ? null : navbar}
      <div className="flex-1">{children}</div>
      {hideChrome ? null : footer}
    </div>
  );
}
