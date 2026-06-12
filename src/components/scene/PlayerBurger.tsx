import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { boss } from '../../game/bossSim';
import { isSliding, sim } from '../../game/engine';
import { useRunnerStore } from '../../game/runnerStore';
import type { CharacterDefinition } from '../../game/types';

/**
 * The Mega Burger runner, seen from behind: burger head, leather jacket,
 * gloved swinging arms, running legs with chunky sneakers. All animation is
 * imperative (refs + useFrame) so the character never re-renders mid-run.
 */
export function PlayerBurger({ character }: { character: CharacterDefinition }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const boostRef = useRef<THREE.Mesh>(null);
  const magnetRef = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const prevLaneX = useRef(0);

  const status = useRunnerStore((state) => state.status);

  const mats = useMemo(
    () => ({
      bunTop: new THREE.MeshPhysicalMaterial({
        color: character.bun,
        roughness: 0.42,
        clearcoat: 0.35,
        clearcoatRoughness: 0.5,
        emissive: '#3a1d05',
        emissiveIntensity: 0.25
      }),
      bunBottom: new THREE.MeshStandardMaterial({ color: '#d9882f', roughness: 0.6 }),
      patty: new THREE.MeshStandardMaterial({ color: '#4a2410', roughness: 0.85 }),
      cheese: new THREE.MeshPhysicalMaterial({
        color: '#ffc83d',
        roughness: 0.32,
        clearcoat: 0.5,
        clearcoatRoughness: 0.35,
        emissive: '#7a4a00',
        emissiveIntensity: 0.35
      }),
      lettuce: new THREE.MeshStandardMaterial({ color: '#5ecf4a', roughness: 0.65 }),
      tomato: new THREE.MeshPhysicalMaterial({ color: '#e03a2a', roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
      sesame: new THREE.MeshStandardMaterial({ color: '#fff3cf', roughness: 0.5 }),
      jacket: new THREE.MeshPhysicalMaterial({ color: character.jacket, roughness: 0.4, metalness: 0.1, clearcoat: 0.55, clearcoatRoughness: 0.45 }),
      patch: new THREE.MeshStandardMaterial({ color: character.accent, emissive: character.accent, emissiveIntensity: 0.55, roughness: 0.4 }),
      glove: new THREE.MeshStandardMaterial({ color: '#1a1d24', roughness: 0.5 }),
      cuff: new THREE.MeshStandardMaterial({ color: character.accent, emissive: character.accent, emissiveIntensity: 0.4 }),
      jeans: new THREE.MeshStandardMaterial({ color: '#22304a', roughness: 0.7 }),
      shoe: new THREE.MeshStandardMaterial({ color: '#d98e3f', roughness: 0.45 }),
      sole: new THREE.MeshStandardMaterial({ color: '#f4ead6', roughness: 0.4 }),
      shoeGlow: new THREE.MeshStandardMaterial({ color: character.glow, emissive: character.glow, emissiveIntensity: 1.6 }),
      shield: new THREE.MeshStandardMaterial({
        color: '#24d6ff',
        emissive: '#24d6ff',
        emissiveIntensity: 1.1,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide
      }),
      boost: new THREE.MeshBasicMaterial({ color: '#67ff72', transparent: true, opacity: 0.55 }),
      magnet: new THREE.MeshStandardMaterial({ color: '#ff4a4a', emissive: '#ff4a4a', emissiveIntensity: 2, transparent: true, opacity: 0.8 })
    }),
    [character]
  );

  useFrame((state, dt) => {
    if (!root.current || !body.current) return;
    const running = status === 'running';
    const sliding = isSliding();

    // root follows the sim
    root.current.position.x = sim.laneX;
    root.current.position.y = sim.playerY;
    root.current.position.z = 0;

    // lean into lane changes + slight forward lean with speed
    const laneVelocity = (sim.laneX - prevLaneX.current) / Math.max(dt, 0.001);
    prevLaneX.current = sim.laneX;
    const targetRoll = THREE.MathUtils.clamp(-laneVelocity * 0.035, -0.32, 0.32);
    root.current.rotation.z += (targetRoll - root.current.rotation.z) * Math.min(1, dt * 10);
    const targetPitch = sliding ? 0.85 : sim.grounded ? 0.1 + sim.worldSpeed * 0.004 : -0.18;
    root.current.rotation.x += (targetPitch - root.current.rotation.x) * Math.min(1, dt * 9);
    // corner flourish: whip the body toward the turn, easing back as turnLean decays
    root.current.rotation.y = -sim.lastTurnDir * sim.turnLean * 0.6;

    // boss fight: face the boss (-X), punch with the lead arm on attack
    if (boss.active) {
      root.current.rotation.y = -Math.PI / 2;
      root.current.rotation.x = sliding ? 0.42 : -0.08;
    }

    // run cycle
    const speedFactor = running ? sim.worldSpeed : 2.2;
    phase.current += dt * speedFactor * 0.85;
    const swing = Math.sin(phase.current);
    const swingB = Math.sin(phase.current + Math.PI);

    if (running && sim.grounded && !sliding) {
      body.current.position.y = Math.abs(Math.cos(phase.current)) * 0.09;
      body.current.rotation.y = swing * 0.07;
    } else {
      body.current.position.y = 0;
      body.current.rotation.y = 0;
    }

    const squash = sliding ? 0.55 : 1;
    body.current.scale.y += (squash - body.current.scale.y) * Math.min(1, dt * 12);

    if (leftLeg.current && rightLeg.current) {
      if (!sim.grounded) {
        leftLeg.current.rotation.x = -1.1;
        rightLeg.current.rotation.x = -0.45;
      } else if (sliding) {
        leftLeg.current.rotation.x = -1.45;
        rightLeg.current.rotation.x = -1.3;
      } else {
        leftLeg.current.rotation.x = swing * 0.95;
        rightLeg.current.rotation.x = swingB * 0.95;
      }
    }
    if (leftArm.current && rightArm.current) {
      if (!sim.grounded) {
        leftArm.current.rotation.x = -2.4;
        rightArm.current.rotation.x = -2.4;
        leftArm.current.rotation.z = 0.5;
        rightArm.current.rotation.z = -0.5;
      } else {
        leftArm.current.rotation.x = swingB * 1.0 - 0.25;
        rightArm.current.rotation.x = swing * 1.0 - 0.25;
        leftArm.current.rotation.z = 0.16;
        rightArm.current.rotation.z = -0.16;
      }
    }
    if (head.current) {
      head.current.rotation.z = swing * 0.05;
      head.current.position.y = 1.62 + Math.abs(Math.cos(phase.current)) * 0.025;
    }

    if (boss.active) {
      const strike = boss.atkPhase === 'startup' || boss.atkPhase === 'active';
      const recovering = boss.atkPhase === 'recover';
      body.current.rotation.y = strike ? -0.28 : Math.sin(state.clock.elapsedTime * 3.4) * 0.04;
      body.current.position.y = Math.sin(state.clock.elapsedTime * 5.5) * 0.025;
      if (leftArm.current && rightArm.current) {
        leftArm.current.rotation.x = sliding ? -1.15 : -1.45;
        leftArm.current.rotation.z = sliding ? 0.34 : 0.54;
        rightArm.current.rotation.x = strike ? -2.65 : recovering ? -0.85 : -1.35;
        rightArm.current.rotation.z = strike ? -0.42 : -0.34;
      }
      if (leftLeg.current && rightLeg.current) {
        leftLeg.current.rotation.x = -0.42;
        rightLeg.current.rotation.x = 0.32;
      }
      if (head.current) head.current.rotation.z = strike ? -0.18 : Math.sin(state.clock.elapsedTime * 4) * 0.04;
    }

    // powerup visuals
    if (shieldRef.current) {
      const active = sim.powerups.shield > 0;
      shieldRef.current.visible = active;
      if (active) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.04;
        shieldRef.current.scale.setScalar(pulse);
        const fading = sim.powerups.shield < 2;
        (shieldRef.current.material as THREE.MeshStandardMaterial).opacity = fading
          ? 0.08 + Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.14
          : 0.16;
      }
    }
    if (boostRef.current) {
      const active = sim.powerups.speedBoost > 0;
      boostRef.current.visible = active;
      if (active) {
        boostRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 22) * 0.25;
      }
    }
    if (magnetRef.current) {
      const active = sim.powerups.magnet > 0;
      magnetRef.current.visible = active;
      if (active) magnetRef.current.rotation.y += dt * 3.2;
    }
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* ---------------- head: the burger ---------------- */}
        <group ref={head} position={[0, 1.62, 0]}>
          {/* top bun */}
          <mesh material={mats.bunTop} position={[0, 0.16, 0]} castShadow>
            <sphereGeometry args={[0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
          </mesh>
          {/* sesame seeds */}
          {[
            [-0.2, 0.4, -0.1], [0.05, 0.46, -0.22], [0.24, 0.38, -0.05],
            [-0.05, 0.42, 0.18], [0.18, 0.35, 0.22], [-0.28, 0.32, 0.12]
          ].map((pos, i) => (
            <mesh key={i} material={mats.sesame} position={pos as [number, number, number]} rotation={[pos[0], pos[2], 0]}>
              <sphereGeometry args={[0.035, 8, 6]} />
            </mesh>
          ))}
          {/* tomato */}
          <mesh material={mats.tomato} position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.47, 0.47, 0.07, 24]} />
          </mesh>
          {/* lettuce — wavy disc */}
          <mesh material={mats.lettuce} position={[0, 0.05, 0]} rotation={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.52, 0.49, 0.06, 12]} />
          </mesh>
          {/* cheese, drooping corners */}
          <mesh material={mats.cheese} position={[0, -0.01, 0]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.78, 0.05, 0.78]} />
          </mesh>
          {/* patty */}
          <mesh material={mats.patty} position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.45, 0.46, 0.13, 24]} />
          </mesh>
          {/* bottom bun */}
          <mesh material={mats.bunBottom} position={[0, -0.19, 0]}>
            <cylinderGeometry args={[0.44, 0.4, 0.12, 24]} />
          </mesh>
        </group>

        {/* ---------------- jacket torso ---------------- */}
        <group position={[0, 1.02, 0]}>
          <mesh material={mats.jacket} castShadow>
            <boxGeometry args={[0.72, 0.62, 0.42]} />
          </mesh>
          {/* back patch with accent glow (reads "team colors" from behind) */}
          <mesh material={mats.patch} position={[0, 0.05, -0.225]}>
            <boxGeometry args={[0.46, 0.3, 0.02]} />
          </mesh>
          <mesh material={mats.cuff} position={[0, -0.28, 0]}>
            <boxGeometry args={[0.74, 0.07, 0.44]} />
          </mesh>
          {/* collar */}
          <mesh material={mats.jacket} position={[0, 0.34, -0.05]}>
            <boxGeometry args={[0.5, 0.1, 0.3]} />
          </mesh>
        </group>

        {/* ---------------- arms ---------------- */}
        <group ref={leftArm} position={[-0.44, 1.26, 0]}>
          <mesh material={mats.jacket} position={[0, -0.22, 0]}>
            <boxGeometry args={[0.18, 0.46, 0.18]} />
          </mesh>
          <mesh material={mats.cuff} position={[0, -0.43, 0]}>
            <boxGeometry args={[0.19, 0.06, 0.19]} />
          </mesh>
          <mesh material={mats.glove} position={[0, -0.54, 0]}>
            <sphereGeometry args={[0.12, 12, 10]} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.44, 1.26, 0]}>
          <mesh material={mats.jacket} position={[0, -0.22, 0]}>
            <boxGeometry args={[0.18, 0.46, 0.18]} />
          </mesh>
          <mesh material={mats.cuff} position={[0, -0.43, 0]}>
            <boxGeometry args={[0.19, 0.06, 0.19]} />
          </mesh>
          <mesh material={mats.glove} position={[0, -0.54, 0]}>
            <sphereGeometry args={[0.12, 12, 10]} />
          </mesh>
        </group>

        {/* ---------------- legs + sneakers ---------------- */}
        <group ref={leftLeg} position={[-0.18, 0.72, 0]}>
          <mesh material={mats.jeans} position={[0, -0.26, 0]}>
            <boxGeometry args={[0.2, 0.52, 0.22]} />
          </mesh>
          <group position={[0, -0.56, 0.06]}>
            <mesh material={mats.shoe}>
              <boxGeometry args={[0.24, 0.16, 0.46]} />
            </mesh>
            <mesh material={mats.sole} position={[0, -0.1, 0]}>
              <boxGeometry args={[0.26, 0.06, 0.5]} />
            </mesh>
            <mesh material={mats.shoeGlow} position={[0, -0.02, -0.235]}>
              <boxGeometry args={[0.18, 0.06, 0.02]} />
            </mesh>
          </group>
        </group>
        <group ref={rightLeg} position={[0.18, 0.72, 0]}>
          <mesh material={mats.jeans} position={[0, -0.26, 0]}>
            <boxGeometry args={[0.2, 0.52, 0.22]} />
          </mesh>
          <group position={[0, -0.56, 0.06]}>
            <mesh material={mats.shoe}>
              <boxGeometry args={[0.24, 0.16, 0.46]} />
            </mesh>
            <mesh material={mats.sole} position={[0, -0.1, 0]}>
              <boxGeometry args={[0.26, 0.06, 0.5]} />
            </mesh>
            <mesh material={mats.shoeGlow} position={[0, -0.02, -0.235]}>
              <boxGeometry args={[0.18, 0.06, 0.02]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ---------------- powerup auras ---------------- */}
      <mesh ref={shieldRef} material={mats.shield} position={[0, 1.1, 0]} visible={false}>
        <sphereGeometry args={[1.25, 24, 18]} />
      </mesh>
      <mesh ref={boostRef} material={mats.boost} position={[0, 0.9, 0.85]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.42, 1.9, 14]} />
      </mesh>
      <group ref={magnetRef} position={[0, 1.05, 0]} visible={false}>
        <mesh material={mats.magnet} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.05, 0.035, 8, 40]} />
        </mesh>
        <mesh material={mats.magnet} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.4, 0]} scale={0.8}>
          <torusGeometry args={[1.05, 0.028, 8, 40]} />
        </mesh>
      </group>

      {/* soft contact glow under the runner */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color={character.glow} transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
