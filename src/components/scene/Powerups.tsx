import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { bendPoint, sim, type BendOut } from '../../game/engine';
import { laneX } from '../../game/math';
import type { PowerupEntity, PowerupType } from '../../game/types';

const COLORS: Record<PowerupType, string> = {
  magnet: '#ff4a4a',
  shield: '#24d6ff',
  speedBoost: '#67ff72',
  doubleCoins: '#ffd84d'
};

const TYPES: PowerupType[] = ['magnet', 'shield', 'speedBoost', 'doubleCoins'];
const SLOTS_PER_TYPE = 3;

function PickupModel({ type }: { type: PowerupType }) {
  const color = COLORS[type];
  const glow = useMemo(
    () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.2 }),
    [color]
  );
  const accent = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f5f8ff', emissive: '#ffffff', emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.25 }),
    []
  );
  const ring = useMemo(
    () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2, transparent: true, opacity: 0.75 }),
    [color]
  );

  return (
    <group>
      {type === 'magnet' && (
        <group rotation={[0, 0, Math.PI]}>
          <mesh material={glow}>
            <torusGeometry args={[0.34, 0.13, 8, 18, Math.PI]} />
          </mesh>
          {[-0.34, 0.34].map((x) => (
            <group key={x}>
              <mesh material={glow} position={[x, 0.18, 0]}>
                <cylinderGeometry args={[0.13, 0.13, 0.36, 8]} />
              </mesh>
              <mesh material={accent} position={[x, 0.4, 0]}>
                <cylinderGeometry args={[0.135, 0.135, 0.12, 8]} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {type === 'shield' && (
        <group>
          <mesh material={glow}>
            <cylinderGeometry args={[0.42, 0.06, 0.75, 6, 1]} />
          </mesh>
          <mesh material={accent} position={[0, 0.12, 0]} scale={[0.55, 0.45, 1.2]}>
            <sphereGeometry args={[0.3, 8, 6]} />
          </mesh>
        </group>
      )}
      {type === 'speedBoost' && (
        <group>
          <mesh material={glow} position={[0.08, 0.2, 0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.22, 0.55, 0.16]} />
          </mesh>
          <mesh material={glow} position={[-0.08, -0.2, 0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.22, 0.55, 0.16]} />
          </mesh>
          <mesh material={accent} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.3, 0.18, 0.18]} />
          </mesh>
        </group>
      )}
      {type === 'doubleCoins' && (
        <group>
          <mesh material={glow} rotation={[Math.PI / 2, 0, 0]} position={[-0.12, -0.05, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.09, 16]} />
          </mesh>
          <mesh material={glow} rotation={[Math.PI / 2, 0, 0.3]} position={[0.14, 0.12, 0.08]}>
            <cylinderGeometry args={[0.32, 0.32, 0.09, 16]} />
          </mesh>
          <mesh material={accent} rotation={[Math.PI / 2, 0, 0.3]} position={[0.14, 0.12, 0.14]}>
            <torusGeometry args={[0.2, 0.025, 6, 14]} />
          </mesh>
        </group>
      )}
      {/* halo ring */}
      <mesh material={ring} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <torusGeometry args={[0.55, 0.035, 8, 24]} />
      </mesh>
    </group>
  );
}

export function Powerups() {
  const slotRefs = useRef(new Map<PowerupType, (THREE.Group | null)[]>());
  const bendScratch = useRef<BendOut>({ x: 0, z: 0, yaw: 0 });
  const buckets = useMemo(() => {
    const map = new Map<PowerupType, PowerupEntity[]>();
    for (const type of TYPES) map.set(type, []);
    return map;
  }, []);

  useFrame((state) => {
    for (const type of TYPES) buckets.get(type)!.length = 0;
    for (const p of sim.pickups) {
      if (p.active) buckets.get(p.type)!.push(p);
    }
    const t = state.clock.elapsedTime;
    for (const type of TYPES) {
      const slots = slotRefs.current.get(type);
      if (!slots) continue;
      const live = buckets.get(type)!;
      for (let i = 0; i < slots.length; i += 1) {
        const slot = slots[i];
        if (!slot) continue;
        const entity = live[i];
        if (!entity) {
          slot.visible = false;
          continue;
        }
        slot.visible = true;
        const bend = bendPoint(laneX(entity.lane), entity.z, bendScratch.current);
        slot.position.set(bend.x, 1.35 + Math.sin(t * 2.4 + entity.id) * 0.12, bend.z);
        slot.rotation.y = t * 2.2 + bend.yaw;
      }
    }
  });

  return (
    <group>
      {TYPES.map((type) => (
        <group key={type}>
          {Array.from({ length: SLOTS_PER_TYPE }, (_, i) => (
            <group
              key={i}
              visible={false}
              ref={(el) => {
                const slots = slotRefs.current.get(type) ?? [];
                slots[i] = el;
                slotRefs.current.set(type, slots);
              }}
            >
              <PickupModel type={type} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
