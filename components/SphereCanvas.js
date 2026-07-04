'use client';

import { Canvas } from '@react-three/fiber';
import NeuronSphere from './Sphere';

export default function SphereCanvas({ state = 'idle', amplitude = 0, className = '' }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 3.4], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 3]} intensity={0.8} color="#a5f3fc" />
        <NeuronSphere state={state} amplitude={amplitude} />
      </Canvas>
    </div>
  );
}
