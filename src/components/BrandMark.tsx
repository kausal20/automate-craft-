import Link from "next/link";
import Image from "next/image";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  white?: boolean;
  showName?: boolean;
};

export default function BrandMark({
  compact = false,
  href = "/",
  white = false,
  showName = false,
}: BrandMarkProps) {
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
          <span className="text-[#3b82f6]">Craft</span>
        </span>
      )}
    </div>
  );

  return <Link href={href}>{content}</Link>;
}
