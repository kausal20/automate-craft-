"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/* LOGIC EXPLAINED:
This scene already had floating 3D pieces, but premium motion needs two extra
things: smoother interpolation and clearer visual hierarchy. The fix keeps the
objects simple and matte, then eases their response to scroll and pointer input
so the background feels calm instead of reactive or noisy.
*/

type BlockConfig = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  rotationSpeedX: number;
  rotationSpeedY: number;
  floatOffset: number;
  parallax: number;
  opacity: number;
};

const blockConfigs: BlockConfig[] = [
  {
    position: [-6.4, 2.8, -7.8],
    rotation: [0.42, 0.52, 0.18],
    scale: [1.85, 1.85, 1.85],
    rotationSpeedX: 0.0018,
    rotationSpeedY: 0.0012,
    floatOffset: 0.72,
    parallax: 0.014,
    opacity: 0.28,
  },
  {
    position: [6.8, -1.8, -8.4],
    rotation: [0.2, -0.38, -0.14],
    scale: [3.5, 0.72, 1.05],
    rotationSpeedX: 0.0014,
    rotationSpeedY: 0.0018,
    floatOffset: 0.58,
    parallax: 0.011,
    opacity: 0.24,
  },
  {
    position: [-7.4, -4.8, -10.5],
    rotation: [0.1, 0.24, 0.08],
    scale: [2.8, 0.18, 1.6],
    rotationSpeedX: 0.0012,
    rotationSpeedY: 0.0016,
    floatOffset: 0.65,
    parallax: 0.009,
    opacity: 0.22,
  },
  {
    position: [7.2, 4.1, -6.4],
    rotation: [0.34, -0.16, 0.28],
    scale: [1.05, 2.7, 0.94],
    rotationSpeedX: 0.0016,
    rotationSpeedY: 0.0013,
    floatOffset: 0.81,
    parallax: 0.013,
    opacity: 0.26,
  },
];

const workflowNodes: [number, number, number][] = [
  [-3.8, -1.1, -6.2],
  [-1.3, -0.35, -6.2],
  [1.2, 0.2, -6.2],
  [3.8, 0.8, -6.2],
];

function createOrbTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size / 2,
  );

  gradient.addColorStop(0, "rgba(79, 142, 247, 0.85)");
  gradient.addColorStop(0.35, "rgba(79, 142, 247, 0.28)");
  gradient.addColorStop(1, "rgba(79, 142, 247, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

function AbstractBlock({
  config,
  scrollOffsetRef,
}: {
  config: BlockConfig;
  scrollOffsetRef: React.RefObject<number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    const time = state.clock.getElapsedTime();
    const scrollOffset = scrollOffsetRef.current || 0;
    const pointerX = state.pointer.x * 0.18;
    const pointerY = state.pointer.y * 0.12;

    mesh.rotation.x = config.rotation[0] + time * config.rotationSpeedX + pointerY;
    mesh.rotation.y = config.rotation[1] + time * config.rotationSpeedY + pointerX;
    mesh.rotation.z = config.rotation[2];

    const targetX = config.position[0] + state.pointer.x * config.parallax * 6;
    const targetY =
      config.position[1] +
      Math.sin(time * config.floatOffset) * 0.22 -
      scrollOffset * config.parallax;

    mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetX, 0.035);
    mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, 0.035);
  });

  return (
    <mesh ref={meshRef} position={config.position} rotation={config.rotation}>
      <boxGeometry args={config.scale} />
      <meshStandardMaterial
        color="#E5E7EB"
        transparent
        opacity={config.opacity}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

function SoftOrb({
  scrollOffsetRef,
}: {
  scrollOffsetRef: React.RefObject<number>;
}) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => createOrbTexture(), []);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame((state) => {
    const sprite = spriteRef.current;

    if (!sprite) {
      return;
    }

    const time = state.clock.getElapsedTime();
    const scrollOffset = scrollOffsetRef.current || 0;
    const scale = 10.5 + Math.sin(time * 0.22) * 0.35;
    const targetX = 3.8 + Math.sin(time * 0.14) * 0.3;
    const targetY = -0.8 + Math.cos(time * 0.18) * 0.24 - scrollOffset * 0.01;

    sprite.position.x = THREE.MathUtils.lerp(sprite.position.x, targetX, 0.028);
    sprite.position.y = THREE.MathUtils.lerp(sprite.position.y, targetY, 0.028);
    sprite.position.z = -15;
    sprite.scale.x = THREE.MathUtils.lerp(sprite.scale.x, scale, 0.03);
    sprite.scale.y = THREE.MathUtils.lerp(sprite.scale.y, scale, 0.03);
    sprite.scale.z = 1;
  });

  return (
    <sprite ref={spriteRef}>
      <spriteMaterial
        map={texture}
        color="#4F8EF7"
        transparent
        opacity={0.1}
        depthWrite={false}
      />
    </sprite>
  );
}

