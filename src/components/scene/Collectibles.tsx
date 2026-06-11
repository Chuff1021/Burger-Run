import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COIN_POOL_SIZE } from '../../game/constants';
import { sim } from '../../game/engine';
import { coinFaceTexture } from './textures';

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Burger coins as instanced meshes — two draw calls total (textured face,
 * bright rim) no matter how many coins are live. The face texture carries an
 * embossed burger icon.
 */
export function Collectibles() {
  const faceRef = useRef<THREE.InstancedMesh>(null);
  const rimRef = useRef<THREE.InstancedMesh>(null);

  const faceTex = useMemo(() => coinFaceTexture(), []);

  const { dummy, euler, quat, scl, pos } = useMemo(
    () => ({
      dummy: new THREE.Matrix4(),
      euler: new THREE.Euler(0, 0, 0, 'YXZ'),
      quat: new THREE.Quaternion(),
      scl: new THREE.Vector3(1, 1, 1),
      pos: new THREE.Vector3()
    }),
    []
  );

  useFrame(() => {
    const face = faceRef.current;
    const rim = rimRef.current;
    if (!face || !rim) return;

    for (let i = 0; i < COIN_POOL_SIZE; i += 1) {
      const coin = sim.coins[i];
      if (!coin.active) {
        face.setMatrixAt(i, HIDDEN);
        rim.setMatrixAt(i, HIDDEN);
        continue;
      }
      const pop = coin.pull > 0 ? 1.18 : 1;
      scl.setScalar(pop);
      pos.set(coin.x, coin.y, coin.z);
      // cylinder axis is +Y: tip face toward camera (RX 90°) then spin
      euler.set(Math.PI / 2, coin.spin, 0);
      quat.setFromEuler(euler);
      dummy.compose(pos, quat, scl);
      face.setMatrixAt(i, dummy);
      // torus ring already faces ±Z: only the spin
      euler.set(0, coin.spin, 0);
      quat.setFromEuler(euler);
      dummy.compose(pos, quat, scl);
      rim.setMatrixAt(i, dummy);
    }
    face.instanceMatrix.needsUpdate = true;
    rim.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* gold face with embossed burger icon */}
      <instancedMesh ref={faceRef} args={[undefined, undefined, COIN_POOL_SIZE]} frustumCulled={false}>
        <cylinderGeometry args={[0.42, 0.42, 0.12, 22]} />
        <meshStandardMaterial
          map={faceTex}
          emissiveMap={faceTex}
          color="#ffe2a0"
          metalness={0.55}
          roughness={0.3}
          emissive="#cf8a1f"
          emissiveIntensity={1.0}
        />
      </instancedMesh>
      {/* bright rim */}
      <instancedMesh ref={rimRef} args={[undefined, undefined, COIN_POOL_SIZE]} frustumCulled={false}>
        <torusGeometry args={[0.42, 0.032, 8, 24]} />
        <meshStandardMaterial color="#fff0b8" metalness={0.85} roughness={0.15} emissive="#ffd84d" emissiveIntensity={2} />
      </instancedMesh>
    </group>
  );
}
