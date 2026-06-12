import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { boss, BOSS_HOME_X, STAGE_MAX_X } from '../../game/bossSim';
import { glowStreakTexture, neonSignTexture } from './textures';

const STAGE_LEFT = -13.5;
const STAGE_RIGHT = 7;
const STAGE_W = STAGE_RIGHT - STAGE_LEFT;
const STAGE_MID = (STAGE_LEFT + STAGE_RIGHT) / 2;

/**
 * Cinematic grill-pit duel arena, viewed side-on. Fight axis = world X:
 * player stage-left (+X side of screen-left), MEGA MANAGER stage-right.
 * Camera (in CameraRig) frames it like a premium versus boss fight.
 */
export function BossArena() {
  const bossRoot = useRef<THREE.Group>(null);
  const bossBody = useRef<THREE.Group>(null);
  const browL = useRef<THREE.Mesh>(null);
  const browR = useRef<THREE.Mesh>(null);
  const zoneRef = useRef<THREE.Mesh>(null);
  const pinRef = useRef<THREE.Group>(null);
  const waveRef = useRef<THREE.Mesh>(null);

  const signTex = useMemo(() => neonSignTexture('GRILL PIT DUEL', '#ff3b2a', 'WIN OR BURN'), []);
  const halo = useMemo(() => glowStreakTexture(), []);

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
      stage: new THREE.MeshStandardMaterial({ color: '#171a22', metalness: 0.85, roughness: 0.28, envMapIntensity: 1.4 }),
      stageTop: new THREE.MeshStandardMaterial({ color: '#20242c', metalness: 0.9, roughness: 0.2, envMapIntensity: 1.7 }),
      cage: new THREE.MeshStandardMaterial({ color: '#090b10', metalness: 0.95, roughness: 0.22, emissive: '#140404', emissiveIntensity: 0.35 }),
      edgeGlow: new THREE.MeshStandardMaterial({ color: '#ffbf3f', emissive: '#ff4a0a', emissiveIntensity: 3.2 }),
      bloodline: new THREE.MeshStandardMaterial({ color: '#5e0803', emissive: '#ff1608', emissiveIntensity: 1.6, roughness: 0.35 }),
      flame: new THREE.MeshBasicMaterial({ color: '#ff7a1f', transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false }),
      underGlow: new THREE.MeshBasicMaterial({
        map: glowStreakTexture(),
        color: '#ff2b1c',
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      backdrop: new THREE.MeshStandardMaterial({ color: '#050609', metalness: 0.75, roughness: 0.42 }),
      sign: new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }),
      signHalo: new THREE.MeshBasicMaterial({
        map: halo,
        color: '#ff3b2a',
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      zone: new THREE.MeshBasicMaterial({
        map: glowStreakTexture(),
        color: '#ff3b2a',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      pin: new THREE.MeshStandardMaterial({ color: '#caa84d', metalness: 0.6, roughness: 0.3 }),
      pinGlow: new THREE.MeshStandardMaterial({ color: '#ff3b2a', emissive: '#ff2212', emissiveIntensity: 2.4 }),
      wave: new THREE.MeshStandardMaterial({
        color: '#ff6a1a',
        emissive: '#ff4a0a',
        emissiveIntensity: 2.8,
        transparent: true,
        opacity: 0
      })
    }),
    [signTex, halo]
  );

  /* eslint-disable react-hooks/immutability -- imperative r3f per-frame animation */
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const root = bossRoot.current;
    const body = bossBody.current;
    if (!root || !body) return;

    // ---- boss placement + body language ----
    root.position.set(boss.bossX, 1.4 + boss.bossY, 0);
    root.rotation.set(0, -Math.PI / 2, 0); // face +X (the player)

    let bodyY = 0;
    let lean = 0;
    const attack = boss.attack;
    if (boss.phase === 'launch' || boss.phase === 'victory') {
      root.rotation.z += dt * 11; // tumble
      root.rotation.x += dt * 5;
    } else if (boss.phase === 'attack' && attack) {
      const k = Math.min(1, attack.t / attack.telegraph);
      if (attack.type === 'slam') {
        bodyY = attack.resolved ? -0.4 : Math.sin(k * Math.PI * 0.5) * 1.4;
        lean = attack.resolved ? 0.5 : -0.3 * k;
      } else if (attack.type === 'shockwave') {
        bodyY = attack.resolved ? -0.55 : -0.65 * k;
      } else {
        lean = k * 0.5;
      }
    } else if (boss.phase === 'windup') {
      bodyY = (boss.phaseT / 1.5) * 1.7;
      lean = Math.sin(t * 14) * 0.06;
    } else if (boss.phase === 'stagger' || boss.phase === 'recovery') {
      bodyY = -0.5;
      lean = Math.sin(t * 3.5) * 0.32;
    } else {
      bodyY = Math.abs(Math.sin(t * 2.4)) * 0.15;
    }
    body.position.y += (bodyY - body.position.y) * Math.min(1, dt * 8);
    body.rotation.x += (lean - body.rotation.x) * Math.min(1, dt * 8);
    mats.hitFlash.opacity = boss.hitFlash * 0.6;

    const anger = 0.25 + (3 - boss.hp) * 0.12;
    if (browL.current) browL.current.rotation.z = -anger;
    if (browR.current) browR.current.rotation.z = anger;

    // ---- telegraphs ----
    mats.zone.opacity = 0;
    mats.wave.opacity = 0;
    if (pinRef.current) pinRef.current.visible = false;

    if (boss.phase === 'attack' && attack) {
      const k = Math.min(1, attack.t / attack.telegraph);
      const pulse = 0.45 + Math.abs(Math.sin(t * 10)) * 0.4;
      if (attack.type === 'slam' && zoneRef.current) {
        zoneRef.current.position.set(attack.zoneX, 0.05, 0);
        zoneRef.current.scale.set(3.6, 4.5, 1);
        mats.zone.opacity = pulse * (0.4 + k * 0.6);
      } else if ((attack.type === 'lowSweep' || attack.type === 'highSweep') && pinRef.current) {
        const flying = k > 0.55;
        pinRef.current.visible = true;
        pinRef.current.position.set(flying ? attack.pinX : boss.bossX + 1.5, attack.type === 'lowSweep' ? 0.55 : 1.6, 0);
        pinRef.current.rotation.z += dt * 14;
      } else if (attack.type === 'shockwave' && waveRef.current) {
        const radius = Math.max(0.4, (k - 0.4) * 1.8 * STAGE_W);
        waveRef.current.position.set(boss.bossX, 0.22, 0);
        waveRef.current.scale.setScalar(radius);
        mats.wave.opacity = k > 0.3 ? 0.85 : 0.3;
      }
    } else if (boss.phase === 'windup' && waveRef.current) {
      const k = boss.phaseT / 1.5;
      waveRef.current.position.set(boss.bossX, 0.22, 0);
      waveRef.current.scale.setScalar(Math.max(0.4, (k - 0.6) * 2.4 * STAGE_W));
      mats.wave.opacity = 0.35 + k * 0.6;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group>
      {/* ---------------- the grill-pit fight floor ---------------- */}
      <group>
        <mesh material={mats.stageTop} position={[STAGE_MID, -0.12, 0]}>
          <boxGeometry args={[STAGE_W, 0.24, 7]} />
        </mesh>
        {[-7.2, -4.8, -2.4, 0, 2.4, 4.8].map((x) => (
          <mesh key={x} material={mats.cage} position={[x, 0.035, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.04, 7.1, 0.06]} />
          </mesh>
        ))}
        {[-2.4, 0, 2.4].map((z) => (
          <mesh key={z} material={mats.bloodline} position={[STAGE_MID, 0.055, z]}>
            <boxGeometry args={[STAGE_W - 1.4, 0.025, 0.05]} />
          </mesh>
        ))}
        <mesh material={mats.stage} position={[STAGE_MID, -1.3, 0]}>
          <boxGeometry args={[STAGE_W - 1.2, 2.2, 5.6]} />
        </mesh>
        <mesh material={mats.edgeGlow} position={[STAGE_MID, 0.02, 3.45]}>
          <boxGeometry args={[STAGE_W, 0.08, 0.1]} />
        </mesh>
        <mesh material={mats.edgeGlow} position={[STAGE_MID, 0.02, -3.45]}>
          <boxGeometry args={[STAGE_W, 0.08, 0.1]} />
        </mesh>
        {[STAGE_LEFT, STAGE_RIGHT].map((x) => (
          <mesh key={x} material={mats.edgeGlow} position={[x, 0.02, 0]}>
            <boxGeometry args={[0.1, 0.08, 7]} />
          </mesh>
        ))}
        {/* furnace glow under the cage */}
        <mesh material={mats.underGlow} position={[STAGE_MID, -3.4, 0]} scale={[STAGE_W * 1.1, 5, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        {[-9.5, -5.5, -1.5, 2.5, 6.2].map((x, i) => (
          <mesh key={x} material={mats.flame} position={[x, -0.02, i % 2 ? -3.15 : 3.15]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.0, 1.8, 1]}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        ))}
      </group>

      {/* ---------------- backdrop ---------------- */}
      <group position={[STAGE_MID, 0, 7.5]}>
        <mesh material={mats.backdrop} position={[0, 5, 0.5]}>
          <boxGeometry args={[STAGE_W + 14, 16, 1]} />
        </mesh>
        {Array.from({ length: 14 }, (_, i) => -STAGE_W / 2 - 5 + i * ((STAGE_W + 10) / 13)).map((x) => (
          <mesh key={x} material={mats.cage} position={[x, 4.2, -0.08]}>
            <boxGeometry args={[0.16, 10.5, 0.2]} />
          </mesh>
        ))}
        {[1.1, 3.2, 5.3, 7.4].map((y) => (
          <mesh key={y} material={mats.cage} position={[0, y, -0.06]}>
            <boxGeometry args={[STAGE_W + 12, 0.12, 0.22]} />
          </mesh>
        ))}
        <mesh material={mats.signHalo} position={[0, 6.4, -0.15]} scale={[16, 7, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        <mesh material={mats.sign} position={[0, 6.4, -0.2]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[9.5, 3.5]} />
        </mesh>
        {/* hostile crowd shelf lights */}
        {[-8, -4, 0, 4, 8].map((x, i) => (
          <pointLight key={x} position={[x, 2.5, -1]} intensity={8} color={i % 2 ? '#24d6ff' : '#ff3b2a'} distance={9} decay={2} />
        ))}
      </group>

      {/* arena spotlights */}
      <pointLight position={[BOSS_HOME_X, 8, -3]} intensity={55} color="#ff3b2a" distance={25} decay={2} />
      <pointLight position={[STAGE_MAX_X, 7, -4]} intensity={34} color="#24d6ff" distance={20} decay={2} />
      <pointLight position={[STAGE_MID, 1.2, 1]} intensity={38} color="#ff8a1f" distance={18} decay={2} />

      {/* ---------------- THE MEGA MANAGER ---------------- */}
      <group ref={bossRoot} position={[BOSS_HOME_X, 1.4, 0]}>
        <group ref={bossBody}>
          <mesh material={mats.suit} position={[0, 0.4, 0]}>
            <boxGeometry args={[2.5, 2.1, 1.5]} />
          </mesh>
          <mesh material={mats.shirt} position={[0, 0.55, -0.78]}>
            <boxGeometry args={[1.0, 1.6, 0.06]} />
          </mesh>
          <mesh material={mats.tie} position={[0, 0.45, -0.83]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.34, 0.34, 0.05]} />
          </mesh>
          <mesh material={mats.tie} position={[0, -0.05, -0.83]}>
            <boxGeometry args={[0.3, 0.9, 0.05]} />
          </mesh>
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
          {[-1.45, 1.45].map((x) => (
            <group key={x} position={[x, 0.9, 0]}>
              <mesh material={mats.suit} position={[0, -0.55, 0]}>
                <boxGeometry args={[0.5, 1.3, 0.5]} />
              </mesh>
              <mesh material={mats.glove} position={[0, -1.35, 0]}>
                <sphereGeometry args={[0.42, 12, 10]} />
              </mesh>
            </group>
          ))}
          {[-0.6, 0.6].map((x) => (
            <mesh key={x} material={mats.suit} position={[x, -1.0, 0]}>
              <boxGeometry args={[0.55, 0.9, 0.6]} />
            </mesh>
          ))}
          <mesh material={mats.hitFlash} position={[0, 1, 0]} scale={1.45}>
            <sphereGeometry args={[1.6, 16, 12]} />
          </mesh>
        </group>
      </group>

      {/* ---------------- telegraphs / attack props ---------------- */}
      <mesh ref={zoneRef} material={mats.zone} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* the rolling pin — giant, lies across the stage and spins as it flies */}
      <group ref={pinRef} visible={false}>
        <mesh material={mats.pin} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 4.6, 12]} />
        </mesh>
        {[-2.55, 2.55].map((z) => (
          <mesh key={z} material={mats.pinGlow} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.6, 8]} />
          </mesh>
        ))}
      </group>
      <mesh ref={waveRef} material={mats.wave} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
        <torusGeometry args={[1, 0.12, 10, 40]} />
      </mesh>
    </group>
  );
}