function WorkflowNodeFlow({
  scrollOffsetRef,
}: {
  scrollOffsetRef: React.RefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<Array<THREE.Mesh | null>>([]);
  const lineRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const time = state.clock.getElapsedTime();
    const scrollOffset = scrollOffsetRef.current || 0;
    const targetX = state.pointer.x * 0.18;
    const targetY = -scrollOffset * 0.006;

    group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, 0.03);
    group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, 0.03);
    group.position.z = 0;

    nodeRefs.current.forEach((node, index) => {
      if (!node) {
        return;
      }

      const pulse = 1 + Math.sin(time * 0.6 + index * 0.8) * 0.08;
      node.scale.setScalar(pulse);
    });

    lineRefs.current.forEach((line, index) => {
      if (!line) {
        return;
      }

      const material = line.material as THREE.MeshBasicMaterial;
      material.opacity = 0.09 + (Math.sin(time * 0.45 + index * 0.9) + 1) * 0.02;
    });
  });

  const segments = useMemo(() => {
    return workflowNodes.slice(0, -1).map((point, index) => {
      const next = workflowNodes[index + 1];
      const dx = next[0] - point[0];
      const dy = next[1] - point[1];
      const dz = next[2] - point[2];
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const angle = Math.atan2(dy, dx);

      return {
        position: [
          (point[0] + next[0]) / 2,
          (point[1] + next[1]) / 2,
          (point[2] + next[2]) / 2,
        ] as [number, number, number],
        length,
        angle,
      };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {segments.map((segment, index) => (
        <mesh
          key={`line-${index}`}
          ref={(node) => {
            lineRefs.current[index] = node;
          }}
          position={segment.position}
          rotation={[0, 0, segment.angle]}
        >
          <boxGeometry args={[segment.length, 0.02, 0.02]} />
          <meshBasicMaterial color="#4F8EF7" transparent opacity={0.12} />
        </mesh>
      ))}

      {workflowNodes.map((point, index) => (
        <mesh
          key={`node-${index}`}
          ref={(node) => {
            nodeRefs.current[index] = node;
          }}
          position={point}
        >
          <sphereGeometry args={[0.1, 18, 18]} />
          <meshBasicMaterial color="#4F8EF7" transparent opacity={0.24} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({
  scrollOffsetRef,
}: {
  scrollOffsetRef: React.RefObject<number>;
}) {
  const cameraGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const cameraGroup = cameraGroupRef.current;

    if (!cameraGroup) {
      return;
    }

    cameraGroup.rotation.x = THREE.MathUtils.lerp(
      cameraGroup.rotation.x,
      -state.pointer.y * 0.05,
      0.03,
    );
    cameraGroup.rotation.y = THREE.MathUtils.lerp(
      cameraGroup.rotation.y,
      state.pointer.x * 0.06,
      0.03,
    );
  });

  return (
    <group ref={cameraGroupRef}>
      <fog attach="fog" args={["#ffffff", 13, 26]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[8, 10, 6]} intensity={0.88} />
      <pointLight position={[0, -4, 8]} intensity={0.18} color="#eef4ff" />

      <SoftOrb scrollOffsetRef={scrollOffsetRef} />
      <WorkflowNodeFlow scrollOffsetRef={scrollOffsetRef} />

      {blockConfigs.map((config, index) => (
        <AbstractBlock
          key={`block-${index}`}
          config={config}
          scrollOffsetRef={scrollOffsetRef}
        />
      ))}
    </group>
  );
}

export default function HeroScene() {
  const { scrollY } = useScroll();
  const scrollOffsetRef = useRef(0);
  const canvasYRaw = useTransform(scrollY, [0, 320, 900], [0, -10, -34]);
  const canvasOpacityRaw = useTransform(scrollY, [0, 360, 920], [1, 0.92, 0]);
  const canvasY = useSpring(canvasYRaw, {
    stiffness: 70,
    damping: 24,
    mass: 0.6,
  });
  const canvasOpacity = useSpring(canvasOpacityRaw, {
    stiffness: 90,
    damping: 26,
    mass: 0.5,
  });

  useMotionValueEvent(scrollY, "change", (latest) => {
    scrollOffsetRef.current = latest;
  });

  return (
    <motion.div
      style={{ y: canvasY, opacity: canvasOpacity }}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 14], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Scene scrollOffsetRef={scrollOffsetRef} />
      </Canvas>
    </motion.div>
  );
}
