import Link from "next/link";
import Image from "next/image";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  showName?: boolean;
};

export default function BrandMark({
  compact = false,
  href = "/",
  showName = false,
}: BrandMarkProps) {
  /* LOGIC EXPLAINED: The brand mark was keeping a bright blue text accent in the
     dashboard header area, which added to the electric feel the user wanted removed.
     This fix keeps the logo and brand intact while making the wordmark neutral white,
     so hover states around it feel quieter and cleaner. */
  const content = (
    <div className="flex items-center gap-2.5">
      <div className="relative flex items-center justify-center">
        <Image
          src="/logo-new.png"
          alt="AutomateCraft Logo"
          width={compact ? 42 : 54}
          height={compact ? 42 : 54}
          className="object-contain"
          priority
        />
      </div>
      {showName && (
        <span className="text-[1.15rem] font-bold tracking-tight drop-shadow-sm">
          <span className="text-white">Automate</span>
          <span className="text-white/78">Craft</span>
        </span>
      )}
    </div>
  );

  return <Link href={href}>{content}</Link>;
}
