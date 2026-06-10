import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sim } from '../../game/engine';

const MODULE_LENGTH = 34;
const MODULE_COUNT = 5;
const SPAN = MODULE_LENGTH * MODULE_COUNT;
const BEHIND = 30;

interface SharedMats {
  counter: THREE.MeshStandardMaterial;
  counterTrim: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  grate: THREE.MeshStandardMaterial;
  flameOuter: THREE.MeshStandardMaterial;
  flameInner: THREE.MeshStandardMaterial;
  coal: THREE.MeshStandardMaterial;
  bunTop: THREE.MeshStandardMaterial;
  patty: THREE.MeshStandardMaterial;
  cheese: THREE.MeshStandardMaterial;
  fries: THREE.MeshStandardMaterial;
  fryBox: THREE.MeshStandardMaterial;
  ketchup: THREE.MeshStandardMaterial;
  ketchupGlow: THREE.MeshStandardMaterial;
  mustard: THREE.MeshStandardMaterial;
  mustardGlow: THREE.MeshStandardMaterial;
  bottleCap: THREE.MeshStandardMaterial;
  label: THREE.MeshStandardMaterial;
  signRed: THREE.MeshStandardMaterial;
  signCyan: THREE.MeshStandardMaterial;
  signAmber: THREE.MeshStandardMaterial;
  signBox: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  archMetal: THREE.MeshStandardMaterial;
  archCyan: THREE.MeshStandardMaterial;
  archAmber: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  underGlowAmber: THREE.MeshStandardMaterial;
  underGlowCyan: THREE.MeshStandardMaterial;
  vatGlow: THREE.MeshStandardMaterial;
}

function useSharedMats(): SharedMats {
  return useMemo(
    () => ({
      counter: new THREE.MeshStandardMaterial({ color: '#2b2218', metalness: 0.5, roughness: 0.42 }),
      counterTrim: new THREE.MeshStandardMaterial({ color: '#4a3a24', metalness: 0.75, roughness: 0.3 }),
      steel: new THREE.MeshStandardMaterial({ color: '#4b5566', metalness: 0.9, roughness: 0.28 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: '#232a36', metalness: 0.85, roughness: 0.32 }),
      grate: new THREE.MeshStandardMaterial({ color: '#11141a', metalness: 0.9, roughness: 0.35 }),
      flameOuter: new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff5a0a', emissiveIntensity: 2.6, transparent: true, opacity: 0.85 }),
      flameInner: new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#ffcf2e', emissiveIntensity: 3, transparent: true, opacity: 0.9 }),
      coal: new THREE.MeshStandardMaterial({ color: '#3a1408', emissive: '#ff4400', emissiveIntensity: 1.1, roughness: 0.8 }),
      bunTop: new THREE.MeshStandardMaterial({ color: '#efa040', roughness: 0.5, emissive: '#5a2c08', emissiveIntensity: 0.4 }),
      patty: new THREE.MeshStandardMaterial({ color: '#4a2410', roughness: 0.8 }),
      cheese: new THREE.MeshStandardMaterial({ color: '#ffc83d', roughness: 0.4, emissive: '#7a4a00', emissiveIntensity: 0.5 }),
      fries: new THREE.MeshStandardMaterial({ color: '#ffd255', roughness: 0.5, emissive: '#8a5e00', emissiveIntensity: 0.55 }),
      fryBox: new THREE.MeshStandardMaterial({ color: '#e23030', roughness: 0.45, emissive: '#5a0808', emissiveIntensity: 0.5 }),
      ketchup: new THREE.MeshStandardMaterial({ color: '#d42020', roughness: 0.3, emissive: '#5a0808', emissiveIntensity: 0.55 }),
      ketchupGlow: new THREE.MeshStandardMaterial({ color: '#ff2f2f', emissive: '#ff1f1f', emissiveIntensity: 1.8, transparent: true, opacity: 0.92 }),
      mustard: new THREE.MeshStandardMaterial({ color: '#e8ae1a', roughness: 0.3, emissive: '#6e4e00', emissiveIntensity: 0.55 }),
      mustardGlow: new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#ffc41f', emissiveIntensity: 1.8, transparent: true, opacity: 0.92 }),
      bottleCap: new THREE.MeshStandardMaterial({ color: '#e8eef5', metalness: 0.6, roughness: 0.3 }),
      label: new THREE.MeshStandardMaterial({ color: '#f5efe2', roughness: 0.5, emissive: '#6e6452', emissiveIntensity: 0.35 }),
      signRed: new THREE.MeshStandardMaterial({ color: '#ff2f2f', emissive: '#ff2222', emissiveIntensity: 2.6 }),
      signCyan: new THREE.MeshStandardMaterial({ color: '#24d6ff', emissive: '#24d6ff', emissiveIntensity: 2.6 }),
      signAmber: new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#ffc41f', emissiveIntensity: 2.6 }),
      signBox: new THREE.MeshStandardMaterial({ color: '#161a23', metalness: 0.6, roughness: 0.35 }),
      wall: new THREE.MeshStandardMaterial({ color: '#11151d', metalness: 0.7, roughness: 0.45 }),
      archMetal: new THREE.MeshStandardMaterial({ color: '#2a3342', metalness: 0.85, roughness: 0.28 }),
      archCyan: new THREE.MeshStandardMaterial({ color: '#24d6ff', emissive: '#24d6ff', emissiveIntensity: 3 }),
      archAmber: new THREE.MeshStandardMaterial({ color: '#ffbf3f', emissive: '#ff9a1f', emissiveIntensity: 3 }),
      floor: new THREE.MeshStandardMaterial({ color: '#0a0d13', metalness: 0.5, roughness: 0.6 }),
      underGlowAmber: new THREE.MeshStandardMaterial({ color: '#ffbf3f', emissive: '#ff8a1f', emissiveIntensity: 1.8 }),
      underGlowCyan: new THREE.MeshStandardMaterial({ color: '#24d6ff', emissive: '#1fb9de', emissiveIntensity: 1.8 }),
      vatGlow: new THREE.MeshStandardMaterial({ color: '#ffb43d', emissive: '#ff9a1f', emissiveIntensity: 1.4 })
    }),
    []
  );
}

