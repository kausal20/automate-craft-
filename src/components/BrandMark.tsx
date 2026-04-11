import Link from "next/link";
import Image from "next/image";

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
    <div className="flex items-center">
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
    </div>
  );

  return <Link href={href}>{content}</Link>;
}
