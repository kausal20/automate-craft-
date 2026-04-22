"use client";

import { useMemo } from "react";

type Particle = {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
  type: "blue" | "white";
};

/**
 * Subtle floating particle system.
 * Creates ambient "life" in the background without being distracting.
 * Particles drift upward slowly with varying sizes and opacities.
 */
export function FloatingParticles({ count = 12 }: { count?: number }) {
  const particles = useMemo<Particle[]>(
    () => Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${((i * 37) % 100) + 0.5}%`,
      size: ((i * 13) % 3) + 1,
      duration: ((i * 11) % 25) + 20,
      delay: (i * 7) % 15,
      type: i % 3 === 0 ? "blue" : "white",
    })),
    [count],
  );

  if (particles.length === 0) return null;

  return (
    <div className="particles-container" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`particle particle--${p.type}`}
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
