import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#111111]">
      <div className="relative animate-pulse flex items-center justify-center">
        <Image
          src="/logo-new.png"
          alt="Loading..."
          width={64}
          height={64}
          className="object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
          priority
        />
      </div>
    </div>
  );
}
