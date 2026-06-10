import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sim } from '../../game/engine';
import { laneX } from '../../game/math';
import type { ObstacleEntity, ObstacleKind } from '../../game/types';

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
}

function useObstacleMats(): ObstacleMats {
  return useMemo(
    () => ({
      rollerMeat: new THREE.MeshStandardMaterial({ color: '#8c1d14', roughness: 0.55, emissive: '#5a0c06', emissiveIntensity: 0.5 }),
      rollerCore: new THREE.MeshStandardMaterial({ color: '#caa84d', metalness: 0.9, roughness: 0.25, emissive: '#7a5a10', emissiveIntensity: 0.4 }),
      spike: new THREE.MeshStandardMaterial({ color: '#d8dde8', metalness: 0.95, roughness: 0.15 }),
      crate: new THREE.MeshStandardMaterial({ color: '#2b303a', metalness: 0.7, roughness: 0.3 }),
      crateStripe: new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#caa20e', emissiveIntensity: 0.8 }),
      crateGlow: new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff5a0a', emissiveIntensity: 1.6 }),
      flameOuter: new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff5a0a', emissiveIntensity: 2.8, transparent: true, opacity: 0.85 }),
      flameInner: new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#ffcf2e', emissiveIntensity: 3.2, transparent: true, opacity: 0.9 }),
      grate: new THREE.MeshStandardMaterial({ color: '#14171d', metalness: 0.85, roughness: 0.3 }),
      gateFrame: new THREE.MeshStandardMaterial({ color: '#243044', metalness: 0.8, roughness: 0.25, emissive: '#0c3b4a', emissiveIntensity: 0.6 }),
      gateBeam: new THREE.MeshStandardMaterial({ color: '#24d6ff', emissive: '#24d6ff', emissiveIntensity: 2.6, transparent: true, opacity: 0.85 }),
      armMetal: new THREE.MeshStandardMaterial({ color: '#c88723', metalness: 0.75, roughness: 0.25 }),
      armPad: new THREE.MeshStandardMaterial({ color: '#2a3442', metalness: 0.9, roughness: 0.2, emissive: '#24d6ff', emissiveIntensity: 0.4 }),
      warn: new THREE.MeshStandardMaterial({ color: '#ff2f2f', emissive: '#ff1f1f', emissiveIntensity: 1.8 })
    }),
    []
  );
}

/* ----------------------- obstacle models ----------------------- */

function MeatRollerModel({ mats }: { mats: ObstacleMats }) {
  const spikes = useMemo(() => {
    const list: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    for (let ring = 0; ring < 3; ring += 1) {
      const x = (ring - 1) * 0.55;
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2 + ring * 0.45;
        list.push({ pos: [x, Math.sin(a) * 0.52, Math.cos(a) * 0.52], rot: [a + Math.PI / 2, 0, 0] });
      }
    }
    return list;
  }, []);
  return (
    <group>
      <group userData={{ anim: 'spin' }} position={[0, 0.55, 0]}>
        <mesh material={mats.rollerMeat} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.55, 0.55, 1.85, 16]} />
        </mesh>
        {spikes.map((s, i) => (
          <mesh key={i} material={mats.spike} position={s.pos} rotation={s.rot}>
            <coneGeometry args={[0.07, 0.3, 5]} />
          </mesh>
        ))}
      </group>
      {[-1.0, 1.0].map((x) => (
        <mesh key={x} material={mats.rollerCore} position={[x, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 0.18, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function HotCrateModel({ mats }: { mats: ObstacleMats }) {
  return (
    <group>
      <mesh material={mats.crate} position={[0, 0.75, 0]}>
        <boxGeometry args={[1.7, 1.5, 1.5]} />
      </mesh>
      <mesh material={mats.crateStripe} position={[0, 1.28, -0.76]}>
        <boxGeometry args={[1.5, 0.18, 0.02]} />
      </mesh>
      <mesh material={mats.crateStripe} position={[0, 0.22, -0.76]}>
        <boxGeometry args={[1.5, 0.18, 0.02]} />
      </mesh>
      <mesh material={mats.crateGlow} position={[0, 1.52, 0]}>
        <boxGeometry args={[1.6, 0.06, 1.4]} />
      </mesh>
      <Text position={[0, 0.86, -0.77]} rotation={[0, Math.PI, 0]} fontSize={0.2} anchorX="center" anchorY="middle" color="#ffd84d" outlineWidth={0.012} outlineColor="#000000" textAlign="center">
        {'CAUTION\nHOT SURFACE'}
      </Text>
    </group>
  );
}

function GrillFlameModel({ mats }: { mats: ObstacleMats }) {
  return (
    <group>
      <mesh material={mats.grate} position={[0, 0.1, 0]}>
        <boxGeometry args={[1.8, 0.2, 1.4]} />
      </mesh>
      <mesh material={mats.warn} position={[0, 0.21, -0.6]}>
        <boxGeometry args={[1.6, 0.04, 0.1]} />
      </mesh>
      <mesh userData={{ anim: 'flameA' }} material={mats.flameOuter} position={[0, 0.95, 0]}>
        <coneGeometry args={[0.55, 1.6, 10]} />
      </mesh>
      <mesh userData={{ anim: 'flameB' }} material={mats.flameInner} position={[0, 0.75, 0]}>
        <coneGeometry args={[0.32, 1.1, 8]} />
      </mesh>
    </group>
  );
}

function SauceGateModel({ mats }: { mats: ObstacleMats }) {
  return (
    <group>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} material={mats.gateFrame} position={[x, 0.9, 0]}>
          <boxGeometry args={[0.22, 1.8, 0.26]} />
        </mesh>
      ))}
      <mesh material={mats.gateFrame} position={[0, 1.85, 0]}>
        <boxGeometry args={[2.1, 0.24, 0.3]} />
      </mesh>
      <mesh material={mats.gateBeam} position={[0, 1.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 1.9, 8]} />
      </mesh>
      <mesh material={mats.gateBeam} position={[0, 1.45, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 1.9, 8]} />
      </mesh>
    </group>
  );
}

function PressArmModel({ mats }: { mats: ObstacleMats }) {
  return (
    <group>
      <mesh material={mats.gateFrame} position={[0, 1.95, 0]}>
        <boxGeometry args={[2.0, 0.26, 0.4]} />
      </mesh>
      <group userData={{ anim: 'pad' }} position={[0, 1.4, 0]}>
        <mesh material={mats.armMetal}>
          <boxGeometry args={[0.4, 0.7, 0.4]} />
        </mesh>
        <mesh material={mats.armPad} position={[0, -0.5, 0]}>
          <boxGeometry args={[1.5, 0.32, 1.1]} />
        </mesh>
        <mesh material={mats.warn} position={[0, -0.5, -0.56]}>
          <boxGeometry args={[1.3, 0.1, 0.02]} />
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
        </group>
      ))}
    </group>
  );
}

const KINDS: ObstacleKind[] = ['meatRoller', 'hotCrate', 'grillFlame', 'sauceGate', 'pressArm'];

export function Obstacles() {
  const mats = useObstacleMats();
  const registry = useRef(new Map<ObstacleKind, SlotHandles[]>());
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
        slot.root.position.set(laneX(entity.lane), 0, entity.z);
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
          slot.pad.position.y = 1.45 + Math.sin(t * 4 + entity.seed) * 0.12;
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
