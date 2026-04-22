import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function Footer() {
  return (
    <footer className="relative bg-[#09090b]">
      {/* Gradient separator line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/15 to-transparent" />
      
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-32 w-96 rounded-full bg-accent/[0.03] blur-[60px]" />

      <div className="site-container py-20">
        <div className="grid gap-14 md:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-sm">
            <BrandMark compact={false} showName />
            <p className="mt-4 text-sm leading-7 text-white/35">
              Our platform helps teams turn manual work into clear, dependable
              AI automations.
            </p>
          </div>

          <div className="grid gap-12 sm:grid-cols-2">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
                Pages
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-white/50">
                <li>
                  <Link href="/" className="transition-colors duration-200 hover:text-white/80">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="transition-colors duration-200 hover:text-white/80">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/why-us" className="transition-colors duration-200 hover:text-white/80">
                    Why Us
                  </Link>
                </li>
                <li>
                  <Link href="/lets-talk" className="transition-colors duration-200 hover:text-white/80">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
                Reach
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-white/50">
                <li>
                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors duration-200 hover:text-white/80"
                  >
                    X
                  </a>
                </li>
                <li>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors duration-200 hover:text-white/80"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@automatecraft.ai"
                    className="transition-colors duration-200 hover:text-white/80"
                  >
                    hello@automatecraft.ai
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.04] pt-7 text-sm text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} AutomateCraft. All rights reserved.</p>
          <p className="text-white/20">Built for modern business workflows.</p>
        </div>
      </div>
    </footer>
  );
}
