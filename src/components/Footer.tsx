import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a]">
      <div className="site-container py-20">
        <div className="grid gap-14 md:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-sm">
            <BrandMark compact={false} />
            <p className="mt-4 text-sm leading-7 text-subtle">
              Our platform helps teams turn manual work into clear, dependable
              AI automations.
            </p>
          </div>

          <div className="grid gap-12 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Pages
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-foreground/70">
                <li>
                  <Link href="/" className="link-hover">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="link-hover">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/why-us" className="link-hover">
                    Why Us
                  </Link>
                </li>
                <li>
                  <Link href="/lets-talk" className="link-hover">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Reach
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-foreground/70">
                <li>
                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noreferrer"
                    className="link-hover"
                  >
                    X
                  </a>
                </li>
                <li>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noreferrer"
                    className="link-hover"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@automatecraft.ai"
                    className="link-hover"
                  >
                    hello@automatecraft.ai
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-7 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} AutomateCraft. All rights reserved.</p>
          <p>Built for modern business workflows.</p>
        </div>
      </div>
    </footer>
  );
}
