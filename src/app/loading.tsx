import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#09090b]">
      <div className="relative flex items-center justify-center">
        {/* Outer glow ring */}
        <div
          className="absolute h-24 w-24 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
            animation: "glow-pulse 2s ease-in-out infinite",
          }}
        />
        {/* Inner subtle ring */}
        <div className="absolute h-16 w-16 rounded-full border border-accent/10 animate-ping" style={{ animationDuration: "2.5s" }} />
        <Image
          src="/logo-new.png"
          alt="Loading..."
          width={64}
          height={64}
          className="relative object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.35)]"
          priority
        />
      </div>
    </div>
  );
}
