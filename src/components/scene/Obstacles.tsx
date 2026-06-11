import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { bendPoint, sim, type BendOut } from '../../game/engine';
import { laneX } from '../../game/math';
import type { ObstacleEntity, ObstacleKind } from '../../game/types';
import { cautionStripeTexture } from './textures';

/**
 * Fixed pools of pre-mounted obstacle models. Nothing mounts or unmounts
 * during a run — each frame, live entities of a kind are assigned to that
 * kind's slots and everything else is hidden. This removes the GPU
 * geometry-upload stalls that React mount/unmount caused on every spawn.
 */

const POOL_SIZES: Record<ObstacleKind, number> = {
  meatRoller: 9,
  hotCrate: 9,
  grillFlame: 9,
  sauceGate: 7,
  pressArm: 7
};

interface ObstacleMats {
  rollerMeat: THREE.MeshStandardMaterial;
  rollerCore: THREE.MeshStandardMaterial;
  spike: THREE.MeshStandardMaterial;
  crate: THREE.MeshStandardMaterial;
  crateStripe: THREE.MeshStandardMaterial;
  crateGlow: THREE.MeshStandardMaterial;
  flameOuter: THREE.MeshStandardMaterial;
  flameInner: THREE.MeshStandardMaterial;
  grate: THREE.MeshStandardMaterial;
  gateFrame: THREE.MeshStandardMaterial;
  gateBeam: THREE.MeshStandardMaterial;
  armMetal: THREE.MeshStandardMaterial;
  armPad: THREE.MeshStandardMaterial;
  warn: THREE.MeshStandardMaterial;
  warnRing: THREE.MeshBasicMaterial;
}

function useObstacleMats(): ObstacleMats {
  return useMemo(
    () => ({
      rollerMeat: new THREE.MeshStandardMaterial({ color: '#8c1d14', roughness: 0.55, emissive: '#5a0c06', emissiveIntensity: 0.5 }),
      rollerCore: new THREE.MeshStandardMaterial({ color: '#caa84d', metalness: 0.9, roughness: 0.25, emissive: '#7a5a10', emissiveIntensity: 0.4 }),
      spike: new THREE.MeshStandardMaterial({ color: '#d8dde8', metalness: 0.95, roughness: 0.15 }),
      crate: new THREE.MeshStandardMaterial({ color: '#2b303a', metalness: 0.7, roughness: 0.3 }),
      crateStripe: new THREE.MeshStandardMaterial({
        map: cautionStripeTexture(),
        color: '#ffffff',
        emissive: '#9a7a0e',
        emissiveIntensity: 0.45,
        metalness: 0.3,
        roughness: 0.5
      }),
      crateGlow: new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff5a0a', emissiveIntensity: 1.6 }),
      flameOuter: new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff5a0a', emissiveIntensity: 2.8, transparent: true, opacity: 0.85 }),
      flameInner: new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#ffcf2e', emissiveIntensity: 3.2, transparent: true, opacity: 0.9 }),
      grate: new THREE.MeshStandardMaterial({ color: '#14171d', metalness: 0.85, roughness: 0.3 }),
      gateFrame: new THREE.MeshStandardMaterial({ color: '#2e2430', metalness: 0.8, roughness: 0.25, emissive: '#3b0c14', emissiveIntensity: 0.7 }),
      // hazard color language: anything that can kill you glows RED
      gateBeam: new THREE.MeshStandardMaterial({ color: '#ff3b2a', emissive: '#ff2212', emissiveIntensity: 2.8, transparent: true, opacity: 0.9 }),
      armMetal: new THREE.MeshStandardMaterial({ color: '#c88723', metalness: 0.75, roughness: 0.25 }),
      armPad: new THREE.MeshStandardMaterial({ color: '#2a3442', metalness: 0.9, roughness: 0.2, emissive: '#ff2212', emissiveIntensity: 0.55 }),
      warn: new THREE.MeshStandardMaterial({ color: '#ff2f2f', emissive: '#ff1f1f', emissiveIntensity: 1.8 }),
      warnRing: new THREE.MeshBasicMaterial({ color: '#ff3b2a', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
    }),
    []
  );
}

/* ----------------------- obstacle models ----------------------- */

/** Spiked meat roller — big as a barrel, jump over it. */
function MeatRollerModel({ mats }: { mats: ObstacleMats }) {
  const spikes = useMemo(() => {
    const list: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    for (let ring = 0; ring < 4; ring += 1) {
      const x = (ring - 1.5) * 0.56;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + ring * 0.4;
        list.push({ pos: [x, Math.sin(a) * 0.66, Math.cos(a) * 0.66], rot: [a + Math.PI / 2, 0, 0] });
      }
    }
    return list;
  }, []);
  return (
    <group>
      <group userData={{ anim: 'spin' }} position={[0, 0.68, 0]}>
        <mesh material={mats.rollerMeat} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.68, 0.68, 2.2, 18]} />
        </mesh>
        {spikes.map((s, i) => (
          <mesh key={i} material={mats.spike} position={s.pos} rotation={s.rot}>
            <coneGeometry args={[0.09, 0.38, 5]} />
          </mesh>
        ))}
      </group>
      {[-1.18, 1.18].map((x) => (
        <mesh key={x} material={mats.rollerCore} position={[x, 0.68, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.2, 10]} />
        </mesh>
      ))}
    </group>
  );
}

