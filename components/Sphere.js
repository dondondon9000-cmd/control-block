'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const NOISE_GLSL = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uSpeed;
  varying float vDisplacement;
  varying vec3 vNormal;

  ${NOISE_GLSL}

  void main() {
    vNormal = normal;
    float noise = snoise(position * 1.6 + uTime * uSpeed);
    float displacement = noise * uIntensity;
    vDisplacement = displacement;
    vec3 newPosition = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vDisplacement;
  varying vec3 vNormal;

  void main() {
    float mixFactor = clamp(vDisplacement * 2.0 + 0.5, 0.0, 1.0);
    vec3 color = mix(uColorA, uColorB, mixFactor);
    float rim = pow(1.0 - abs(vNormal.z), 2.0);
    color += rim * 0.4;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function makeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.15 },
      uSpeed: { value: 0.15 },
      uColorA: { value: new THREE.Color('#0891b2') },
      uColorB: { value: new THREE.Color('#a78bfa') },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
}

const PRESETS = {
  idle: { intensity: 0.12, speed: 0.12, colorA: '#0891b2', colorB: '#38bdf8' },
  listening: { intensity: 0.32, speed: 0.45, colorA: '#22d3ee', colorB: '#818cf8' },
  thinking: { intensity: 0.4, speed: 1.3, colorA: '#a78bfa', colorB: '#f472b6' },
  speaking: { intensity: 0.3, speed: 0.6, colorA: '#34d399', colorB: '#22d3ee' },
};

export default function NeuronSphere({ state = 'idle', amplitude = 0 }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const material = useMemo(() => makeMaterial(), []);
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#6ee7ff',
        transparent: true,
        opacity: 0.08,
      }),
    []
  );

  const particles = useMemo(() => {
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.6 + Math.random() * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((_, delta) => {
    const preset = PRESETS[state] || PRESETS.idle;
    const boost = 1 + amplitude * 0.8;

    material.uniforms.uTime.value += delta;
    material.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      material.uniforms.uIntensity.value,
      preset.intensity * boost,
      0.05
    );
    material.uniforms.uSpeed.value = THREE.MathUtils.lerp(
      material.uniforms.uSpeed.value,
      preset.speed,
      0.05
    );
    material.uniforms.uColorA.value.lerp(new THREE.Color(preset.colorA), 0.05);
    material.uniforms.uColorB.value.lerp(new THREE.Color(preset.colorB), 0.05);

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
      meshRef.current.rotation.x += delta * 0.02;
    }
    if (glowRef.current) {
      const scale = 1.15 + Math.sin(material.uniforms.uTime.value * 1.5) * 0.02 * boost;
      glowRef.current.scale.setScalar(scale);
      glowRef.current.rotation.y -= delta * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} material={material}>
        <icosahedronGeometry args={[1, 64]} />
      </mesh>
      <mesh ref={glowRef} material={glowMaterial} scale={1.15}>
        <icosahedronGeometry args={[1, 16]} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.02} color="#a5f3fc" transparent opacity={0.6} sizeAttenuation />
      </points>
    </group>
  );
}
