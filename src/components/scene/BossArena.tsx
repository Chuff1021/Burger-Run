import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { boss } from '../../game/bossSim';
import { LANES } from '../../game/constants';
import { glowStreakTexture } from './textures';

const BOSS_Z = 15;

/**
 * THE MEGA MANAGER — a towering franchise-boss burger in a suit — plus the
 * attack telegraphs. Everything animates imperatively off the boss sim.
 */
export function BossArena() {
  const bossRoot = useRef<THREE.Group>(null);
  const bossBody = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const browL = useRef<THREE.Mesh>(null);
  const browR = useRef<THREE.Mesh>(null);
  const laneTelegraph = useRef<THREE.Mesh>(null);
  const lowBar = useRef<THREE.Mesh>(null);
  const highBar = useRef<THREE.Mesh>(null);
  const wave = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const mats = useMemo(
    () => ({
      bun: new THREE.MeshPhysicalMaterial({ color: '#e8973a', roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.5 }),
      patty: new THREE.MeshStandardMaterial({ color: '#46220e', roughness: 0.85 }),
      cheese: new THREE.MeshPhysicalMaterial({ color: '#ffc83d', roughness: 0.32, clearcoat: 0.5 }),
      suit: new THREE.MeshPhysicalMaterial({ color: '#1a1230', roughness: 0.4, metalness: 0.15, clearcoat: 0.5, clearcoatRoughness: 0.45 }),
      shirt: new THREE.MeshStandardMaterial({ color: '#f2ead6', roughness: 0.6 }),
      tie: new THREE.MeshStandardMaterial({ color: '#c41818', roughness: 0.45, emissive: '#3a0404', emissiveIntensity: 0.5 }),
      glove: new THREE.MeshStandardMaterial({ color: '#fff3cf', roughness: 0.5 }),
      brow: new THREE.MeshStandardMaterial({ color: '#2b1408', roughness: 0.7 }),
      eye: new THREE.MeshStandardMaterial({ color: '#fff8e6', roughness: 0.3, emissive: '#ffae1f', emissiveIntensity: 0.4 }),
      pupil: new THREE.MeshStandardMaterial({ color: '#1a0d04', roughness: 0.4 }),
      hitFlash: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }),
      telegraph: new THREE.MeshBasicMaterial({
        map: glowStreakTexture(),
        color: '#ff3b2a',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      bar: new THREE.MeshStandardMaterial({
        color: '#ff3b2a',
        emissive: '#ff2212',
        emissiveIntensity: 2.6,
        transparent: true,
        opacity: 0
      }),
      waveMat: new THREE.MeshStandardMaterial({
        color: '#ff6a1a',
        emissive: '#ff4a0a',
        emissiveIntensity: 2.8,
        transparent: true,
        opacity: 0
      }),
      arenaRing: new THREE.MeshStandardMaterial({ color: '#ffbf3f', emissive: '#ff9a1f', emissiveIntensity: 1.6, transparent: true, opacity: 0.85 })
    }),
    []
  );

  /* eslint-disable react-hooks/immutability -- imperative r3f per-frame animation */
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const root = bossRoot.current;
    const body = bossBody.current;
    if (!root || !body) return;

    const attack = boss.attack;
    const phase = boss.phase;

    // ---- boss body language ----
    let targetX = 0;
    let bodyY = 0;
    let lean = 0;
    let spin = 0;

    if (phase === 'intro') {
      bodyY = Math.abs(Math.sin(t * 2.2)) * 0.18;
      lean = Math.sin(t * 1.5) * 0.06;
    } else if (phase === 'dodge' && attack) {
      const k = Math.min(1, attack.t / attack.telegraph);
      if (attack.type === 'slam') {
        targetX = LANES[attack.lane] ?? 0;
        // rear up then slam down through the hit moment
        bodyY = attack.resolved ? Math.max(0, 0.9 - (attack.t - attack.telegraph) * 4) * -0.35 : Math.sin(k * Math.PI * 0.5) * 1.1;
        lean = attack.resolved ? 0.4 : -0.25 * k;
      } else if (attack.type === 'lowSweep') {
        lean = attack.resolved ? 0.15 : 0.45 * k;
        spin = attack.resolved ? (attack.t - attack.telegraph) * 9 : 0;
      } else if (attack.type === 'highSweep') {
        lean = attack.resolved ? -0.1 : -0.4 * k;
        spin = attack.resolved ? -(attack.t - attack.telegraph) * 9 : 0;
      } else {
        // shockwave: crouch then pound
        bodyY = attack.resolved ? -0.5 : -0.6 * k;
      }
    } else if (phase === 'windup') {
      const k = Math.min(1, boss.phaseT / 1.7);
      bodyY = k * 1.6;
      lean = Math.sin(t * 14) * 0.05 * k;
    } else if (phase === 'stagger' || phase === 'strike') {
      bodyY = -0.55;
      lean = Math.sin(t * 3.5) * 0.3;
      spin = Math.sin(t * 2.2) * 0.25;
    } else if (phase === 'victory') {
      // Smash-style launch: fly up and off spinning
      const k = boss.phaseT / 2.8;
      root.position.set(k * 14, 1.4 + k * k * 26, BOSS_Z + k * 10);
      root.rotation.z = k * 9;
      root.rotation.x = k * 5;
      return;
    }

    root.position.x += (targetX - root.position.x) * Math.min(1, dt * 6);
    root.position.y = 1.4;
    root.position.z = BOSS_Z;
    root.rotation.set(0, Math.PI, 0); // face the player
    body.position.y += (bodyY - body.position.y) * Math.min(1, dt * 8);
    body.rotation.x += (lean - body.rotation.x) * Math.min(1, dt * 8);
    body.rotation.y += (spin - body.rotation.y) * Math.min(1, dt * 8);

    // running-mad idle bob + hit flash
    body.position.y += Math.abs(Math.sin(t * 3.1)) * 0.06;
    mats.hitFlash.opacity = boss.hitFlash * 0.55;

    // angry brows knit harder as he loses pips
    const anger = 0.25 + (3 - boss.hp) * 0.12;
    if (browL.current) browL.current.rotation.z = -anger;
    if (browR.current) browR.current.rotation.z = anger;

    // ---- telegraphs ----
    const tl = laneTelegraph.current;
    const low = lowBar.current;
    const high = highBar.current;
    const wv = wave.current;
    if (!tl || !low || !high || !wv) return;
    mats.telegraph.opacity = 0;
    mats.bar.opacity = 0;
    mats.waveMat.opacity = 0;

    if (phase === 'dodge' && attack && !attack.resolved) {
      const k = attack.t / attack.telegraph;
      const pulse = 0.45 + Math.abs(Math.sin(t * 10)) * 0.4;
      if (attack.type === 'slam') {
        tl.position.set(LANES[attack.lane] ?? 0, 0.06, 5.5);
        tl.scale.set(2.3, 11, 1);
        mats.telegraph.opacity = pulse * (0.4 + k * 0.6);
      } else if (attack.type === 'lowSweep') {
        low.position.set(0, 0.45, BOSS_Z - 2 - k * (BOSS_Z - 2.5));
        mats.bar.opacity = 0.5 + k * 0.5;
      } else if (attack.type === 'highSweep') {
        high.position.set(0, 1.55, BOSS_Z - 2 - k * (BOSS_Z - 2.5));
        mats.bar.opacity = 0.5 + k * 0.5;
      } else {
        const r = 0.5 + k * BOSS_Z;
        wv.position.set(0, 0.25, BOSS_Z);
        wv.scale.setScalar(r);
        mats.waveMat.opacity = 0.85;
      }
    } else if (phase === 'windup') {
      const k = boss.phaseT / 1.7;
      const r = 0.5 + Math.max(0, k - 0.55) * 2.2 * BOSS_Z;
      wv.position.set(0, 0.25, BOSS_Z);
      wv.scale.setScalar(Math.max(0.5, r));
      mats.waveMat.opacity = 0.4 + k * 0.6;
    }

    // arena ring pulse
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.25;
      mats.arenaRing.opacity = 0.6 + Math.sin(t * 3) * 0.2;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group>
      {/* arena boundary ring */}
      <mesh ref={ringRef} material={mats.arenaRing} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 7.5]}>
        <ringGeometry args={[8.6, 9.0, 48]} />
      </mesh>

      {/* boss spotlights */}
      <pointLight position={[0, 8, BOSS_Z - 2]} intensity={36} color="#ffd84d" distance={22} decay={2} />
      <pointLight position={[-4, 3, BOSS_Z - 5]} intensity={18} color="#ff3b2a" distance={18} decay={2} />

      {/* ---------------- THE MEGA MANAGER ---------------- */}
      <group ref={bossRoot} position={[0, 1.4, BOSS_Z]}>
        <group ref={bossBody}>
          {/* suit torso */}
          <mesh material={mats.suit} position={[0, 0.4, 0]}>
            <boxGeometry args={[2.5, 2.1, 1.5]} />
          </mesh>
          {/* shirt + tie */}
          <mesh material={mats.shirt} position={[0, 0.55, -0.78]}>
            <boxGeometry args={[1.0, 1.6, 0.06]} />
          </mesh>
          <mesh material={mats.tie} position={[0, 0.45, -0.83]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.34, 0.34, 0.05]} />
          </mesh>
          <mesh material={mats.tie} position={[0, -0.05, -0.83]}>
            <boxGeometry args={[0.3, 0.9, 0.05]} />
          </mesh>

          {/* giant burger head */}
          <group position={[0, 2.15, 0]}>
            <mesh material={mats.bun} position={[0, 0.3, 0]}>
              <sphereGeometry args={[1.05, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            </mesh>
            <mesh material={mats.cheese} position={[0, 0.02, 0]} rotation={[0, Math.PI / 5, 0]}>
              <boxGeometry args={[1.85, 0.12, 1.85]} />
            </mesh>
            <mesh material={mats.patty} position={[0, -0.18, 0]}>
              <cylinderGeometry args={[1.0, 1.05, 0.32, 22]} />
            </mesh>
            <mesh material={mats.bun} position={[0, -0.45, 0]}>
              <cylinderGeometry args={[0.98, 0.9, 0.28, 22]} />
            </mesh>
            {/* furious eyes + brows on the front (-Z faces player after rotation) */}
            {[-0.42, 0.42].map((x, i) => (
              <group key={x} position={[x, 0.32, -0.88]}>
                <mesh material={mats.eye}>
                  <sphereGeometry args={[0.2, 12, 10]} />
                </mesh>
                <mesh material={mats.pupil} position={[0, 0, -0.13]}>
                  <sphereGeometry args={[0.09, 8, 8]} />
                </mesh>
                <mesh ref={i === 0 ? browL : browR} material={mats.brow} position={[0, 0.26, -0.08]}>
                  <boxGeometry args={[0.5, 0.12, 0.12]} />
                </mesh>
              </group>
            ))}
          </group>

          {/* arms with white gloves */}
          <group ref={leftArm} position={[-1.45, 0.9, 0]}>
            <mesh material={mats.suit} position={[0, -0.55, 0]}>
              <boxGeometry args={[0.5, 1.3, 0.5]} />
            </mesh>
            <mesh material={mats.glove} position={[0, -1.35, 0]}>
              <sphereGeometry args={[0.42, 12, 10]} />
            </mesh>
          </group>
          <group ref={rightArm} position={[1.45, 0.9, 0]}>
            <mesh material={mats.suit} position={[0, -0.55, 0]}>
              <boxGeometry args={[0.5, 1.3, 0.5]} />
            </mesh>
            <mesh material={mats.glove} position={[0, -1.35, 0]}>
              <sphereGeometry args={[0.42, 12, 10]} />
            </mesh>
          </group>

          {/* stubby legs */}
          {[-0.6, 0.6].map((x) => (
            <mesh key={x} material={mats.suit} position={[x, -1.0, 0]}>
              <boxGeometry args={[0.55, 0.9, 0.6]} />
            </mesh>
          ))}

          {/* hit flash shell */}
          <mesh material={mats.hitFlash} position={[0, 1, 0]} scale={1.45}>
            <sphereGeometry args={[1.6, 16, 12]} />
          </mesh>

          {/* name tag */}
          <Text position={[0, -2.0, -1.0]} rotation={[0, Math.PI, 0]} fontSize={0.4} anchorX="center" anchorY="middle" color="#ffd84d" outlineWidth={0.025} outlineColor="#140a02">
            MEGA MANAGER
          </Text>
        </group>
      </group>

      {/* ---------------- telegraphs ---------------- */}
      <mesh ref={laneTelegraph} material={mats.telegraph} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 6]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={lowBar} material={mats.bar} position={[0, 0.45, 10]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 8.4, 12]} />
      </mesh>
      <mesh ref={highBar} material={mats.bar} position={[0, 1.55, 10]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 8.4, 12]} />
      </mesh>
      <mesh ref={wave} material={mats.waveMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, BOSS_Z]}>
        <torusGeometry args={[1, 0.16, 10, 40]} />
      </mesh>
    </group>
  );
}