/** Hot fryer crate — full lane-blocker, taller than a jump. Change lanes! */
function HotCrateModel({ mats }: { mats: ObstacleMats }) {
  return (
    <group>
      <mesh material={mats.crate} position={[0, 0.95, 0]}>
        <boxGeometry args={[2.1, 1.9, 1.6]} />
      </mesh>
      {/* caution stripe bands wrapping the crate */}
      <mesh material={mats.crateStripe} position={[0, 1.68, 0]}>
        <boxGeometry args={[2.14, 0.28, 1.64]} />
      </mesh>
      <mesh material={mats.crateStripe} position={[0, 0.2, 0]}>
        <boxGeometry args={[2.14, 0.28, 1.64]} />
      </mesh>
      <mesh material={mats.crateGlow} position={[0, 1.92, 0]}>
        <boxGeometry args={[2.0, 0.07, 1.5]} />
      </mesh>
      {/* fire licking off the top — flicker tags reuse the flame animator */}
      <mesh userData={{ anim: 'flameA' }} material={mats.flameOuter} position={[-0.4, 2.45, 0]}>
        <coneGeometry args={[0.45, 1.1, 9]} />
      </mesh>
      <mesh userData={{ anim: 'flameB' }} material={mats.flameInner} position={[0.45, 2.3, 0.15]}>
        <coneGeometry args={[0.3, 0.8, 7]} />
      </mesh>
      <Text position={[0, 1.05, -0.83]} rotation={[0, Math.PI, 0]} fontSize={0.26} anchorX="center" anchorY="middle" color="#ffd84d" outlineWidth={0.016} outlineColor="#000000" textAlign="center">
        {'CAUTION\nHOT SURFACE'}
      </Text>
    </group>
  );
}

function GrillFlameModel({ mats }: { mats: ObstacleMats }) {
  return (
    <group>
      <mesh material={mats.grate} position={[0, 0.1, 0]}>
        <boxGeometry args={[2.3, 0.22, 1.5]} />
      </mesh>
      <mesh material={mats.warn} position={[0, 0.23, -0.65]}>
        <boxGeometry args={[2.1, 0.05, 0.1]} />
      </mesh>
      <mesh userData={{ anim: 'flameA' }} material={mats.flameOuter} position={[0, 1.05, 0]}>
        <coneGeometry args={[0.75, 1.8, 11]} />
      </mesh>
      <mesh userData={{ anim: 'flameB' }} material={mats.flameInner} position={[0, 0.85, 0]}>
        <coneGeometry args={[0.45, 1.3, 9]} />
      </mesh>
    </group>
  );
}

/**
 * Sauce pipe — SLIDE UNDER. A fat ketchup pipe spanning the whole lane at
 * head height with sauce dripping off it; the open gap underneath reads
 * instantly as "duck here".
 */
function SauceGateModel({ mats }: { mats: ObstacleMats }) {
  return (
    <group>
      {/* chunky side posts */}
      {[-1.18, 1.18].map((x) => (
        <mesh key={x} material={mats.gateFrame} position={[x, 1.05, 0]}>
          <boxGeometry args={[0.34, 2.1, 0.4]} />
        </mesh>
      ))}
      {/* the fat sauce pipe — head height, full lane width */}
      <mesh material={mats.rollerMeat} position={[0, 1.72, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.34, 0.34, 2.65, 16]} />
      </mesh>
      {/* valve wheel on top */}
      <mesh material={mats.spike} position={[0, 2.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.05, 8, 16]} />
      </mesh>
      {/* sauce drips hanging into the gap */}
      {[-0.7, -0.15, 0.45, 0.95].map((x, i) => (
        <mesh key={x} material={mats.gateBeam} position={[x, 1.36 - (i % 2) * 0.14, 0]}>
          <cylinderGeometry args={[0.07, 0.045, 0.34 + (i % 2) * 0.18, 6]} />
        </mesh>
      ))}
      {/* glowing red underside — the danger edge you slide beneath */}
      <mesh material={mats.warn} position={[0, 1.38, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 2.5, 8]} />
      </mesh>
    </group>
  );
}

/**
 * Spatula press — SLIDE UNDER. A giant steel spatula blade hangs from a
 * gantry down to head height, bobbing; clear floor gap below.
 */
