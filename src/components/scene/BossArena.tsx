import { Text, useGLTF, useTexture } from '@react-three/drei';
import { useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { boss } from '../../game/bossSim';
import { sim } from '../../game/engine';
import { glowStreakTexture } from './textures';

useGLTF.preload('/models/boss_fighter.glb');
useGLTF.preload('/models/hero_fighter.glb');
useGLTF.preload('/models/bottle-ketchup.glb');

const FX_SLOTS = 12;

/** Normalizes a GLB to a target height standing on y=0, returns a clone. */
function useFighterModel(url: string, height: number): THREE.Group {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = height / size.y;
    clone.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(clone);
    clone.position.y = -box2.min.y;
    const center = new THREE.Vector3();
    box2.getCenter(center);
    clone.position.x = -center.x;
    clone.position.z = -center.z;
    return clone;
  }, [scene, height]);
}

/**
 * MORTAL KOMBAT arena: grounded stage, panorama backdrop, two Meshy-generated
 * fighters animated by fight state, sauce projectiles, and hit sparks.
 */
export function BossArena() {
  const heroRoot = useRef<THREE.Group>(null);
  const heroBody = useRef<THREE.Group>(null);
  const bossRoot = useRef<THREE.Group>(null);
  const bossBody = useRef<THREE.Group>(null);
  const projRef = useRef<THREE.Group>(null);
  const fxRefs = useRef<(THREE.Sprite | null)[]>([]);
  const flameRefs = useRef<(THREE.Mesh | null)[]>([]);

  const heroModel = useFighterModel('/models/hero_fighter.glb', 2.1);
  const bossModel = useFighterModel('/models/boss_fighter.glb', 3.1);
  const bottle = useGLTF('/models/bottle-ketchup.glb');
  const projModel = useMemo(() => bottle.scene.clone(true), [bottle]);
  const pano = useLoader(THREE.TextureLoader, '/hdri/burger_factory_pano.jpg');

  const [floorDiff, floorRough] = useTexture([
    '/textures/metal/metal_plate_diff_1k.jpg',
    '/textures/metal/metal_plate_rough_1k.jpg'
  ]);

  /* eslint-disable react-hooks/immutability -- one-time texture configuration */
  useEffect(() => {
    for (const tex of [floorDiff, floorRough]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 3);
    }
    floorDiff.colorSpace = THREE.SRGBColorSpace;
    pano.colorSpace = THREE.SRGBColorSpace;
  }, [floorDiff, floorRough, pano]);
  /* eslint-enable react-hooks/immutability */

  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({
        map: floorDiff,
        roughnessMap: floorRough,
        color: '#5e5a52',
        metalness: 0.55,
        roughness: 1,
        envMapIntensity: 1.1
      }),
      edge: new THREE.MeshStandardMaterial({ color: '#ffbf3f', emissive: '#ff8a1f', emissiveIntensity: 2.2 }),
      backdrop: new THREE.MeshBasicMaterial({ map: pano, side: THREE.BackSide, toneMapped: false }),
      flame: new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff5a0a', emissiveIntensity: 2.8, transparent: true, opacity: 0.9 }),
      brazier: new THREE.MeshStandardMaterial({ color: '#2a2018', metalness: 0.8, roughness: 0.35 }),
      heroFlash: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }),
      bossFlash: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }),
      telegraph: new THREE.MeshBasicMaterial({ color: '#ff2212', transparent: true, opacity: 0 }),
      spark: new THREE.SpriteMaterial({ map: glowStreakTexture(), color: '#ffe58a', blending: THREE.AdditiveBlending, depthWrite: false })
    }),
    [floorDiff, floorRough, pano]
  );

  /* eslint-disable react-hooks/immutability -- imperative r3f per-frame animation */
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const hero = heroRoot.current;
    const hBody = heroBody.current;
    const bRoot = bossRoot.current;
    const bBody = bossBody.current;
    if (!hero || !hBody || !bRoot || !bBody) return;

    // ---------------- hero (player puppet) ----------------
    hero.position.set(sim.laneX, sim.playerY, 0);
    hero.rotation.y = -Math.PI / 2; // face the boss (-X)
    let hLean = 0;
    let hBob = Math.sin(t * 2.2) * 0.03; // idle breathe
    let hCrouch = 1;
    const ps = boss.pState;
    if (ps === 'attack' || ps === 'uppercut') {
      hLean = -0.35 - boss.pString * 0.08; // lunge into the punch
      hBob = 0.04;
      if (ps === 'uppercut') hLean = -0.15;
    } else if (ps === 'block') {
      hLean = 0.18;
      hCrouch = 0.94;
    } else if (ps === 'duck') {
      hCrouch = 0.6;
    } else if (ps === 'hitstun') {
      hLean = 0.4;
      hero.position.x += Math.sin(t * 55) * 0.04; // shake
    } else if (ps === 'knockdown') {
      const k = Math.min(1, boss.pStateT / 0.25);
      hBody.rotation.z = -k * (Math.PI / 2) * 0.9 * (boss.pStateT > 0.8 ? 1 - (boss.pStateT - 0.8) / 0.35 : 1);
    } else if (ps === 'walk') {
      hBob = Math.abs(Math.sin(t * 9)) * 0.07;
    }
    if (ps !== 'knockdown') hBody.rotation.z += (0 - hBody.rotation.z) * Math.min(1, dt * 10);
    hBody.rotation.x += (hLean - hBody.rotation.x) * Math.min(1, dt * 14);
    hBody.position.y += (hBob - hBody.position.y) * Math.min(1, dt * 10);
    hBody.scale.y += (hCrouch - hBody.scale.y) * Math.min(1, dt * 14);
    mats.heroFlash.opacity = boss.pHitFlash * 0.5;

    // ---------------- boss ----------------
    bRoot.position.set(boss.bossX, boss.bossY, 0);
    bRoot.rotation.y = Math.PI / 2; // face the hero (+X)
    let bLean = 0;
    let bBob = Math.sin(t * 1.8) * 0.04;
    let bCrouch = 1;
    const bs = boss.bState;
    if (boss.phase === 'finisher' || boss.phase === 'victory') {
      // comic launch off-screen
      const k = Math.min(1, boss.phaseT / 2.2);
      bRoot.position.x = boss.bossX - k * k * 26;
      bRoot.position.y = k * 14 - k * k * 8;
      bRoot.rotation.z = k * 10;
    } else if (bs === 'attack') {
      bLean = boss.bTelegraph > 0 ? 0.3 : -0.4; // rear back, then swing
      bBob = boss.bTelegraph > 0 ? 0.15 : -0.05;
    } else if (bs === 'special') {
      bLean = 0.25;
    } else if (bs === 'throw') {
      bLean = -0.5;
    } else if (bs === 'block') {
      bLean = 0.2;
      bCrouch = 0.95;
    } else if (bs === 'hitstun') {
      bLean = 0.45;
      bRoot.position.x += Math.sin(t * 50) * 0.05;
    } else if (bs === 'knockdown') {
      const k = Math.min(1, boss.bStateT / 0.3);
      const recover = boss.bStateT > 0.75 ? 1 - (boss.bStateT - 0.75) / 0.4 : 1;
      bBody.rotation.z = k * (Math.PI / 2) * 0.85 * Math.max(0, recover);
    } else if (bs === 'walk') {
      bBob = Math.abs(Math.sin(t * 7)) * 0.09;
    }
    if (bs !== 'knockdown' && boss.phase !== 'finisher') bBody.rotation.z += (0 - bBody.rotation.z) * Math.min(1, dt * 9);
    bBody.rotation.x += (bLean - bBody.rotation.x) * Math.min(1, dt * 11);
    bBody.position.y += (bBob - bBody.position.y) * Math.min(1, dt * 9);
    bBody.scale.y += (bCrouch - bBody.scale.y) * Math.min(1, dt * 12);
    mats.bossFlash.opacity = boss.hitFlash * 0.5;
    // red telegraph glow while he winds up
    mats.telegraph.opacity = boss.bTelegraph > 0 ? 0.32 + Math.abs(Math.sin(t * 16)) * 0.22 : 0;

    // ---------------- projectile ----------------
    if (projRef.current) {
      const live = boss.projX > -90;
      projRef.current.visible = live;
      if (live) {
        projRef.current.position.set(boss.projX, 1.25 + Math.sin(t * 14) * 0.08, 0);
        projRef.current.rotation.z += dt * 12;
      }
    }

    // ---------------- hit sparks ----------------
    for (let i = 0; i < FX_SLOTS; i += 1) {
      const sprite = fxRefs.current[i];
      if (!sprite) continue;
      const f = boss.fx[i];
      if (!f || f.t > 0.5) {
        sprite.visible = false;
        continue;
      }
      sprite.visible = true;
      const k = f.t / 0.5;
      const size = f.kind === 'super' ? 5 : f.kind === 'chip' ? 1.2 : 2.4;
      sprite.position.set(f.x, f.y, 0.4);
      sprite.scale.setScalar(size * (0.4 + k * 1.4));
      (sprite.material as THREE.SpriteMaterial).opacity = (1 - k) * (f.kind === 'chip' ? 0.6 : 1);
      (sprite.material as THREE.SpriteMaterial).color.set(
        f.kind === 'chip' ? '#7fe8ff' : f.kind === 'super' ? '#ff5a3a' : '#ffe58a'
      );
    }

    // brazier flames flicker
    for (let i = 0; i < flameRefs.current.length; i += 1) {
      const flame = flameRefs.current[i];
      if (!flame) continue;
      const f = 0.8 + Math.abs(Math.sin(t * 10 + i * 2.1)) * 0.5;
      flame.scale.set(f, 0.7 + Math.abs(Math.sin(t * 13 + i)) * 0.6, f);
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group>
      {/* ---------------- stage ---------------- */}
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0, 0]}>
        <planeGeometry args={[30, 16]} />
      </mesh>
      {/* glowing stage boundary lines */}
      {[-7.6, 4.6].map((z) => (
        <mesh key={z} material={mats.edge} position={[-1.5, 0.03, z]}>
          <boxGeometry args={[30, 0.06, 0.12]} />
        </mesh>
      ))}

      {/* panorama backdrop dome */}
      <mesh material={mats.backdrop} position={[0, 4, 0]} rotation={[0, Math.PI * 0.5, 0]}>
        <sphereGeometry args={[34, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
      </mesh>

      {/* arena title */}
      <Text position={[-1.5, 7.2, 9.5]} rotation={[0, Math.PI, 0]} fontSize={1.1} anchorX="center" anchorY="middle" color="#ffd84d" outlineWidth={0.06} outlineColor="#140a02">
        MEGA KITCHEN ARENA
      </Text>

      {/* side braziers: giant ketchup-bottle pillars + fire */}
      {[
        [-11, 6.5],
        [8, 6.5],
        [-11, -5],
        [8, -5]
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <primitive object={bottle.scene.clone(true)} scale={6} />
          <mesh material={mats.brazier} position={[0, 3.3, 0]}>
            <cylinderGeometry args={[0.55, 0.4, 0.5, 10]} />
          </mesh>
          <mesh ref={(el) => (flameRefs.current[i] = el)} material={mats.flame} position={[0, 3.9, 0]}>
            <coneGeometry args={[0.45, 1.3, 9]} />
          </mesh>
          <pointLight position={[0, 4.2, 0]} intensity={14} color="#ff7a2a" distance={12} decay={2} />
        </group>
      ))}

      {/* key fight lighting */}
      <pointLight position={[-1.5, 9, -6]} intensity={50} color="#fff0d0" distance={30} decay={2} />
      <pointLight position={[-1.5, 4, 6]} intensity={20} color="#24d6ff" distance={24} decay={2} />

      {/* ---------------- fighters ---------------- */}
      <group ref={heroRoot}>
        <group ref={heroBody}>
          <primitive object={heroModel} />
          <mesh material={mats.heroFlash} position={[0, 1.1, 0]} scale={1.15}>
            <sphereGeometry args={[1.1, 12, 10]} />
          </mesh>
        </group>
      </group>
      <group ref={bossRoot}>
        <group ref={bossBody}>
          <primitive object={bossModel} />
          <mesh material={mats.bossFlash} position={[0, 1.6, 0]} scale={1.2}>
            <sphereGeometry args={[1.6, 12, 10]} />
          </mesh>
          <mesh material={mats.telegraph} position={[0, 1.6, 0]} scale={1.28}>
            <sphereGeometry args={[1.6, 12, 10]} />
          </mesh>
        </group>
      </group>

      {/* sauce projectile */}
      <group ref={projRef} visible={false}>
        <primitive object={projModel} scale={2.2} />
      </group>

      {/* hit spark sprites */}
      {Array.from({ length: FX_SLOTS }, (_, i) => (
        <sprite key={i} ref={(el) => (fxRefs.current[i] = el)} visible={false} material={mats.spark.clone()} />
      ))}
    </group>
  );
}
