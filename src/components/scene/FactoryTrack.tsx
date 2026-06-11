import { MeshReflectorMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sim } from '../../game/engine';
import { useRunnerStore } from '../../game/runnerStore';
import { floorTileTexture } from './textures';

const TRACK_LENGTH = 170;
const BEHIND = 26;
const TILE_WORLD = 1.2; // one floor tile ≈ 1.2m
const TILES_PER_REPEAT = 4;

const SEAM_SPACING = 3;
const SEAM_COUNT = Math.ceil(TRACK_LENGTH / SEAM_SPACING);
const DASH_SPACING = 4.5;
const DASH_PER_LANE = Math.ceil(TRACK_LENGTH / DASH_SPACING);
const DASH_COUNT = DASH_PER_LANE * 3;
const CHEV_SPACING = 3.4;
const CHEV_PER_RAIL = Math.ceil(TRACK_LENGTH / CHEV_SPACING);
const CHEV_COUNT = CHEV_PER_RAIL * 2;

/**
 * The conveyor track. The deck is a single reflective plane (wet kitchen
 * floor) with a scrolling tile texture; small glowing details (seams, lane
 * dashes, chevrons) are instanced and wrap around the player.
 */
export function FactoryTrack() {
  const seamsRef = useRef<THREE.InstancedMesh>(null);
  const dashesRef = useRef<THREE.InstancedMesh>(null);
  const chevsRef = useRef<THREE.InstancedMesh>(null);
  const quality = useRunnerStore((state) => state.save.settings.quality);

  const tiles = useMemo(() => {
    const tex = floorTileTexture();
    tex.repeat.set(8.6 / (TILE_WORLD * TILES_PER_REPEAT), TRACK_LENGTH / (TILE_WORLD * TILES_PER_REPEAT));
    return tex;
  }, []);

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(1, 1, 1) }),
    []
  );

  /* eslint-disable react-hooks/immutability -- imperative r3f per-frame updates */
  useFrame(() => {
    // scroll the tiles with travel
    tiles.offset.y = (sim.distance / (TILE_WORLD * TILES_PER_REPEAT)) % 1;

    const wrap = (base: number, span: number) => ((base - sim.distance) % span + span) % span - BEHIND;

    const seams = seamsRef.current;
    if (seams) {
      const span = SEAM_COUNT * SEAM_SPACING;
      for (let i = 0; i < SEAM_COUNT; i += 1) {
        tmp.p.set(0, 0.028, wrap(i * SEAM_SPACING, span));
        tmp.q.identity();
        tmp.s.set(1, 1, 1);
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
          tmp.p.set(x, 0.032, wrap(i * DASH_SPACING + lane * 1.5, span));
          tmp.q.identity();
          tmp.s.set(1, 1, 1);
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
          tmp.p.set(x, 0.22, wrap(i * CHEV_SPACING, span));
          tmp.e.set(-Math.PI / 2, 0, side === 0 ? -0.6 : 0.6);
          tmp.q.setFromEuler(tmp.e);
          tmp.s.set(1, 1, 1);
          tmp.m.compose(tmp.p, tmp.q, tmp.s);
          chevs.setMatrixAt(idx, tmp.m);
          idx += 1;
        }
      }
      chevs.instanceMatrix.needsUpdate = true;
    }
  });
  /* eslint-enable react-hooks/immutability */

  const mid = TRACK_LENGTH / 2 - BEHIND;

  return (
    <group>
      {/* wet reflective deck with scrolling tiles */}
      <mesh position={[0, 0, mid]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.6, TRACK_LENGTH]} />
        {quality === 'high' ? (
          <MeshReflectorMaterial
            map={tiles}
            color="#9aa4b8"
            resolution={512}
            mirror={0.45}
            mixStrength={2.6}
            mixBlur={0.9}
            blur={[280, 90]}
            depthScale={0.8}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            metalness={0.5}
            roughness={0.7}
          />
        ) : (
          <meshStandardMaterial map={tiles} color="#9aa4b8" metalness={0.6} roughness={0.4} />
        )}
      </mesh>

      {/* cyan lane divider light strips */}
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 0.035, mid]}>
          <boxGeometry args={[0.07, 0.03, TRACK_LENGTH]} />
          <meshStandardMaterial color="#24d6ff" emissive="#24d6ff" emissiveIntensity={2.4} />
        </mesh>
      ))}
      {/* edge rails + amber glow strips */}
      {[-4.05, 4.05].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.1, mid]}>
            <boxGeometry args={[0.5, 0.22, TRACK_LENGTH]} />
            <meshStandardMaterial color="#272019" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[x + (x < 0 ? 0.27 : -0.27), 0.13, mid]}>
            <boxGeometry args={[0.06, 0.07, TRACK_LENGTH]} />
            <meshStandardMaterial color="#ffbf3f" emissive="#ff9a1f" emissiveIntensity={2.2} />
          </mesh>
        </group>
      ))}
      {/* skirt below the deck */}
      <mesh position={[0, -0.6, mid]}>
        <boxGeometry args={[8.0, 0.85, TRACK_LENGTH]} />
        <meshStandardMaterial color="#05070b" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* scrolling details (instanced) */}
      <instancedMesh ref={seamsRef} args={[undefined, undefined, SEAM_COUNT]} frustumCulled={false}>
        <boxGeometry args={[8.3, 0.012, 0.1]} />
        <meshStandardMaterial color="#39414f" metalness={0.85} roughness={0.2} />
      </instancedMesh>
      <instancedMesh ref={dashesRef} args={[undefined, undefined, DASH_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.018, 1.1]} />
        <meshStandardMaterial color="#9beaff" emissive="#24d6ff" emissiveIntensity={1.6} />
      </instancedMesh>
      <instancedMesh ref={chevsRef} args={[undefined, undefined, CHEV_COUNT]} frustumCulled={false}>
        <planeGeometry args={[0.34, 0.12]} />
        <meshStandardMaterial color="#ffd84d" emissive="#ffd84d" emissiveIntensity={1.8} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
