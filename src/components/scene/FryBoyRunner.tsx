import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { isSliding, sim } from '../../game/engine';
import { useRunnerStore } from '../../game/runnerStore';
import { FighterRig, type RigIntent } from './FighterRig';

const RUN_CLIPS = {
  run: '/models/anim/hero_Running.glb',
  jump: '/models/anim/hero_Jump_Over_Obstacle.glb',
  slide: '/models/anim/hero_slide_light.glb'
};

/** maps the runner sim to animation intents */
function runnerDriver(): RigIntent {
  const status = useRunnerStore.getState().status;
  if (status !== 'running') return { clip: 'run', speed: 0.55 }; // menu jog
  if (isSliding()) return { clip: 'slide', loop: false, speed: 1.6 };
  if (!sim.grounded) return { clip: 'jump', loop: false, speed: 1.3 };
  return { clip: 'run', speed: THREE.MathUtils.clamp(sim.worldSpeed / 11, 0.95, 2.0) };
}

/**
 * FRY BOY as the runner: the user's Meshy character with real run, jump and
 * slide animations, plus the power-up auras carried over from the old
 * procedural runner.
 */
export function FryBoyRunner() {
  const root = useRef<THREE.Group>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const boostRef = useRef<THREE.Mesh>(null);
  const magnetRef = useRef<THREE.Group>(null);
  const prevLaneX = useRef(0);

  const mats = useMemo(
    () => ({
      shield: new THREE.MeshStandardMaterial({
        color: '#24d6ff',
        emissive: '#24d6ff',
        emissiveIntensity: 1.1,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide
      }),
      boost: new THREE.MeshBasicMaterial({ color: '#67ff72', transparent: true, opacity: 0.55 }),
      magnet: new THREE.MeshStandardMaterial({ color: '#ff4a4a', emissive: '#ff4a4a', emissiveIntensity: 2, transparent: true, opacity: 0.8 }),
      glow: new THREE.MeshBasicMaterial({ color: '#ff6a1a', transparent: true, opacity: 0.1 })
    }),
    []
  );

  /* eslint-disable react-hooks/immutability -- imperative r3f per-frame updates */
  useFrame((state, dt) => {
    if (!root.current) return;
    root.current.position.set(sim.laneX, sim.playerY, 0);

    // lane lean + speed pitch + corner flourish (same feel as before)
    const laneVelocity = (sim.laneX - prevLaneX.current) / Math.max(dt, 0.001);
    prevLaneX.current = sim.laneX;
    const targetRoll = THREE.MathUtils.clamp(-laneVelocity * 0.03, -0.28, 0.28);
    root.current.rotation.z += (targetRoll - root.current.rotation.z) * Math.min(1, dt * 10);
    const sliding = isSliding();
    const targetPitch = sliding ? 0.35 : sim.grounded ? 0.05 + sim.worldSpeed * 0.003 : -0.12;
    root.current.rotation.x += (targetPitch - root.current.rotation.x) * Math.min(1, dt * 9);
    root.current.rotation.y = -sim.lastTurnDir * sim.turnLean * 0.6;

    // power-up visuals
    const t = state.clock.elapsedTime;
    if (shieldRef.current) {
      const active = sim.powerups.shield > 0;
      shieldRef.current.visible = active;
      if (active) {
        shieldRef.current.scale.setScalar(1 + Math.sin(t * 5) * 0.04);
        const fading = sim.powerups.shield < 2;
        mats.shield.opacity = fading ? 0.08 + Math.abs(Math.sin(t * 10)) * 0.14 : 0.16;
      }
    }
    if (boostRef.current) {
      const active = sim.powerups.speedBoost > 0;
      boostRef.current.visible = active;
      if (active) boostRef.current.scale.y = 1 + Math.sin(t * 22) * 0.25;
    }
    if (magnetRef.current) {
      const active = sim.powerups.magnet > 0;
      magnetRef.current.visible = active;
      if (active) magnetRef.current.rotation.y += dt * 3.2;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={root}>
      <FighterRig rigUrl="/models/hero_rig.glb" clips={RUN_CLIPS} height={1.95} driver={runnerDriver} />

      {/* power-up auras */}
      <mesh ref={shieldRef} material={mats.shield} position={[0, 1.05, 0]} visible={false}>
        <sphereGeometry args={[1.2, 24, 18]} />
      </mesh>
      <mesh ref={boostRef} material={mats.boost} position={[0, 0.9, 0.85]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.42, 1.9, 14]} />
      </mesh>
      <group ref={magnetRef} position={[0, 1.0, 0]} visible={false}>
        <mesh material={mats.magnet} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.0, 0.035, 8, 40]} />
        </mesh>
        <mesh material={mats.magnet} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.4, 0]} scale={0.8}>
          <torusGeometry args={[1.0, 0.028, 8, 40]} />
        </mesh>
      </group>

      {/* soft contact glow */}
      <mesh material={mats.glow} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
      </mesh>
    </group>
  );
}