/* ------------------------- building blocks ------------------------- */

function MiniBurger({ mats, position, scale = 1 }: { mats: SharedMats; position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh material={mats.bunTop} position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      <mesh material={mats.cheese} position={[0, 0.12, 0]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[0.52, 0.05, 0.52]} />
      </mesh>
      <mesh material={mats.patty} position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 0.12, 12]} />
      </mesh>
    </group>
  );
}

function FryBasket({ mats, position }: { mats: SharedMats; position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh material={mats.fryBox}>
        <boxGeometry args={[0.6, 0.55, 0.45]} />
      </mesh>
      {[-0.15, 0, 0.15].map((x, i) => (
        <mesh key={i} material={mats.fries} position={[x, 0.42, (i % 2) * 0.12 - 0.06]} rotation={[0.12 * (i - 1), 0, 0.16 * (i - 1)]}>
          <boxGeometry args={[0.1, 0.5, 0.1]} />
        </mesh>
      ))}
    </group>
  );
}

function NeonSign({
  mats,
  text,
  sub,
  position,
  rotationY,
  color
}: {
  mats: SharedMats;
  text: string;
  sub?: string;
  position: [number, number, number];
  rotationY: number;
  color: 'red' | 'cyan' | 'amber';
}) {
  const glow = color === 'red' ? mats.signRed : color === 'cyan' ? mats.signCyan : mats.signAmber;
  const hex = color === 'red' ? '#ff6a55' : color === 'cyan' ? '#7fe8ff' : '#ffe58a';
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh material={mats.signBox}>
        <boxGeometry args={[3.6, 1.25, 0.18]} />
      </mesh>
      <mesh material={glow} position={[0, 0.55, 0.06]}>
        <boxGeometry args={[3.7, 0.08, 0.1]} />
      </mesh>
      <mesh material={glow} position={[0, -0.55, 0.06]}>
        <boxGeometry args={[3.7, 0.08, 0.1]} />
      </mesh>
      <Text position={[0, sub ? 0.14 : 0, 0.12]} fontSize={0.5} anchorX="center" anchorY="middle" color={hex} outlineWidth={0.03} outlineColor="#1a0500" outlineBlur={0.06}>
        {text}
      </Text>
      {sub && (
        <Text position={[0, -0.34, 0.12]} fontSize={0.2} anchorX="center" anchorY="middle" color="#e8d8c0">
          {sub}
        </Text>
      )}
    </group>
  );
}

