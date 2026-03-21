import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="site-container py-16">
        <div className="grid gap-12 md:grid-cols-[1.25fr_0.75fr]">
          <div className="max-w-md">
            <BrandMark compact={false} />
            <p className="mt-4 text-sm leading-7 text-subtle">
              AutomateCraft helps teams automate repetitive workflows with AI,
              clear setup, and dependable execution logs.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
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
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
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

        <div className="mt-12 flex flex-col gap-3 border-t border-[#E5E7EB] pt-6 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} AutomateCraft. All rights reserved.</p>
          <p>Built for business workflows.</p>
        </div>
      </div>
    </footer>
  );
}
