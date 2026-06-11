import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { bendPoint, sim, type BendOut } from '../../game/engine';

const SEG_LEN = 12;
const SEG_COUNT = 14;
const SPAN = SEG_LEN * SEG_COUNT;
const BEHIND = 26;
const TILE_WORLD = 1.2;
const TILES_PER_REPEAT = 4;

const SEAM_SPACING = 3;
const SEAM_COUNT = Math.ceil(SPAN / SEAM_SPACING);
const DASH_SPACING = 4.5;
const DASH_PER_LANE = Math.ceil(SPAN / DASH_SPACING);
const DASH_COUNT = DASH_PER_LANE * 3;
const CHEV_SPACING = 3.4;
const CHEV_PER_RAIL = Math.ceil(SPAN / CHEV_SPACING);
const CHEV_COUNT = CHEV_PER_RAIL * 2;

/**
 * The track as 12m segments that wrap around the player AND bend through
 * corners: each segment maps its origin through bendPoint, so segments past
 * an upcoming corner physically lie along the new 90° leg. Glossy PBR floor
 * (HDRI sheen) — a mirror pass can't bend, corners are worth the trade.
 */
export function FactoryTrack() {
  const segRefs = useRef<(THREE.Group | null)[]>([]);
  const seamsRef = useRef<THREE.InstancedMesh>(null);
  const dashesRef = useRef<THREE.InstancedMesh>(null);
  const chevsRef = useRef<THREE.InstancedMesh>(null);

  const [tileDiff, tileNor, tileRough] = useTexture([
    '/textures/floor/floor_tiles_06_diff_1k.jpg',
    '/textures/floor/floor_tiles_06_nor_gl_1k.jpg',
    '/textures/floor/floor_tiles_06_rough_1k.jpg'
  ]);

  /* eslint-disable react-hooks/immutability -- one-time texture configuration */
  useMemo(() => {
    for (const tex of [tileDiff, tileNor, tileRough]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(8.6 / (TILE_WORLD * TILES_PER_REPEAT), SEG_LEN / (TILE_WORLD * TILES_PER_REPEAT));
      tex.anisotropy = 8;
    }
    tileDiff.colorSpace = THREE.SRGBColorSpace;
  }, [tileDiff, tileNor, tileRough]);
  /* eslint-enable react-hooks/immutability */

  const mats = useMemo(
    () => ({
      deck: new THREE.MeshStandardMaterial({
        map: tileDiff,
        normalMap: tileNor,
        roughnessMap: tileRough,
        color: '#6b7585',
        metalness: 0.45,
        roughness: 0.9,
        envMapIntensity: 1.35
      }),
      rail: new THREE.MeshStandardMaterial({ color: '#272019', metalness: 0.7, roughness: 0.3 }),
      laneLight: new THREE.MeshStandardMaterial({ color: '#24d6ff', emissive: '#24d6ff', emissiveIntensity: 2.0 }),
      railGlow: new THREE.MeshStandardMaterial({ color: '#ffbf3f', emissive: '#ff9a1f', emissiveIntensity: 2.2 }),
      skirt: new THREE.MeshStandardMaterial({ color: '#05070b', metalness: 0.4, roughness: 0.6 })
    }),
    [tileDiff, tileNor, tileRough]
  );

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      s: new THREE.Vector3(1, 1, 1),
      bend: { x: 0, z: 0, yaw: 0 } as BendOut
    }),
    []
  );

  useFrame(() => {
    const wrap = (base: number, span: number) => ((base - sim.distance) % span + span) % span - BEHIND;
    const { bend } = tmp;

    // ---- segments (origin at segment START, so the whole slab bends as a unit) ----
    for (let i = 0; i < SEG_COUNT; i += 1) {
      const group = segRefs.current[i];
      if (!group) continue;
      const z = wrap(i * SEG_LEN, SPAN);
      bendPoint(0, z, bend);
      group.position.set(bend.x, 0, bend.z);
      group.rotation.y = bend.yaw;
      // hide the segment that straddles the corner pivot — the corner
      // platform covers that elbow
      const corner = sim.corners[0];
      group.visible = !(corner && z < corner.z && z + SEG_LEN > corner.z);
    }

    // ---- instanced details, bent per instance ----
    const seams = seamsRef.current;
    if (seams) {
      const span = SEAM_COUNT * SEAM_SPACING;
      for (let i = 0; i < SEAM_COUNT; i += 1) {
        bendPoint(0, wrap(i * SEAM_SPACING, span), bend);
        tmp.p.set(bend.x, 0.028, bend.z);
        tmp.e.set(0, bend.yaw, 0);
        tmp.q.setFromEuler(tmp.e);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        seams.setMatrixAt(i, tmp.m);
      }
      seams.instanceMatrix.needsUpdate = true;
    }

    const dashes = dashesRef.current;
    if (dashes) {
      const span = DASH_PER_LANE * DASH_SPACING;
      let idx = 0;
      for (let lane = 0; lane < 3; lane += 1) {
        const x = (lane - 1) * 2.4;
        for (let i = 0; i < DASH_PER_LANE; i += 1) {
          bendPoint(x, wrap(i * DASH_SPACING + lane * 1.5, span), bend);
          tmp.p.set(bend.x, 0.032, bend.z);
          tmp.e.set(0, bend.yaw, 0);
          tmp.q.setFromEuler(tmp.e);
          tmp.m.compose(tmp.p, tmp.q, tmp.s);
          dashes.setMatrixAt(idx, tmp.m);
          idx += 1;
        }
      }
      dashes.instanceMatrix.needsUpdate = true;
    }

    const chevs = chevsRef.current;
    if (chevs) {
      const span = CHEV_PER_RAIL * CHEV_SPACING;
      let idx = 0;
      for (let side = 0; side < 2; side += 1) {
        const x = side === 0 ? -4.05 : 4.05;
        for (let i = 0; i < CHEV_PER_RAIL; i += 1) {
          bendPoint(x, wrap(i * CHEV_SPACING, span), bend);
          tmp.p.set(bend.x, 0.22, bend.z);
          tmp.e.set(-Math.PI / 2, bend.yaw, side === 0 ? -0.6 : 0.6, 'YXZ');
          tmp.q.setFromEuler(tmp.e);
          tmp.m.compose(tmp.p, tmp.q, tmp.s);
          chevs.setMatrixAt(idx, tmp.m);
          idx += 1;
        }
      }
      chevs.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {Array.from({ length: SEG_COUNT }, (_, i) => (
        <group key={i} ref={(el) => (segRefs.current[i] = el)}>
          {/* deck slab — origin at segment start */}
          <mesh material={mats.deck} position={[0, -0.1, SEG_LEN / 2]}>
            <boxGeometry args={[8.6, 0.2, SEG_LEN]} />
          </mesh>
          {/* cyan lane divider strips */}
          {[-1.25, 1.25].map((x) => (
            <mesh key={`d${x}`} material={mats.laneLight} position={[x, 0.035, SEG_LEN / 2]}>
              <boxGeometry args={[0.07, 0.03, SEG_LEN]} />
            </mesh>
          ))}
          {/* edge rails + amber glow */}
          {[-4.05, 4.05].map((x) => (
            <group key={x}>
              <mesh material={mats.rail} position={[x, 0.1, SEG_LEN / 2]}>
                <boxGeometry args={[0.5, 0.22, SEG_LEN]} />
              </mesh>
              <mesh material={mats.railGlow} position={[x + (x < 0 ? 0.27 : -0.27), 0.13, SEG_LEN / 2]}>
                <boxGeometry args={[0.06, 0.07, SEG_LEN]} />
              </mesh>
            </group>
          ))}
          {/* skirt */}
          <mesh material={mats.skirt} position={[0, -0.6, SEG_LEN / 2]}>
            <boxGeometry args={[8.0, 0.85, SEG_LEN]} />
          </mesh>
        </group>
      ))}

      {/* lane divider strips ride the segments? no — they need to bend too,
          so they are instanced dashes only; the long strips became dashes */}
      <instancedMesh ref={seamsRef} args={[undefined, undefined, SEAM_COUNT]} frustumCulled={false}>
        <boxGeometry args={[8.3, 0.012, 0.1]} />
        <meshStandardMaterial color="#39414f" metalness={0.85} roughness={0.2} />
      </instancedMesh>
      <instancedMesh ref={dashesRef} args={[undefined, undefined, DASH_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.018, 1.1]} />
        <meshStandardMaterial color="#9beaff" emissive="#24d6ff" emissiveIntensity={1.15} />
      </instancedMesh>
      <instancedMesh ref={chevsRef} args={[undefined, undefined, CHEV_COUNT]} frustumCulled={false}>
        <planeGeometry args={[0.34, 0.12]} />
        <meshStandardMaterial color="#ffd84d" emissive="#ffd84d" emissiveIntensity={1.5} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
