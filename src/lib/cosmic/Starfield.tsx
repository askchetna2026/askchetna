'use client';

import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

export function CosmicStarfield() {
  return (
    <Canvas
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        filter: 'brightness(1.2) contrast(1.1)'
      }}
      camera={{ position: [0, 0, 1] }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        dpr: window.devicePixelRatio || 1
      }}
      dpr={[1, 2]}
    >
      <Stars
        radius={100}
        depth={50}
        count={10000}
        factor={8}
        saturation={0}
        fade={false}
        speed={0.2}
      />
    </Canvas>
  );
}
