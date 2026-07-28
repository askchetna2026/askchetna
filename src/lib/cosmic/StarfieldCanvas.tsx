'use client';

import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

/**
 * The WebGL starfield itself, split out from CosmicStarfield so it can be
 * code-split behind next/dynamic. Keeping the three.js imports in this file is
 * the point: nothing here is fetched unless the gate in Starfield.tsx decides
 * this device should render it.
 */
export default function StarfieldCanvas() {
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
                filter: 'brightness(1.2) contrast(1.1)',
            }}
            camera={{ position: [0, 0, 1] }}
            gl={{
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance',
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
