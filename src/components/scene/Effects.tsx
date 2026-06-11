import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sim } from '../../game/engine';
import { useRunnerStore } from '../../game/runnerStore';
import { softSpriteTexture } from './textures';

const LINE_COUNT = 26;
const EMBER_COUNT = 40;
const STEAM_COUNT = 16;
const SPARK_COUNT = 16;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const OFFSCREEN = -1000;

function usePoints(count: number, color: string, size: number, opacity: number) {
  return useMemo(() => {
    const positions = new Float32Array(count * 3).fill(OFFSCREEN);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const material = new THREE.PointsMaterial({
      map: softSpriteTexture(),
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return { geometry, material, positions };
  }, [count, color, size, opacity]);
}

/**
 * Atmosphere + juice with soft additive sprites: speed-line streaks along the
 * walls, embers rising off the grill side, steam over the fry side, and a
 * gold spark burst whenever coins are banked.
 */
export function Effects() {
  const linesRef = useRef<THREE.InstancedMesh>(null);
  const reduced = useRunnerStore((state) => state.save.settings.reducedEffects || state.save.settings.quality === 'low');

  const embers = usePoints(EMBER_COUNT, '#ff9a3d', 0.34, 0.85);
  const steam = usePoints(STEAM_COUNT, '#9fd8e8', 1.1, 0.16);
  const sparks = usePoints(SPARK_COUNT, '#ffe58a', 0.42, 0.95);

  const data = useMemo(() => {
    const lines = Array.from({ length: LINE_COUNT }, (_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (4.6 + (i % 5) * 0.85),
      y: 0.8 + ((i * 37) % 100) / 100 * 6.5,
      z: (i * 53) % 140,
      len: 1 + ((i * 17) % 10) / 10 * 1.6
    }));
    const emberSeeds = Array.from({ length: EMBER_COUNT }, (_, i) => ({
      x: 5.2 + ((i * 29) % 100) / 100 * 2.6,
      z: (i * 41) % 120,
      phase: (i * 0.61) % 1,
      rate: 0.35 + ((i * 13) % 10) / 100 * 6,
      sway: 0.2 + ((i * 7) % 10) / 10 * 0.4
    }));
    const steamSeeds = Array.from({ length: STEAM_COUNT }, (_, i) => ({
      x: -(5.4 + ((i * 23) % 100) / 100 * 2.2),
      z: (i * 67) % 110,
      phase: (i * 0.37) % 1,
      rate: 0.16 + ((i * 11) % 10) / 100 * 2
    }));
    const sparkDirs = Array.from({ length: SPARK_COUNT }, (_, i) => {
      const a = (i / SPARK_COUNT) * Math.PI * 2;
      return { dx: Math.cos(a), dy: Math.sin(a) * 0.8 + 0.7, dz: -0.3 };
    });
    return { lines, emberSeeds, steamSeeds, sparkDirs };
  }, []);

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), []);
  const burst = useRef({ t: 99, x: 0, y: 0 });
  const prevCoins = useRef(0);

  /* eslint-disable react-hooks/immutability -- imperative r3f per-frame updates */
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    // ---- speed line streaks ----
    const lines = linesRef.current;
    if (lines) {
      for (let i = 0; i < LINE_COUNT; i += 1) {
        const line = data.lines[i];
        if (reduced && i % 2 === 0) {
          lines.setMatrixAt(i, HIDDEN);
          continue;
        }
        const span = 140;
        const z = ((line.z - sim.distance * 1.5) % span + span) % span - 14;
        const stretch = line.len * (0.8 + sim.worldSpeed * 0.07);
        tmp.p.set(line.x, line.y, z);
        tmp.q.identity();
        tmp.s.set(1, 1, stretch);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        lines.setMatrixAt(i, tmp.m);
      }
      lines.instanceMatrix.needsUpdate = true;
    }

    // ---- embers (grill side, screen-left/+X) ----
    {
      const arr = embers.positions;
      for (let i = 0; i < EMBER_COUNT; i += 1) {
        if (reduced && i % 2 === 0) {
          arr[i * 3 + 1] = OFFSCREEN;
          continue;
        }
        const seed = data.emberSeeds[i];
        const span = 120;
        const z = ((seed.z - sim.distance) % span + span) % span - 10;
        const cycle = (t * seed.rate + seed.phase) % 1;
        arr[i * 3] = seed.x + Math.sin(t * 2 + seed.phase * 9) * seed.sway;
        arr[i * 3 + 1] = 1.4 + cycle * 5;
        arr[i * 3 + 2] = z;
      }
      embers.geometry.attributes.position.needsUpdate = true;
      embers.material.opacity = 0.85;
    }

    // ---- steam (fry side, screen-right/−X) ----
    {
      const arr = steam.positions;
      for (let i = 0; i < STEAM_COUNT; i += 1) {
        if (reduced && i % 2 === 0) {
          arr[i * 3 + 1] = OFFSCREEN;
          continue;
        }
        const seed = data.steamSeeds[i];
        const span = 110;
        const z = ((seed.z - sim.distance) % span + span) % span - 8;
        const cycle = (t * seed.rate + seed.phase) % 1;
        arr[i * 3] = seed.x + Math.sin(t * 1.2 + seed.phase * 7) * 0.5;
        arr[i * 3 + 1] = 1.8 + cycle * 4.2;
        arr[i * 3 + 2] = z;
      }
      steam.geometry.attributes.position.needsUpdate = true;
    }

    // ---- coin burst sparks ----
    {
      if (sim.runCoins > prevCoins.current && sim.running) {
        burst.current = { t: 0, x: sim.laneX, y: 1.0 + sim.playerY };
      }
      prevCoins.current = sim.runCoins;
      burst.current.t += dt;
      const life = burst.current.t;
      const DURATION = 0.45;
      const arr = sparks.positions;
      for (let i = 0; i < SPARK_COUNT; i += 1) {
        if (life > DURATION) {
          arr[i * 3 + 1] = OFFSCREEN;
          continue;
        }
        const dir = data.sparkDirs[i];
        const r = life * 4.5;
        arr[i * 3] = burst.current.x + dir.dx * r;
        arr[i * 3 + 1] = burst.current.y + dir.dy * r - life * life * 7;
        arr[i * 3 + 2] = dir.dz * r;
      }
      sparks.geometry.attributes.position.needsUpdate = true;
      sparks.material.opacity = Math.max(0, 1 - life / 0.45);
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group>
      <instancedMesh ref={linesRef} args={[undefined, undefined, LINE_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.03, 0.03, 1]} />
        <meshBasicMaterial color="#7fe8ff" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      <points geometry={embers.geometry} material={embers.material} frustumCulled={false} />
      <points geometry={steam.geometry} material={steam.material} frustumCulled={false} />
      <points geometry={sparks.geometry} material={sparks.material} frustumCulled={false} />
    </group>
  );
}