function SauceBottle({ mats, variant, position }: { mats: SharedMats; variant: 'ketchup' | 'mustard'; position: [number, number, number] }) {
  const body = variant === 'ketchup' ? mats.ketchup : mats.mustard;
  const glow = variant === 'ketchup' ? mats.ketchupGlow : mats.mustardGlow;
  const tilt = position[0] < 0 ? -0.5 : 0.5;
  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <mesh material={body}>
        <cylinderGeometry args={[0.66, 0.74, 2.8, 16]} />
      </mesh>
      <mesh material={mats.label} position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.68, 0.7, 0.95, 16]} />
      </mesh>
      <Text
        position={[0, 0.12, 0.71]}
        fontSize={0.23}
        anchorX="center"
        anchorY="middle"
        color={variant === 'ketchup' ? '#b41212' : '#9a6e08'}
      >
        {variant === 'ketchup' ? 'KETCHUP' : 'MUSTARD'}
      </Text>
      <mesh material={body} position={[0, -1.65, 0]}>
        <coneGeometry args={[0.48, 0.65, 14]} />
      </mesh>
      <mesh material={mats.bottleCap} position={[0, -2.08, 0]}>
        <cylinderGeometry args={[0.17, 0.22, 0.48, 10]} />
      </mesh>
      {/* pouring stream */}
      <mesh material={glow} position={[0, -2.85, 0]}>
        <cylinderGeometry args={[0.06, 0.11, 1.2, 8]} />
      </mesh>
      <mesh material={glow} position={[0, -3.55, 0]}>
        <sphereGeometry args={[0.16, 10, 8]} />
      </mesh>
    </group>
  );
}

/* ----------------------------- module ------------------------------ */

