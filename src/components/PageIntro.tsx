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
      <div className="site-container relative">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-7 text-[3rem] font-semibold leading-[0.94] tracking-[-0.07em] text-foreground sm:text-[3.9rem]">
            {title}
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-[0.97rem] leading-8 text-subtle">
            {description}
          </p>
          {children ? <div className="mt-10">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
