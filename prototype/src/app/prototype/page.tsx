import type { Metadata } from "next";
import Link from "next/link";
import { ROUTE_GROUPS } from "@/prototype/routes";

export const metadata: Metadata = { title: "All pages" };

export default function PrototypeIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
      <h1 className="font-heading text-2xl font-semibold text-foreground">AutomateCraft UI prototype</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/65">
        Every page in the product, running on mock data. Nothing here reaches a real service, so
        change anything. Open the Prototype button in the corner to jump between pages, sign in or
        out, and reset the data.
      </p>

      <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {ROUTE_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="border-b border-white/10 pb-2 text-sm font-semibold text-foreground">
              {group.title}
            </h2>
            <ul className="mt-2">
              {group.routes.map((route) => (
                <li key={route.href}>
                  <Link href={route.href} className="block py-1.5 text-sm text-foreground/70 hover:text-accent">
                    {route.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
