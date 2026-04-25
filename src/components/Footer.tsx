import Link from "next/link";
import BrandMark from "@/components/BrandMark";

const footerLinks = {
  product: [
    { label: "Pricing", href: "/pricing" },
    { label: "How Credits Work", href: "/how-credits-work" },
    { label: "Changelog", href: "/changelog" },
  ],
  company: [
    { label: "Why Us", href: "/why-us" },
    { label: "Let's Talk", href: "/lets-talk" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
  social: [
    { label: "X (Twitter)", href: "https://x.com/automatecraft", external: true },
    { label: "LinkedIn", href: "https://linkedin.com/company/automatecraft", external: true },
    { label: "hello@automatecraft.ai", href: "mailto:hello@automatecraft.ai" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative bg-[#09090b]">
      {/* Gradient separator */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/15 to-transparent" />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-32 w-96 rounded-full bg-accent/[0.03] blur-[60px]" />

      <div className="site-container py-20">
        <div className="grid gap-14 md:grid-cols-[1.3fr_0.7fr_0.5fr_0.5fr]">
          {/* Brand */}
          <div className="max-w-xs">
            <BrandMark compact={false} showName />
            <p className="mt-4 text-sm leading-7 text-white/35">
              AI-powered automation that&apos;s clear to build, calm to run, and easy to maintain.
            </p>
            <div className="mt-5 flex items-center gap-2 text-[11px] text-white/20">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
              All systems operational
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Product
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors duration-200 hover:text-white/80">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Company
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors duration-200 hover:text-white/80">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Social */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Legal
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors duration-200 hover:text-white/80">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Reach
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {footerLinks.social.map((link) => (
                <li key={link.href}>
                  {"external" in link ? (
                    <a href={link.href} target="_blank" rel="noreferrer" className="transition-colors duration-200 hover:text-white/80">
                      {link.label}
                    </a>
                  ) : (
                    <a href={link.href} className="transition-colors duration-200 hover:text-white/80">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.04] pt-7 text-sm text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} AutomateCraft. All rights reserved.</p>
          <p className="text-white/20">Built for modern business workflows.</p>
        </div>
      </div>
    </footer>
  );
}
