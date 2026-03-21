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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-64 w-[38rem] -translate-x-1/2 rounded-full bg-accent/8 blur-3xl" />
      </div>

      <div className="site-container relative">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-7 text-[3rem] font-semibold leading-[0.96] tracking-[-0.06em] text-foreground sm:text-[3.8rem]">
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-subtle">
            {description}
          </p>
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
