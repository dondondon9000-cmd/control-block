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
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  ${NOISE_GLSL}

  void main() {
    vec3 objectNormal = normalize(normal);
    float noiseCoarse = snoise(position * 3.2 + uTime * uSpeed);
    float noiseFine = snoise(position * 8.0 - uTime * uSpeed * 0.6);
    float noise = noiseCoarse * 0.65 + noiseFine * 0.35;
    float displacement = noise * uIntensity;
    vDisplacement = displacement;
    vec3 displaced = position + objectNormal * displacement;

    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * objectNormal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vDisplacement;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    float mixFactor = clamp(vDisplacement * 4.0 + 0.5, 0.0, 1.0);
    vec3 base = mix(uColorA, uColorB, mixFactor);

    float facing = max(dot(vNormalW, vViewDir), 0.0);
    float fresnel = pow(1.0 - facing, 2.2);
    float core = pow(facing, 3.0);

    vec3 color = base * (0.5 + core * 0.9) + fresnel * vec3(0.55, 0.85, 1.0) * 1.15;
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
  idle: { intensity: 0.045, speed: 0.12, colorA: '#0891b2', colorB: '#38bdf8', bolts: 0.28 },
  listening: { intensity: 0.075, speed: 0.45, colorA: '#22d3ee', colorB: '#818cf8', bolts: 0.6 },
  thinking: { intensity: 0.11, speed: 1.3, colorA: '#a78bfa', colorB: '#f472b6', bolts: 0.9 },
  speaking: { intensity: 0.065, speed: 0.6, colorA: '#34d399', colorB: '#22d3ee', bolts: 0.55 },
};

function randomDirection() {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi));
}

function randomPerpendicular(dir) {
  const arbitrary = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3().crossVectors(dir, arbitrary).normalize();
}

// Recursive midpoint displacement — real lightning is fractal (each segment
// looks like a smaller version of the whole bolt), not a straight line with
// jitter at fixed points, which is what made the old version read as fake.
function subdivideBolt(p0, p1, roughness, depth, out) {
  if (depth <= 0) {
    out.push(p1.clone());
    return;
  }
  const dir = p1.clone().sub(p0);
  const len = dir.length();
  if (len < 1e-5) {
    out.push(p1.clone());
    return;
  }
  dir.normalize();
  const mid = p0.clone().lerp(p1, 0.5);
  const perp = randomPerpendicular(dir).applyAxisAngle(dir, Math.random() * Math.PI * 2);
  mid.addScaledVector(perp, (Math.random() - 0.5) * len * roughness);
  subdivideBolt(p0, mid, roughness * 0.62, depth - 1, out);
  subdivideBolt(mid, p1, roughness * 0.62, depth - 1, out);
}

function buildFractalBolt(origin, direction, length, depth = 4, roughness = 0.55) {
  const end = origin.clone().addScaledVector(direction, length);
  const points = [origin.clone()];
  subdivideBolt(origin, end, roughness, depth, points);
  return points;
}

function buildBranch(points) {
  if (points.length < 4) return null;
  const idx = 1 + Math.floor(Math.random() * (points.length - 3));
  const start = points[idx];
  const mainDir = points[idx + 1].clone().sub(points[idx - 1]).normalize();
  const branchDir = randomPerpendicular(mainDir)
    .applyAxisAngle(mainDir, Math.random() * Math.PI * 2)
    .lerp(mainDir, 0.3)
    .normalize();
  const length = 0.15 + Math.random() * 0.22;
  return buildFractalBolt(start, branchDir, length, 2, 0.6);
}

const BOLT_COLORS = ['#d8f7ff', '#ead9ff'];

function LightningBolt({ colorHex, intensityRef }) {
  const mainGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const branchGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const mainMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0 }),
    [colorHex]
  );
  const branchMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0 }),
    [colorHex]
  );
  const directionRef = useRef(randomDirection());
  const originRef = useRef(directionRef.current.clone().multiplyScalar(1.05));
  const nextStrikeRef = useRef(0);
  const strikeStartRef = useRef(0);
  const hasBranchRef = useRef(false);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const boltIntensity = intensityRef.current;

    if (t > nextStrikeRef.current) {
      const gap = 0.25 + Math.random() * 0.9;
      nextStrikeRef.current = t + gap / Math.max(0.25, boltIntensity * 2.2);
      strikeStartRef.current = t;

      const length = 0.4 + Math.random() * (0.5 + boltIntensity * 1.5);
      const points = buildFractalBolt(originRef.current, directionRef.current, length);
      mainGeometry.setFromPoints(points);

      hasBranchRef.current = Math.random() < 0.55;
      if (hasBranchRef.current) {
        const branchPoints = buildBranch(points);
        if (branchPoints) branchGeometry.setFromPoints(branchPoints);
      }
    }

    // Real lightning is a bright flash that quickly decays, not a smoothly
    // flickering line — an exponential decay since the last strike gives
    // that "snap then fade" read instead of random jitter.
    const elapsed = t - strikeStartRef.current;
    const decay = Math.exp(-elapsed * 7);
    const flash = boltIntensity < 0.04 ? 0 : decay * Math.min(1, 0.4 + boltIntensity * 1.3);
    mainMaterial.opacity = flash;
    branchMaterial.opacity = hasBranchRef.current ? flash * 0.55 : 0;
  });

  return (
    <>
      <line geometry={mainGeometry} material={mainMaterial} />
      <line geometry={branchGeometry} material={branchMaterial} />
    </>
  );
}

function LightningField({ intensityRef }) {
  const bolts = useMemo(
    () => Array.from({ length: 14 }, (_, i) => BOLT_COLORS[i % BOLT_COLORS.length]),
    []
  );
  return (
    <group>
      {bolts.map((colorHex, i) => (
        <LightningBolt key={i} colorHex={colorHex} intensityRef={intensityRef} />
      ))}
    </group>
  );
}

function makeGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(200, 230, 255, 0.45)');
  gradient.addColorStop(0.4, 'rgba(160, 200, 255, 0.18)');
  gradient.addColorStop(0.75, 'rgba(150, 170, 255, 0.05)');
  gradient.addColorStop(1, 'rgba(150, 170, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function NeuronSphere({ state = 'idle', amplitude = 0 }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const boltIntensityRef = useRef(0.18);
  const material = useMemo(() => makeMaterial(), []);
  const glowTexture = useMemo(() => makeGlowTexture(), []);

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

    boltIntensityRef.current = THREE.MathUtils.lerp(boltIntensityRef.current, preset.bolts * boost, 0.08);

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
      meshRef.current.rotation.x += delta * 0.02;
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(material.uniforms.uTime.value * 1.2) * 0.05 * boost;
      glowRef.current.scale.set(3.4 * pulse, 3.4 * pulse, 1);
      glowRef.current.material.opacity = THREE.MathUtils.lerp(
        glowRef.current.material.opacity,
        0.22 + boost * 0.1,
        0.05
      );
    }
  });

  return (
    <group>
      <mesh ref={meshRef} material={material}>
        <icosahedronGeometry args={[1, 64]} />
      </mesh>
      <sprite ref={glowRef} scale={[3.4, 3.4, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.25}
        />
      </sprite>
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
      <LightningField intensityRef={boltIntensityRef} />
    </group>
  );
}
