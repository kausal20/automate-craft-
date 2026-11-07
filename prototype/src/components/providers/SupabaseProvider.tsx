"use client";

import type { ReactNode } from "react";

/** PROTOTYPE: no Supabase. Kept as a pass-through so the layout matches production. */
export function SupabaseProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