function FactoryModule({
  mats,
  index,
  registerFlame
}: {
  mats: SharedMats;
  index: number;
  registerFlame: (mesh: THREE.Mesh | null) => void;
}) {
  const even = index % 2 === 0;
  return (
    <group>
      {/* ground plane beyond the track */}
      <mesh material={mats.floor} position={[0, -1.1, MODULE_LENGTH / 2]}>
        <boxGeometry args={[36, 0.2, MODULE_LENGTH]} />
      </mesh>

      {/* -------- screen-left (+X): flame grill counter -------- */}
      <group position={[6.6, 0, 6]}>
        <mesh material={mats.counter} position={[0, 0.62, 6]}>
          <boxGeometry args={[2.8, 1.45, 14]} />
        </mesh>
        <mesh material={mats.counterTrim} position={[-1.32, 0.62, 6]}>
          <boxGeometry args={[0.16, 1.45, 14]} />
        </mesh>
        {/* under-counter glow strip facing the track */}
        <mesh material={mats.underGlowAmber} position={[-1.42, 0.18, 6]}>
          <boxGeometry args={[0.05, 0.08, 13.6]} />
        </mesh>
        <mesh material={mats.grate} position={[0, 1.38, 6]}>
          <boxGeometry args={[2.5, 0.08, 13.4]} />
        </mesh>
        {/* coals + flames, two clusters */}
        {[3, 9].map((z) => (
          <group key={z} position={[0, 1.45, z]}>
            <mesh material={mats.coal} position={[0, -0.04, 0]}>
              <boxGeometry args={[2.1, 0.1, 3.4]} />
            </mesh>
            <mesh ref={registerFlame} material={mats.flameOuter} position={[0, 0.6, 0]}>
              <coneGeometry args={[0.62, 1.35, 9]} />
            </mesh>
            <mesh ref={registerFlame} material={mats.flameInner} position={[0.3, 0.45, 0.5]}>
              <coneGeometry args={[0.34, 0.9, 7]} />
            </mesh>
          </group>
        ))}
        <MiniBurger mats={mats} position={[-0.45, 1.45, 5.6]} scale={1.25} />
        <MiniBurger mats={mats} position={[0.5, 1.45, 11]} />
        <NeonSign mats={mats} text="FLAME GRILLED" sub="SINCE 1954" position={[-1.1, 3.1, 6]} rotationY={-Math.PI / 2 + 0.3} color="red" />
      </group>

      {/* -------- screen-right (-X): fry zone -------- */}
      <group position={[-6.6, 0, 6]}>
        <mesh material={mats.counter} position={[0, 0.62, 6]}>
          <boxGeometry args={[2.8, 1.45, 14]} />
        </mesh>
        <mesh material={mats.counterTrim} position={[1.32, 0.62, 6]}>
          <boxGeometry args={[0.16, 1.45, 14]} />
        </mesh>
        <mesh material={mats.underGlowCyan} position={[1.42, 0.18, 6]}>
          <boxGeometry args={[0.05, 0.08, 13.6]} />
        </mesh>
        {/* fry oil vat with hot glow */}
        <mesh material={mats.steel} position={[0, 1.42, 4]}>
          <boxGeometry args={[2.3, 0.55, 5]} />
        </mesh>
        <mesh material={mats.vatGlow} position={[0, 1.72, 4]}>
          <boxGeometry args={[2.0, 0.06, 4.6]} />
        </mesh>
        <FryBasket mats={mats} position={[-0.3, 1.95, 3]} />
        <FryBasket mats={mats} position={[0.35, 1.95, 5.2]} />
        <NeonSign mats={mats} text="FRY ZONE" position={[1.1, 3.1, 6]} rotationY={Math.PI / 2 - 0.3} color="amber" />
      </group>

      {/* -------- giant sauce bottle pouring over the side -------- */}
      <SauceBottle mats={mats} variant={even ? 'ketchup' : 'mustard'} position={even ? [-4.4, 6.4, 17] : [4.4, 6.4, 17]} />

      {/* -------- overhead arch gate -------- */}
      <group position={[0, 0, 26]}>
        {[-5.2, 5.2].map((x) => (
          <mesh key={x} material={mats.archMetal} position={[x, 3, 0]}>
            <boxGeometry args={[0.75, 6.4, 0.75]} />
          </mesh>
        ))}
        <mesh material={mats.archMetal} position={[0, 6.5, 0]}>
          <boxGeometry args={[11.2, 1.25, 0.85]} />
        </mesh>
        <mesh material={even ? mats.archCyan : mats.archAmber} position={[0, 5.95, 0.12]}>
          <boxGeometry args={[10.6, 0.09, 0.12]} />
        </mesh>
        <mesh material={even ? mats.archAmber : mats.archCyan} position={[0, 7.05, 0.12]}>
          <boxGeometry args={[10.6, 0.09, 0.12]} />
        </mesh>
        <Text
          position={[0, 6.5, -0.5]}
          rotation={[0, Math.PI, 0]}
          fontSize={0.58}
          anchorX="center"
          anchorY="middle"
          color={even ? '#7fe8ff' : '#ffe58a'}
          outlineWidth={0.035}
          outlineColor="#05070b"
          outlineBlur={0.08}
        >
          {even ? '« OVERDRIVE »' : 'KITCHEN 24/7'}
        </Text>
      </group>

      {/* -------- side walls -------- */}
      {[-12.5, 12.5].map((x) => (
        <mesh key={x} material={mats.wall} position={[x, 4.5, MODULE_LENGTH / 2]}>
          <boxGeometry args={[1.4, 11.5, MODULE_LENGTH]} />
        </mesh>
      ))}

      {/* -------- ceiling beam + pipes -------- */}
      <mesh material={mats.darkSteel} position={[0, 9.6, 12]}>
        <boxGeometry args={[26, 0.55, 1.2]} />
      </mesh>
      <mesh material={mats.steel} position={[-9.5, 8.8, MODULE_LENGTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, MODULE_LENGTH, 8]} />
      </mesh>
      <mesh material={mats.steel} position={[9.5, 9.1, MODULE_LENGTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, MODULE_LENGTH, 8]} />
      </mesh>
    </group>
  );
}

