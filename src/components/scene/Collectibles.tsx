import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COIN_POOL_SIZE } from '../../game/constants';
import { sim } from '../../game/engine';

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Burger coins as instanced meshes — three draw calls total (face, rim,
 * burger emboss) no matter how many coins are live. Matrices update
 * imperatively from the sim each frame.
 */
export function Collectibles() {
  const faceRef = useRef<THREE.InstancedMesh>(null);
  const rimRef = useRef<THREE.InstancedMesh>(null);
  const embossRef = useRef<THREE.InstancedMesh>(null);

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
    const emboss = embossRef.current;
    if (!face || !rim || !emboss) return;

    for (let i = 0; i < COIN_POOL_SIZE; i += 1) {
      const coin = sim.coins[i];
      if (!coin.active) {
        face.setMatrixAt(i, HIDDEN);
        rim.setMatrixAt(i, HIDDEN);
        emboss.setMatrixAt(i, HIDDEN);
        continue;
      }
      const pop = coin.pull > 0 ? 1.18 : 1;
      scl.setScalar(pop);
      pos.set(coin.x, coin.y, coin.z);
      // cylinders: axis is +Y, so tip face toward camera (RX 90°) then spin
      euler.set(Math.PI / 2, coin.spin, 0);
      quat.setFromEuler(euler);
      dummy.compose(pos, quat, scl);
      face.setMatrixAt(i, dummy);
      emboss.setMatrixAt(i, dummy);
      // torus: ring already faces ±Z, only needs the spin
      euler.set(0, coin.spin, 0);
      quat.setFromEuler(euler);
      dummy.compose(pos, quat, scl);
      rim.setMatrixAt(i, dummy);
    }
    face.instanceMatrix.needsUpdate = true;
    rim.instanceMatrix.needsUpdate = true;
    emboss.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* gold face */}
      <instancedMesh ref={faceRef} args={[undefined, undefined, COIN_POOL_SIZE]} frustumCulled={false}>
        <cylinderGeometry args={[0.42, 0.42, 0.12, 22]} />
        <meshStandardMaterial color="#ffcf52" metalness={0.6} roughness={0.25} emissive="#ffae1f" emissiveIntensity={1.5} />
      </instancedMesh>
      {/* bright rim */}
      <instancedMesh ref={rimRef} args={[undefined, undefined, COIN_POOL_SIZE]} frustumCulled={false}>
        <torusGeometry args={[0.42, 0.032, 8, 24]} />
        <meshStandardMaterial color="#fff0b8" metalness={0.85} roughness={0.15} emissive="#ffd84d" emissiveIntensity={2} />
      </instancedMesh>
      {/* burger emboss: squashed darker disc floating on both faces */}
      <instancedMesh ref={embossRef} args={[undefined, undefined, COIN_POOL_SIZE]} frustumCulled={false}>
        <cylinderGeometry args={[0.25, 0.25, 0.16, 16]} />
        <meshStandardMaterial color="#d9831f" metalness={0.6} roughness={0.3} emissive="#c45e08" emissiveIntensity={1.1} />
      </instancedMesh>
    </group>
  );
}
