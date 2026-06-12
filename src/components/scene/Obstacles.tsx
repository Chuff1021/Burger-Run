import { useGLTF } from '@react-three/drei';
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

const OBSTACLE_MODELS: Record<ObstacleKind, string> = {
  meatRoller: '/models/obstacles/meat_roller.glb',
  hotCrate: '/models/obstacles/hot_crate.glb',
  grillFlame: '/models/obstacles/flame_grill.glb',
  sauceGate: '/models/obstacles/sauce_gate.glb',
  pressArm: '/models/obstacles/spatula_press.glb'
};
for (const url of Object.values(OBSTACLE_MODELS)) useGLTF.preload(url);

/** Normalizes a Meshy GLB: scale so the chosen axis hits target, grounded at y=0, centered. */
function useObstacleModel(kind: ObstacleKind, target: number, axis: 'x' | 'y' = 'y'): THREE.Group {
  const { scene } = useGLTF(OBSTACLE_MODELS[kind]);
  return useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = target / (axis === 'y' ? size.y : size.x);
    clone.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box2.getCenter(center);
    clone.position.set(-center.x, -box2.min.y, -center.z);
    return clone;
  }, [scene, target, axis, kind]);
}

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

/* ----------------------- obstacle models (Meshy GLBs) ----------------------- */

/** Spiked meat roller — jump over it. The whole model spins like a grinder. */
function MeatRollerModel({ mats }: { mats: ObstacleMats }) {
  const model = useObstacleModel('meatRoller', 2.3, 'x');
  return (
    <group>
      <group userData={{ anim: 'spin' }} position={[0, 0.7, 0]}>
        <group position={[0, -0.7, 0]}>
          <primitive object={model} />
        </group>
      </group>
      {/* menace glow under the spikes */}
      <mesh material={mats.flameOuter} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.2, 0.9, 18]} />
      </mesh>
    </group>
  );
}

/** Hot fryer cabinet — full lane-blocker. Fire animates on top. */
function HotCrateModel({ mats }: { mats: ObstacleMats }) {
  const model = useObstacleModel('hotCrate', 1.95, 'y');
  return (
    <group>
      <primitive object={model} />
      <mesh userData={{ anim: 'flameA' }} material={mats.flameOuter} position={[-0.35, 2.4, 0]}>
        <coneGeometry args={[0.45, 1.1, 9]} />
      </mesh>
      <mesh userData={{ anim: 'flameB' }} material={mats.flameInner} position={[0.4, 2.25, 0.12]}>
        <coneGeometry args={[0.3, 0.8, 7]} />
      </mesh>
    </group>
  );
}

/** Flame grill vent — jump the fire. */
function GrillFlameModel({ mats }: { mats: ObstacleMats }) {
  const model = useObstacleModel('grillFlame', 2.35, 'x');
  return (
    <group>
      <primitive object={model} />
      <mesh userData={{ anim: 'flameA' }} material={mats.flameOuter} position={[0, 1.0, 0]}>
        <coneGeometry args={[0.75, 1.8, 11]} />
      </mesh>
      <mesh userData={{ anim: 'flameB' }} material={mats.flameInner} position={[0, 0.8, 0]}>
        <coneGeometry args={[0.45, 1.3, 9]} />
      </mesh>
    </group>
  );
}

/** Sauce pipe gate — slide under the pipe. */
function SauceGateModel({ mats }: { mats: ObstacleMats }) {
  const model = useObstacleModel('sauceGate', 2.35, 'y');
  return (
    <group>
      <primitive object={model} />
      {/* glowing red underside marks the duck line */}
      <mesh material={mats.gateBeam} position={[0, 1.36, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 2.4, 8]} />
      </mesh>
    </group>
  );
}

/** Spatula press — slide under the hanging blade. */
function PressArmModel({ mats }: { mats: ObstacleMats }) {
  const model = useObstacleModel('pressArm', 2.7, 'y');
  return (
    <group>
      <primitive object={model} />
      <mesh material={mats.gateBeam} position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 2.3, 8]} />
      </mesh>
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
