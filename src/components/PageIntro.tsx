import type { ReactNode } from "react";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export default function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: PageIntroProps) {
  return (
    <section className="section-space relative overflow-hidden pb-16 pt-32 md:pt-36">
      {/* Ambient radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full opacity-40"
        style={{
          background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="site-container relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
            {eyebrow}
          </span>
          <h1 className="mt-7 text-[3rem] font-semibold leading-[0.94] tracking-[-0.07em] text-foreground sm:text-[3.9rem]">
            {title}
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-[0.97rem] leading-8 text-white/45">
            {description}
          </p>
          {children ? <div className="mt-10">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
