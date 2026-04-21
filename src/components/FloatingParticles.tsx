"use client";

import { useEffect, useState } from "react";

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
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generated: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 25 + 20,
      delay: Math.random() * 15,
      type: Math.random() > 0.6 ? "blue" : "white",
    }));
    setParticles(generated);
  }, [count]);

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