/* ---------------- instanced wall window lights ---------------- */

const WINDOWS_PER_SIDE = 24;

function WallLights() {
  const cyanRef = useRef<THREE.InstancedMesh>(null);
  const amberRef = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(1, 1, 1) }), []);

  const slots = useMemo(() => {
    const list: { x: number; y: number; z: number; cyan: boolean }[] = [];
    for (let side = 0; side < 2; side += 1) {
      for (let i = 0; i < WINDOWS_PER_SIDE; i += 1) {
        list.push({
          x: side === 0 ? -11.75 : 11.75,
          y: 2.2 + ((i * 37) % 3) * 2.3,
          z: (i * 7.3) % SPAN,
          cyan: (i + side) % 2 === 0
        });
      }
    }
    return list;
  }, []);

  useFrame(() => {
    const cyan = cyanRef.current;
    const amber = amberRef.current;
    if (!cyan || !amber) return;
    let ci = 0;
    let ai = 0;
    for (const slot of slots) {
      const z = ((slot.z - sim.distance) % SPAN + SPAN) % SPAN - BEHIND;
      tmp.p.set(slot.x, slot.y, z);
      tmp.e.set(0, slot.x < 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      tmp.q.setFromEuler(tmp.e);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      if (slot.cyan) cyan.setMatrixAt(ci++, tmp.m);
      else amber.setMatrixAt(ai++, tmp.m);
    }
    cyan.count = ci;
    amber.count = ai;
    cyan.instanceMatrix.needsUpdate = true;
    amber.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={cyanRef} args={[undefined, undefined, WINDOWS_PER_SIDE * 2]} frustumCulled={false}>
        <planeGeometry args={[1.8, 1.0]} />
        <meshStandardMaterial color="#0a2530" emissive="#1fb9de" emissiveIntensity={1.1} />
      </instancedMesh>
      <instancedMesh ref={amberRef} args={[undefined, undefined, WINDOWS_PER_SIDE * 2]} frustumCulled={false}>
        <planeGeometry args={[1.8, 1.0]} />
        <meshStandardMaterial color="#2b1d08" emissive="#ff9a1f" emissiveIntensity={1.0} />
      </instancedMesh>
    </group>
  );
}

/* --------------------------- environment --------------------------- */

export function FactoryEnvironment() {
  const mats = useSharedMats();
  const moduleRefs = useRef<(THREE.Group | null)[]>([]);
  const flames = useRef<THREE.Mesh[]>([]);

  const registerFlame = (mesh: THREE.Mesh | null) => {
    if (mesh && !flames.current.includes(mesh)) flames.current.push(mesh);
  };

  useFrame((state) => {
    for (let i = 0; i < MODULE_COUNT; i += 1) {
      const group = moduleRefs.current[i];
      if (!group) continue;
      const raw = i * MODULE_LENGTH - sim.distance;
      group.position.z = ((raw % SPAN) + SPAN) % SPAN - BEHIND;
    }
    const t = state.clock.elapsedTime;
    for (let i = 0; i < flames.current.length; i += 1) {
      const flame = flames.current[i];
      const flicker = 0.82 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.45;
      flame.scale.set(flicker, 0.75 + Math.abs(Math.sin(t * 12 + i * 2.3)) * 0.55, flicker);
    }
  });

  return (
    <group>
      {Array.from({ length: MODULE_COUNT }, (_, i) => (
        <group key={i} ref={(el) => (moduleRefs.current[i] = el)}>
          <FactoryModule mats={mats} index={i} registerFlame={registerFlame} />
        </group>
      ))}
      <WallLights />
    </group>
  );
}
