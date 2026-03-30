import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  white?: boolean;
};

export default function BrandMark({
  compact = false,
  href = "/",
  white = false,
}: BrandMarkProps) {
  const content = (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 88 52"
        aria-hidden="true"
        className={`${compact ? "h-10 w-16" : "h-11 w-18"} ${white ? "text-white" : "text-foreground"}`}
        fill="none"
      >
        <path
          d="M8 42L22 10H33L18 42H8Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M21 42L35 10H46L31 42H21Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M19 28H46"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M77 15C73.5 11.3 68.8 9 63.5 9C52.7 9 44 17.7 44 28.5C44 39.3 52.7 48 63.5 48C69 48 74 45.7 77.6 41.9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M54 28.5H78"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="79" cy="8" r="3.5" fill="currentColor" />
      </svg>

      <div className={`${compact ? "hidden sm:block" : ""}`}>
        <div className={`text-[1.7rem] font-bold tracking-[-0.05em] ${white ? "text-white" : "text-foreground"}`}>
          AutomateCraft
        </div>
        {!compact ? (
          <div className={`text-sm ${white ? "text-white/60" : "text-foreground/60"}`}>AI Automation Agency</div>
        ) : null}
      </div>
    </div>
  );

  return <Link href={href}>{content}</Link>;
}