function PressArmModel({ mats }: { mats: ObstacleMats }) {
  return (
    <group>
      {/* overhead gantry */}
      <mesh material={mats.gateFrame} position={[0, 2.5, 0]}>
        <boxGeometry args={[2.6, 0.3, 0.5]} />
      </mesh>
      {[-1.22, 1.22].map((x) => (
        <mesh key={x} material={mats.gateFrame} position={[x, 1.3, 0]}>
          <boxGeometry args={[0.26, 2.6, 0.34]} />
        </mesh>
      ))}
      <group userData={{ anim: 'pad' }} position={[0, 2.0, 0]}>
        {/* handle shaft */}
        <mesh material={mats.armMetal} position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.9, 8]} />
        </mesh>
        {/* the giant blade — full lane width, slotted like a real spatula */}
        <mesh material={mats.spike} position={[0, -0.42, 0]}>
          <boxGeometry args={[2.3, 0.85, 0.14]} />
        </mesh>
        {[-0.55, 0, 0.55].map((x) => (
          <mesh key={x} material={mats.gateFrame} position={[x, -0.42, 0]}>
            <boxGeometry args={[0.12, 0.65, 0.16]} />
          </mesh>
        ))}
        {/* red-hot bottom edge */}
        <mesh material={mats.warn} position={[0, -0.88, 0]}>
          <boxGeometry args={[2.34, 0.1, 0.18]} />
        </mesh>
      </group>
    </group>
  );
}

/* ----------------------- pooling ----------------------- */

interface SlotHandles {
  root: THREE.Group;
  spin: THREE.Object3D | null;
  flameA: THREE.Object3D | null;
  flameB: THREE.Object3D | null;
  pad: THREE.Object3D | null;
}

function collectHandles(root: THREE.Group): SlotHandles {
  const handles: SlotHandles = { root, spin: null, flameA: null, flameB: null, pad: null };
  root.traverse((obj) => {
    const tag = (obj.userData as { anim?: string }).anim;
    if (tag === 'spin') handles.spin = obj;
    if (tag === 'flameA') handles.flameA = obj;
    if (tag === 'flameB') handles.flameB = obj;
    if (tag === 'pad') handles.pad = obj;
  });
  return handles;
}

function PooledKind({
  kind,
  mats,
  registry
}: {
  kind: ObstacleKind;
  mats: ObstacleMats;
  registry: React.MutableRefObject<Map<ObstacleKind, SlotHandles[]>>;
}) {
  const size = POOL_SIZES[kind];
  const Model =
    kind === 'meatRoller'
      ? MeatRollerModel
      : kind === 'hotCrate'
        ? HotCrateModel
        : kind === 'grillFlame'
          ? GrillFlameModel
          : kind === 'sauceGate'
            ? SauceGateModel
            : PressArmModel;

  return (
    <group>
      {Array.from({ length: size }, (_, i) => (
        <group
          key={i}
          visible={false}
          ref={(el) => {
            if (!el) return;
            const slots = registry.current.get(kind) ?? [];
            if (!slots.some((s) => s.root === el)) {
              slots[i] = collectHandles(el);
              registry.current.set(kind, slots);
            }
          }}
        >
          <Model mats={mats} />
          {/* red telegraph ring on the track — instant hazard read */}
          <mesh material={mats.warnRing} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[0.72, 1.08, 24]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const KINDS: ObstacleKind[] = ['meatRoller', 'hotCrate', 'grillFlame', 'sauceGate', 'pressArm'];

export function Obstacles() {
  const mats = useObstacleMats();
  const registry = useRef(new Map<ObstacleKind, SlotHandles[]>());
  const bendScratch = useRef<BendOut>({ x: 0, z: 0, yaw: 0 });
  const byKind = useMemo(() => {
    const map = new Map<ObstacleKind, ObstacleEntity[]>();
    for (const kind of KINDS) map.set(kind, []);
    return map;
  }, []);

  useFrame((state, dt) => {
    // bucket live entities by kind
    for (const kind of KINDS) byKind.get(kind)!.length = 0;
    for (const o of sim.obstacles) {
      if (o.active) byKind.get(o.kind)!.push(o);
    }
    const t = state.clock.elapsedTime;

    for (const kind of KINDS) {
      const slots = registry.current.get(kind);
      if (!slots) continue;
      const live = byKind.get(kind)!;
      for (let i = 0; i < slots.length; i += 1) {
        const slot = slots[i];
        if (!slot) continue;
        const entity = live[i];
        if (!entity) {
          slot.root.visible = false;
          continue;
        }
        slot.root.visible = true;
        const bend = bendPoint(laneX(entity.lane), entity.z, bendScratch.current);
        slot.root.position.set(bend.x, 0, bend.z);
        slot.root.rotation.y = bend.yaw;
        if (slot.spin) slot.spin.rotation.x += dt * sim.worldSpeed * 0.8;
        if (slot.flameA) {
          const f = 0.8 + Math.abs(Math.sin(t * 11 + entity.seed)) * 0.5;
          slot.flameA.scale.set(f, 0.7 + Math.abs(Math.sin(t * 14 + entity.seed)) * 0.6, f);
        }
        if (slot.flameB) {
          const f = 0.75 + Math.abs(Math.sin(t * 16 + entity.seed * 2)) * 0.5;
          slot.flameB.scale.set(f, f, f);
        }
        if (slot.pad) {
          slot.pad.position.y = 2.0 + Math.sin(t * 4 + entity.seed) * 0.1;
        }
      }
    }
  });

  return (
    <group>
      {KINDS.map((kind) => (
        <PooledKind key={kind} kind={kind} mats={mats} registry={registry} />
      ))}
    </group>
  );
}
