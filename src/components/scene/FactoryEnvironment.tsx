import { Clone, Text, useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { bendPoint, sim, type BendOut } from '../../game/engine';
import { arrowSignTexture, cautionStripeTexture, glowStreakTexture, neonSignTexture } from './textures';

const MODELS = {
  burger: '/models/burger-cheese.glb',
  burgerDouble: '/models/burger-cheese-double.glb',
  fries: '/models/fries.glb',
  ketchup: '/models/bottle-ketchup.glb',
  mustard: '/models/bottle-musterd.glb',
  soda: '/models/soda.glb',
  hotdog: '/models/hot-dog.glb',
  donut: '/models/donut-sprinkles.glb',
  pizza: '/models/pizza.glb'
} as const;

for (const url of Object.values(MODELS)) useGLTF.preload(url);

/** One Kenney food-kit model instance (CC0). */
function Prop({
  url,
  position,
  rotationY = 0,
  scale = 1
}: {
  url: string;
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(url);
  return <Clone object={scene} position={position} rotation={[0, rotationY, 0]} scale={scale} />;
}

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
  heatGlowOrange: THREE.MeshBasicMaterial;
  heatGlowAmber: THREE.MeshBasicMaterial;
}

function useSharedMats(): SharedMats {
  // Poly Haven metal_plate (CC0) — treadplate diffuse / normal / roughness / metalness
  const [plateDiff, plateNor, plateRough, plateMetal] = useTexture([
    '/textures/metal/metal_plate_diff_1k.jpg',
    '/textures/metal/metal_plate_nor_gl_1k.jpg',
    '/textures/metal/metal_plate_rough_1k.jpg',
    '/textures/metal/metal_plate_metal_1k.jpg'
  ]);

  /* eslint-disable react-hooks/immutability -- one-time texture configuration */
  useMemo(() => {
    for (const tex of [plateDiff, plateNor, plateRough, plateMetal]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2.5, 1);
      tex.anisotropy = 8;
    }
    plateDiff.colorSpace = THREE.SRGBColorSpace;
  }, [plateDiff, plateNor, plateRough, plateMetal]);
  /* eslint-enable react-hooks/immutability */

  return useMemo(
    () => ({
      counter: new THREE.MeshStandardMaterial({
        map: plateDiff,
        normalMap: plateNor,
        roughnessMap: plateRough,
        metalnessMap: plateMetal,
        color: '#8a7a5e',
        metalness: 1,
        roughness: 1,
        emissive: '#1f1208',
        emissiveIntensity: 0.35
      }),
      counterTrim: new THREE.MeshStandardMaterial({
        map: plateDiff,
        normalMap: plateNor,
        roughnessMap: plateRough,
        metalnessMap: plateMetal,
        color: '#d9b87a',
        metalness: 1,
        roughness: 1
      }),
      steel: new THREE.MeshStandardMaterial({
        map: plateDiff,
        normalMap: plateNor,
        roughnessMap: plateRough,
        metalnessMap: plateMetal,
        color: '#c8d2e2',
        metalness: 1,
        roughness: 1
      }),
      darkSteel: new THREE.MeshStandardMaterial({
        map: plateDiff,
        normalMap: plateNor,
        roughnessMap: plateRough,
        metalnessMap: plateMetal,
        color: '#6a7588',
        metalness: 1,
        roughness: 1
      }),
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
      vatGlow: new THREE.MeshStandardMaterial({ color: '#ffb43d', emissive: '#ff9a1f', emissiveIntensity: 1.4 }),
      heatGlowOrange: new THREE.MeshBasicMaterial({
        map: glowStreakTexture(),
        color: '#ff7a2a',
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      heatGlowAmber: new THREE.MeshBasicMaterial({
        map: glowStreakTexture(),
        color: '#ffc41f',
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    }),
    [plateDiff, plateNor, plateRough, plateMetal]
  );
}

/* ------------------------- building blocks ------------------------- */

function MiniBurger({ position, scale = 1, double = false }: { mats?: SharedMats; position: [number, number, number]; scale?: number; double?: boolean }) {
  return <Prop url={double ? MODELS.burgerDouble : MODELS.burger} position={position} scale={scale * 1.5} rotationY={position[2] * 1.7} />;
}

function FryBasket({ position }: { mats?: SharedMats; position: [number, number, number] }) {
  return <Prop url={MODELS.fries} position={position} scale={1.6} rotationY={position[2] * 2.3} />;
}

const SIGN_HEX = { red: '#ff3b2a', cyan: '#3adcff', amber: '#ffc41f' } as const;

function NeonSign({
  text,
  sub,
  position,
  rotationY,
  color
}: {
  mats?: SharedMats;
  text: string;
  sub?: string;
  position: [number, number, number];
  rotationY: number;
  color: 'red' | 'cyan' | 'amber';
}) {
  const hex = SIGN_HEX[color];
  const face = useMemo(() => neonSignTexture(text, hex, sub), [text, hex, sub]);
  const halo = useMemo(() => glowStreakTexture(), []);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* additive halo bleeding light onto the wall behind */}
      <mesh position={[0, 0, -0.06]} scale={[6.2, 3.4, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={halo}
          color={hex}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* drawn neon face — unmapped tone so bloom grabs it */}
      <mesh>
        <planeGeometry args={[3.6, 1.35]} />
        <meshBasicMaterial map={face} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SauceBottle({ mats, variant, position }: { mats: SharedMats; variant: 'ketchup' | 'mustard'; position: [number, number, number] }) {
  const glow = variant === 'ketchup' ? mats.ketchupGlow : mats.mustardGlow;
  const { scene } = useGLTF(variant === 'ketchup' ? MODELS.ketchup : MODELS.mustard);
  const tilt = position[0] < 0 ? -0.55 : 0.55;
  return (
    <group position={position} rotation={[0, 0, tilt]}>
      {/* giant squeeze bottle, flipped nozzle-down */}
      <Clone object={scene} rotation={[Math.PI, 0, 0]} scale={4.6} position={[0, 1.6, 0]} />
      {/* pouring stream */}
      <mesh material={glow} position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.06, 0.11, 1.6, 8]} />
      </mesh>
      <mesh material={glow} position={[0, -1.9, 0]}>
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
        <MiniBurger position={[-0.45, 1.42, 5.6]} scale={1.25} double />
        <MiniBurger position={[0.5, 1.42, 11]} />
        <Prop url={MODELS.hotdog} position={[0.4, 1.42, 1.2]} scale={1.5} rotationY={0.7} />
        {index % 2 === 0 && <Prop url={MODELS.pizza} position={[-0.5, 1.42, 12.6]} scale={1.4} rotationY={2.1} />}
        {/* heat haze glow over the coals */}
        <mesh material={mats.heatGlowOrange} position={[-1.3, 2.1, 6]} rotation={[0, -Math.PI / 2, 0]} scale={[13, 3.2, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
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
        <FryBasket position={[-0.3, 1.72, 3]} />
        <FryBasket position={[0.35, 1.72, 5.2]} />
        <Prop url={MODELS.soda} position={[-0.4, 1.32, 8.4]} scale={1.7} rotationY={1.2} />
        {index % 2 === 1 && <Prop url={MODELS.donut} position={[0.45, 1.32, 10.8]} scale={1.6} rotationY={0.4} />}
        {/* hot oil glow above the vat */}
        <mesh material={mats.heatGlowAmber} position={[1.3, 2.2, 4]} rotation={[0, Math.PI / 2, 0]} scale={[7, 2.4, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
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

      {/* -------- side walls + neon cornice strips -------- */}
      {[-12.5, 12.5].map((x) => (
        <group key={x}>
          <mesh material={mats.wall} position={[x, 4.5, MODULE_LENGTH / 2]}>
            <boxGeometry args={[1.4, 11.5, MODULE_LENGTH]} />
          </mesh>
          <mesh material={x < 0 ? mats.signCyan : mats.signAmber} position={[x + (x < 0 ? 0.74 : -0.74), 8.6, MODULE_LENGTH / 2]}>
            <boxGeometry args={[0.06, 0.1, MODULE_LENGTH * 0.96]} />
          </mesh>
        </group>
      ))}

      {/* -------- ceiling: deck, light panels, beam + pipes -------- */}
      <mesh material={mats.wall} position={[0, 11.2, MODULE_LENGTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, MODULE_LENGTH]} />
      </mesh>
      {/* recessed light panels washing the corridor */}
      {[5, 22].map((z, i) => (
        <mesh
          key={z}
          material={(i + index) % 2 === 0 ? mats.signAmber : mats.signCyan}
          position={[(i + index) % 2 === 0 ? -3 : 3, 11.1, z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[4.2, 1.1]} />
        </mesh>
      ))}
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
      bendPoint(slot.x, z, tmp.bend);
      tmp.p.set(tmp.bend.x, slot.y, tmp.bend.z);
      tmp.e.set(0, (slot.x < 0 ? Math.PI / 2 : -Math.PI / 2) + tmp.bend.yaw, 0);
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
      {/* dimmed so gameplay elements (red hazards, gold coins) own the contrast */}
      <instancedMesh ref={cyanRef} args={[undefined, undefined, WINDOWS_PER_SIDE * 2]} frustumCulled={false}>
        <planeGeometry args={[1.8, 1.0]} />
        <meshStandardMaterial color="#0a2530" emissive="#1fb9de" emissiveIntensity={0.55} />
      </instancedMesh>
      <instancedMesh ref={amberRef} args={[undefined, undefined, WINDOWS_PER_SIDE * 2]} frustumCulled={false}>
        <planeGeometry args={[1.8, 1.0]} />
        <meshStandardMaterial color="#2b1d08" emissive="#ff9a1f" emissiveIntensity={0.5} />
      </instancedMesh>
    </group>
  );
}

/* --------------------------- corner room --------------------------- */

function CornerRoomVariant({ dir }: { dir: -1 | 1 }) {
  // dir +1 = right turn → exit toward -X (screen right); mirror for left
  const s = dir; // sign shorthand: non-exit side is +X for right turns
  const arrowTex = useMemo(() => arrowSignTexture(dir), [dir]);
  const halo = useMemo(() => glowStreakTexture(), []);

  const caution = useMemo(() => {
    const tex = cautionStripeTexture().clone();
    tex.needsUpdate = true;
    tex.repeat.set(8, 1);
    return tex;
  }, []);

  const mats = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({ color: '#151a24', metalness: 0.7, roughness: 0.4 }),
      platform: new THREE.MeshStandardMaterial({ color: '#262d3a', metalness: 0.7, roughness: 0.35 }),
      trim: new THREE.MeshStandardMaterial({ color: '#ffbf3f', emissive: '#ff9a1f', emissiveIntensity: 2.4 }),
      warn: new THREE.MeshStandardMaterial({ color: '#ff3b2a', emissive: '#ff2212', emissiveIntensity: 2.2 }),
      arrow: new THREE.MeshBasicMaterial({ map: arrowTex, toneMapped: false }),
      floorArrow: new THREE.MeshBasicMaterial({
        map: arrowTex,
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
        depthWrite: false
      }),
      cautionBand: new THREE.MeshStandardMaterial({ map: caution, emissive: '#7a5a08', emissiveIntensity: 0.5 }),
      haloMat: new THREE.MeshBasicMaterial({
        map: halo,
        color: '#ffc41f',
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    }),
    [arrowTex, halo, caution]
  );

  return (
    <group>
      {/* elbow platform bridging old and new leg decks */}
      <mesh material={mats.platform} position={[-s * 3, -0.06, 3.5]}>
        <boxGeometry args={[20, 0.2, 14]} />
      </mesh>
      {/* glowing chevrons painted on the floor, leading through the turn */}
      {[0.5, 3.2, 5.9].map((z, i) => (
        <mesh
          key={z}
          material={mats.floorArrow}
          position={[-s * (1.2 + i * 1.6), 0.055, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          userData={{ pulse: i }}
        >
          <planeGeometry args={[3.4, 1.7]} />
        </mesh>
      ))}
      {/* platform edge glow strips */}
      <mesh material={mats.trim} position={[-s * 3, 0.06, -3.4]}>
        <boxGeometry args={[19, 0.05, 0.12]} />
      </mesh>
      {/* back wall facing the player, with arrows */}
      <mesh material={mats.wall} position={[-s * 1, 5.5, 9]}>
        <boxGeometry args={[22, 11.5, 0.9]} />
      </mesh>
      {/* caution-striped base of the back wall */}
      <mesh material={mats.cautionBand} position={[-s * 1, 1.1, 8.5]}>
        <boxGeometry args={[20, 1.1, 0.1]} />
      </mesh>
      {/* big glowing arrow sign (pulses) */}
      <mesh material={mats.arrow} position={[-s * 1, 4.2, 8.45]} rotation={[0, Math.PI, 0]} userData={{ pulse: 0 }}>
        <planeGeometry args={[7.6, 3.8]} />
      </mesh>
      <mesh material={mats.haloMat} position={[-s * 1, 4.2, 8.35]} rotation={[0, Math.PI, 0]} scale={[12, 6.5, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* red hazard strip along the bottom of the back wall */}
      <mesh material={mats.warn} position={[-s * 1, 0.45, 8.45]}>
        <boxGeometry args={[20, 0.14, 0.05]} />
      </mesh>
      {/* wall sealing the non-exit side */}
      <mesh material={mats.wall} position={[s * 8.5, 5.5, 2]}>
        <boxGeometry args={[0.9, 11.5, 14]} />
      </mesh>
      {/* side-wall arrow for peripheral vision (pulses) */}
      <mesh material={mats.arrow} position={[s * 8, 3.4, 1]} rotation={[0, -s * (Math.PI / 2), 0]} userData={{ pulse: 1 }}>
        <planeGeometry args={[5, 2.5]} />
      </mesh>
      {/* ceiling patch */}
      <mesh material={mats.wall} position={[-s * 2, 10.8, 3.5]}>
        <boxGeometry args={[20, 0.6, 14]} />
      </mesh>
    </group>
  );
}

function CornerRoom() {
  const rightRef = useRef<THREE.Group>(null);
  const leftRef = useRef<THREE.Group>(null);
  const pulseTargets = useRef<THREE.Object3D[]>([]);

  useFrame((state) => {
    const corner = sim.corners[0];
    const right = rightRef.current;
    const left = leftRef.current;
    if (!right || !left) return;
    if (!corner) {
      right.visible = false;
      left.visible = false;
      return;
    }
    const active = corner.dir === 1 ? right : left;
    const idle = corner.dir === 1 ? left : right;
    idle.visible = false;
    active.visible = true;
    active.position.set(0, 0, corner.z);

    // pulse every arrow — urgency ramps as the corner gets close
    pulseTargets.current.length = 0;
    active.traverse((obj) => {
      if ((obj.userData as { pulse?: number }).pulse !== undefined) pulseTargets.current.push(obj);
    });
    const urgency = corner.z < 18 ? 9 : 5;
    const t = state.clock.elapsedTime;
    for (const obj of pulseTargets.current) {
      const phase = (obj.userData as { pulse: number }).pulse * 0.9;
      obj.scale.setScalar(1 + Math.sin(t * urgency + phase) * 0.07);
    }
  });

  return (
    <group>
      <group ref={rightRef} visible={false}>
        <CornerRoomVariant dir={1} />
      </group>
      <group ref={leftRef} visible={false}>
        <CornerRoomVariant dir={-1} />
      </group>
    </group>
  );
}

/* ------------------------- checkpoint gates ------------------------ */

const GATE_SLOTS = 2;

function CheckpointGates() {
  const slotRefs = useRef<(THREE.Group | null)[]>([]);
  const bendScratch = useRef<BendOut>({ x: 0, z: 0, yaw: 0 });

  const mats = useMemo(
    () => ({
      post: new THREE.MeshStandardMaterial({ color: '#1c2430', metalness: 0.8, roughness: 0.3 }),
      glow: new THREE.MeshStandardMaterial({ color: '#67ff72', emissive: '#3dff52', emissiveIntensity: 2.6 }),
      finishGlow: new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#ffc41f', emissiveIntensity: 2.8 })
    }),
    []
  );

  useFrame((state) => {
    // show a gate for each upcoming checkpoint within the horizon
    let slot = 0;
    const t = state.clock.elapsedTime;
    for (let i = sim.nextCheckpointIndex; i < sim.checkpoints.length && slot < GATE_SLOTS; i += 1) {
      const z = sim.checkpoints[i] - sim.distance;
      if (z < -10 || z > 130) continue;
      const group = slotRefs.current[slot];
      if (!group) continue;
      const bend = bendPoint(0, z, bendScratch.current);
      group.visible = true;
      group.position.set(bend.x, 0, bend.z);
      group.rotation.y = bend.yaw;
      const isFinish = i === sim.checkpoints.length - 1;
      group.traverse((obj) => {
        const tag = (obj.userData as { gate?: string }).gate;
        if (tag === 'checkpoint') obj.visible = !isFinish;
        if (tag === 'finish') obj.visible = isFinish;
        if (tag === 'beam') obj.scale.y = 1 + Math.sin(t * 5) * 0.08;
      });
      slot += 1;
    }
    for (; slot < GATE_SLOTS; slot += 1) {
      const group = slotRefs.current[slot];
      if (group) group.visible = false;
    }
  });

  return (
    <group>
      {Array.from({ length: GATE_SLOTS }, (_, i) => (
        <group key={i} visible={false} ref={(el) => (slotRefs.current[i] = el)}>
          {/* posts */}
          {[-4.6, 4.6].map((x) => (
            <mesh key={x} material={mats.post} position={[x, 2.6, 0]}>
              <boxGeometry args={[0.6, 5.6, 0.6]} />
            </mesh>
          ))}
          {/* header */}
          <mesh material={mats.post} position={[0, 5.6, 0]}>
            <boxGeometry args={[9.9, 0.9, 0.7]} />
          </mesh>
          {/* glowing beam across the track */}
          <mesh userData={{ gate: 'beam' }} material={mats.glow} position={[0, 5.05, 0.1]}>
            <boxGeometry args={[9.4, 0.12, 0.12]} />
          </mesh>
          <group userData={{ gate: 'checkpoint' }}>
            <Text position={[0, 5.62, -0.4]} rotation={[0, Math.PI, 0]} fontSize={0.62} anchorX="center" anchorY="middle" color="#9dffac" outlineWidth={0.035} outlineColor="#05140a">
              CHECKPOINT
            </Text>
          </group>
          <group userData={{ gate: 'finish' }} visible={false}>
            <Text position={[0, 5.62, -0.4]} rotation={[0, Math.PI, 0]} fontSize={0.72} anchorX="center" anchorY="middle" color="#ffe58a" outlineWidth={0.04} outlineColor="#140e02">
              ★ FINISH ★
            </Text>
            <mesh material={mats.finishGlow} position={[0, 4.6, 0.1]}>
              <boxGeometry args={[9.4, 0.12, 0.12]} />
            </mesh>
          </group>
        </group>
      ))}
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

  const bendScratch = useRef<BendOut>({ x: 0, z: 0, yaw: 0 });

  useFrame((state) => {
    const corner = sim.corners[0];
    for (let i = 0; i < MODULE_COUNT; i += 1) {
      const group = moduleRefs.current[i];
      if (!group) continue;
      const raw = i * MODULE_LENGTH - sim.distance;
      const z = ((raw % SPAN) + SPAN) % SPAN - BEHIND;
      // a rigid module can't straddle a 90° bend — hide it; the corner room fills the gap
      if (corner && z < corner.z + 4 && z + MODULE_LENGTH > corner.z - 10) {
        group.visible = false;
        continue;
      }
      group.visible = true;
      const bend = bendPoint(0, z, bendScratch.current);
      group.position.set(bend.x, 0, bend.z);
      group.rotation.y = bend.yaw;
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
      <CornerRoom />
      <CheckpointGates />
    </group>
  );
}
