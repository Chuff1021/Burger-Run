import { Environment } from '@react-three/drei';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { boss } from '../../game/bossSim';
import { sim } from '../../game/engine';
import { BossArena } from './BossArena';
// (corner state is read straight off the sim inside useFrame)
import { useRunnerStore } from '../../game/runnerStore';
import { Collectibles } from './Collectibles';
import { Effects } from './Effects';
import { FactoryEnvironment } from './FactoryEnvironment';
import { FactoryTrack } from './FactoryTrack';
import { Obstacles } from './Obstacles';
import { FryBoyRunner } from './FryBoyRunner';
import { Powerups } from './Powerups';

const CAMERA_TARGET = new THREE.Vector3();
const CAMERA_POSITION = new THREE.Vector3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function CameraRig() {
  const { camera } = useThree();
  const status = useRunnerStore((state) => state.status);
  const yawOffset = useRef(0);
  // debug/QA handle
  useEffect(() => {
    (window as unknown as { __cam: unknown }).__cam = camera;
  }, [camera]);

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
        cam.fov = THREE.MathUtils.lerp(cam.fov, 58, Math.min(1, dt * 2));
        cam.updateProjectionMatrix();
      }
      return;
    }

    if (status === 'boss' || status === 'bossDefeat') {
      // Versus-fight camera: low side angle, tighter framing, heavy impact punch-in.
      const mid = (sim.laneX + boss.bossX) / 2;
      const span = Math.abs(sim.laneX - boss.bossX);
      const punchIn = boss.timeScale < 0.95 ? 0.66 : 1;
      const dist = THREE.MathUtils.clamp(span * 0.92 + 4.6, 7.5, 11.5) * punchIn;
      const height = 2.35 + boss.bossY * 0.2;
      CAMERA_POSITION.set(mid + shakeX, height + shakeY, -dist);
      camera.position.lerp(CAMERA_POSITION, 1 - Math.pow(0.002, dt));
      CAMERA_TARGET.set(mid, 1.75 + boss.bossY * 0.2, 0);
      camera.lookAt(CAMERA_TARGET);
      if ('fov' in camera) {
        const cam = camera as THREE.PerspectiveCamera;
        cam.fov = THREE.MathUtils.lerp(cam.fov, 47, Math.min(1, dt * 3));
        cam.updateProjectionMatrix();
      }
      return;
    }

    // ---- corner sweep: consume the engine's yaw kick, then ease back to 0 ----
    if (sim.cameraYawKick !== 0) {
      yawOffset.current += sim.cameraYawKick;
      sim.cameraYawKick = 0;
    }
    yawOffset.current *= Math.pow(0.045, dt); // ~0.5s sweep through the corner
    // pre-lean into an approaching corner so the player sees down the new leg
    let lean = 0;
    const corner = sim.corners[0];
    if (corner && corner.z < 16 && corner.z > 0) {
      const turnYaw = -corner.dir * (Math.PI / 2);
      lean = turnYaw * 0.32 * (1 - corner.z / 16);
    }
    const yaw = yawOffset.current + lean;

    CAMERA_POSITION.set(
      sim.laneX * 0.5 + shakeX,
      3.6 + sim.playerY * 0.3 + shakeY,
      -6.6 - Math.min(1.4, sim.worldSpeed * 0.028)
    ).applyAxisAngle(Y_AXIS, yaw);
    camera.position.lerp(CAMERA_POSITION, 1 - Math.pow(0.0003, dt));
    CAMERA_TARGET.set(sim.laneX * 0.36, 1.5 + sim.playerY * 0.25, 9).applyAxisAngle(Y_AXIS, yaw);
    camera.lookAt(CAMERA_TARGET);
    // bank into the sweep for that carving-the-corner feel
    camera.rotateZ(THREE.MathUtils.clamp(-yawOffset.current * 0.1, -0.12, 0.12));
    if ('fov' in camera) {
      const cam = camera as THREE.PerspectiveCamera;
      const boostKick = sim.powerups.speedBoost > 0 ? 8 : 0;
      cam.fov = THREE.MathUtils.lerp(cam.fov, 62 + Math.min(10, sim.worldSpeed * 0.22) + boostKick, Math.min(1, dt * 2.2));
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
 * Custom AI-generated burger-factory panorama (NVIDIA FLUX): red-tiled neon
 * kitchen with flame grills and sauce-bottle shelves — bespoke reflections
 * and ambient color for every metal and glossy surface in the game.
 */
function KitchenEnvironment() {
  const pano = useLoader(THREE.TextureLoader, '/hdri/burger_factory_pano.jpg');
  /* eslint-disable react-hooks/immutability -- one-time texture configuration */
  useMemo(() => {
    pano.mapping = THREE.EquirectangularReflectionMapping;
    pano.colorSpace = THREE.SRGBColorSpace;
  }, [pano]);
  /* eslint-enable react-hooks/immutability */
  return <Environment map={pano} environmentIntensity={1.05} />;
}

export function BurgerRunnerScene() {
  const inBossFight = useRunnerStore((state) => state.status === 'boss' || state.status === 'bossDefeat');

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
      {!inBossFight && (
        <>
          <FactoryTrack />
          <FactoryEnvironment />
          <Obstacles />
          <Collectibles />
          <Powerups />
          <Effects />
        </>
      )}
      {!inBossFight && <FryBoyRunner />}
      {inBossFight && <BossArena />}
      <PostFX />
    </>
  );
}
