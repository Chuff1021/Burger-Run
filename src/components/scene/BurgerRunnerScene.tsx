import { Environment } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CHARACTER_ROSTER } from '../../game/constants';
import { sim } from '../../game/engine';
import { useRunnerStore } from '../../game/runnerStore';
import { Collectibles } from './Collectibles';
import { Effects } from './Effects';
import { FactoryEnvironment } from './FactoryEnvironment';
import { FactoryTrack } from './FactoryTrack';
import { Obstacles } from './Obstacles';
import { PlayerBurger } from './PlayerBurger';
import { Powerups } from './Powerups';

const CAMERA_TARGET = new THREE.Vector3();
const CAMERA_POSITION = new THREE.Vector3();

function CameraRig() {
  const { camera } = useThree();
  const status = useRunnerStore((state) => state.status);

  /* eslint-disable react-hooks/immutability */
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const shakeX = sim.shake > 0 ? Math.sin(t * 60) * sim.shake * 0.18 : 0;
    const shakeY = sim.shake > 0 ? Math.cos(t * 47) * sim.shake * 0.12 : 0;

    if (status === 'menu') {
      // slow showcase drift around the runner
      CAMERA_POSITION.set(Math.sin(t * 0.18) * 2.2, 2.6 + Math.sin(t * 0.3) * 0.25, -6.2);
      camera.position.lerp(CAMERA_POSITION, 1 - Math.pow(0.0015, dt));
      CAMERA_TARGET.set(0, 1.4, 4);
      camera.lookAt(CAMERA_TARGET);
      if ('fov' in camera) {
        const cam = camera as THREE.PerspectiveCamera;
        cam.fov = THREE.MathUtils.lerp(cam.fov, 58, dt * 2);
        cam.updateProjectionMatrix();
      }
      return;
    }

    CAMERA_POSITION.set(
      sim.laneX * 0.5 + shakeX,
      3.6 + sim.playerY * 0.3 + shakeY,
      -6.6 - Math.min(1.4, sim.worldSpeed * 0.028)
    );
    camera.position.lerp(CAMERA_POSITION, 1 - Math.pow(0.0003, dt));
    CAMERA_TARGET.set(sim.laneX * 0.36, 1.5 + sim.playerY * 0.25, 9);
    camera.lookAt(CAMERA_TARGET);
    if ('fov' in camera) {
      const cam = camera as THREE.PerspectiveCamera;
      const boostKick = sim.powerups.speedBoost > 0 ? 8 : 0;
      cam.fov = THREE.MathUtils.lerp(cam.fov, 62 + Math.min(10, sim.worldSpeed * 0.22) + boostKick, dt * 2.2);
      cam.updateProjectionMatrix();
    }
  });
  /* eslint-enable react-hooks/immutability */

  return null;
}

/**
 * Compiles every material in the scene up front (the pools pre-mount all
 * obstacle/pickup variants) so no shader compilation stalls happen mid-run.
 */
function ShaderWarmup() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const id = window.setTimeout(() => {
      void gl.compileAsync(scene, camera).catch(() => gl.compile(scene, camera));
    }, 50);
    return () => window.clearTimeout(id);
  }, [gl, scene, camera]);
  return null;
}

function SimulationStepper() {
  const tick = useRunnerStore((state) => state.tick);
  useFrame((_, dt) => {
    tick(Math.min(dt, 0.033));
  });
  return null;
}

function PostFX() {
  const quality = useRunnerStore((state) => state.save.settings.quality);
  const reduced = useRunnerStore((state) => state.save.settings.reducedEffects);
  if (quality === 'low') return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={reduced ? 0.6 : 1.05}
        luminanceThreshold={0.26}
        luminanceSmoothing={0.16}
        mipmapBlur
        radius={0.75}
      />
      <ChromaticAberration offset={[0.0009, 0.0006]} radialModulation modulationOffset={0.4} />
      <Noise premultiply opacity={0.55} />
      <Vignette eskil={false} offset={0.16} darkness={0.82} />
    </EffectComposer>
  );
}

/**
 * Real HDRI environment (Poly Haven "metro noord", CC0): a night metro
 * corridor with warm/cool artificial lights — photographic reflections for
 * every metal, clearcoat, and glossy surface in the kitchen.
 */
function KitchenEnvironment() {
  return <Environment files="/hdri/metro_noord_1k.hdr" environmentIntensity={0.85} />;
}

export function BurgerRunnerScene() {
  const selectedCharacter = useRunnerStore((state) => state.save.selectedCharacter);
  const character = useMemo(
    () => CHARACTER_ROSTER.find((item) => item.id === selectedCharacter) ?? CHARACTER_ROSTER[0],
    [selectedCharacter]
  );

  return (
    <>
      <color attach="background" args={['#05070b']} />
      <fog attach="fog" args={['#0a0d14', 26, 118]} />

      {/* lighting: warm key from ahead, cyan/orange side fills, cool top */}
      <hemisphereLight intensity={0.55} color="#3d4d6b" groundColor="#2a160a" />
      <ambientLight intensity={0.5} color="#cdd8ee" />
      <directionalLight position={[3, 12, 14]} intensity={1.9} color="#ffeecb" />
      <pointLight position={[-6, 4, 10]} intensity={28} color="#ff7a2a" distance={28} decay={2} />
      <pointLight position={[5, 6, 20]} intensity={30} color="#24d6ff" distance={32} decay={2} />

      <KitchenEnvironment />
      <ShaderWarmup />
      <SimulationStepper />
      <CameraRig />
      <FactoryTrack />
      <FactoryEnvironment />
      <Obstacles />
      <Collectibles />
      <Powerups />
      <Effects />
      <PlayerBurger character={character} />
      <PostFX />
    </>
  );
}
