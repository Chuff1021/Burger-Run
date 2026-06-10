import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sim } from '../../game/engine';
import { useRunnerStore } from '../../game/runnerStore';

const LINE_COUNT = 26;
const EMBER_COUNT = 36;
const SPARK_COUNT = 14;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Atmosphere + juice: scrolling speed lines along the walls, embers rising
 * from the grill side, steam on the fry side, and a gold spark burst whenever
 * coins are banked. Everything is instanced and driven imperatively.
 */
export function Effects() {
  const linesRef = useRef<THREE.InstancedMesh>(null);
  const embersRef = useRef<THREE.InstancedMesh>(null);
  const sparksRef = useRef<THREE.InstancedMesh>(null);
  const reduced = useRunnerStore((state) => state.save.settings.reducedEffects || state.save.settings.quality === 'low');

  const data = useMemo(() => {
    const lines = Array.from({ length: LINE_COUNT }, (_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (4.6 + (i % 5) * 0.85),
      y: 0.8 + ((i * 37) % 100) / 100 * 6.5,
      z: (i * 53) % 140,
      len: 1 + ((i * 17) % 10) / 10 * 1.6
    }));
    const embers = Array.from({ length: EMBER_COUNT }, (_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (5.2 + ((i * 29) % 100) / 100 * 2.2),
      z: (i * 41) % 120,
      phase: (i * 0.61) % (Math.PI * 2),
      rate: 0.5 + ((i * 13) % 10) / 10 * 0.8
    }));
    const sparks = Array.from({ length: SPARK_COUNT }, (_, i) => {
      const a = (i / SPARK_COUNT) * Math.PI * 2;
      return { dx: Math.cos(a), dy: Math.sin(a) * 0.8 + 0.6, dz: -0.4 };
    });
    return { lines, embers, sparks };
  }, []);

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3() }),
    []
  );
  const burst = useRef({ t: 99, x: 0, y: 0 });
  const prevCoins = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    // ---- speed lines ----
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

    // ---- embers / steam ----
    const embers = embersRef.current;
    if (embers) {
      for (let i = 0; i < EMBER_COUNT; i += 1) {
        const ember = data.embers[i];
        if (reduced && i % 2 === 0) {
          embers.setMatrixAt(i, HIDDEN);
          continue;
        }
        const span = 120;
        const z = ((ember.z - sim.distance) % span + span) % span - 10;
        const cycle = (t * ember.rate + ember.phase) % 1;
        const y = 1.2 + cycle * 4.5;
        const sway = Math.sin(t * 2 + ember.phase * 5) * 0.35;
        const scale = (1 - cycle) * 0.16 + 0.03;
        tmp.p.set(ember.x + sway, y, z);
        tmp.q.identity();
        tmp.s.setScalar(scale);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        embers.setMatrixAt(i, tmp.m);
      }
      embers.instanceMatrix.needsUpdate = true;
    }

    // ---- coin burst sparks ----
    const sparks = sparksRef.current;
    if (sparks) {
      if (sim.runCoins > prevCoins.current && sim.running) {
        burst.current = { t: 0, x: sim.laneX, y: 1.0 + sim.playerY };
      }
      prevCoins.current = sim.runCoins;
      burst.current.t += dt;
      const life = burst.current.t;
      const DURATION = 0.45;
      for (let i = 0; i < SPARK_COUNT; i += 1) {
        if (life > DURATION) {
          sparks.setMatrixAt(i, HIDDEN);
          continue;
        }
        const s = data.sparks[i];
        const r = life * 4.2;
        tmp.p.set(burst.current.x + s.dx * r, burst.current.y + s.dy * r - life * life * 6, s.dz * r);
        tmp.q.identity();
        tmp.s.setScalar(0.09 * (1 - life / DURATION));
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        sparks.setMatrixAt(i, tmp.m);
      }
      sparks.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={linesRef} args={[undefined, undefined, LINE_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.035, 0.035, 1]} />
        <meshBasicMaterial color="#7fe8ff" transparent opacity={0.4} />
      </instancedMesh>
      <instancedMesh ref={embersRef} args={[undefined, undefined, EMBER_COUNT]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshBasicMaterial color="#ffae3d" transparent opacity={0.65} />
      </instancedMesh>
      <instancedMesh ref={sparksRef} args={[undefined, undefined, SPARK_COUNT]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshBasicMaterial color="#ffe58a" transparent opacity={0.9} />
      </instancedMesh>
    </group>
  );
}
