import { Environment, Float, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { ACTIVE_TRACK_SEGMENTS, CHARACTER_ROSTER, TRACK_SEGMENT_LENGTH } from '../../game/constants';
import { useRunnerStore } from '../../game/runnerStore';
import { Collectibles } from './Collectibles';
import { Effects } from './Effects';
import { FactoryEnvironment } from './FactoryEnvironment';
import { FactoryTrack } from './FactoryTrack';
import { Obstacles } from './Obstacles';
import { PlayerBurger } from './PlayerBurger';
import { Powerups } from './Powerups';

function CameraRig() {
  const { camera } = useThree();

  /* eslint-disable react-hooks/immutability */
  useFrame((_, dt) => {
    const { laneX, playerY, speed, shake } = useRunnerStore.getState();
    const shakeAmount = shake > 0 ? Math.sin(performance.now() * 0.06) * shake * 0.16 : 0;
    const targetPosition = new THREE.Vector3(
      laneX * 0.18 + shakeAmount,
      4.45 + playerY * 0.22,
      -8.9 - Math.min(1.5, speed * 0.035)
    );
    camera.position.lerp(targetPosition, 1 - Math.pow(0.001, dt));
    camera.lookAt(laneX * 0.12, 1.25 + playerY * 0.18, 8);
    if ('fov' in camera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, 60 + Math.min(12, speed * 0.26), dt * 1.6);
      camera.updateProjectionMatrix();
    }
  });
  /* eslint-enable react-hooks/immutability */

  return null;
}

function SimulationStepper() {
  const tick = useRunnerStore((state) => state.tick);

  useFrame((_, dt) => {
    tick(Math.min(dt, 0.033));
  });

  return null;
}

export function BurgerRunnerScene() {
  const selectedCharacter = useRunnerStore((state) => state.save.selectedCharacter);
  const character = useMemo(
    () => CHARACTER_ROSTER.find((item) => item.id === selectedCharacter) ?? CHARACTER_ROSTER[0],
    [selectedCharacter]
  );

  return (
    <>
      <color attach="background" args={['#07090d']} />
      <fog attach="fog" args={['#07090d', 28, 160]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[0, 9, -4]} intensity={1.5} color="#fff2d1" />
      <pointLight position={[-4, 4, 7]} intensity={7} color="#24d6ff" distance={28} />
      <pointLight position={[4, 4, 14]} intensity={6} color="#ff6a1a" distance={26} />
      <spotLight position={[0, 12, 18]} target-position={[0, 0, 34]} angle={0.55} intensity={7} color="#ffd84d" />
      <Environment preset="night" />
      <Stars radius={90} depth={16} count={400} factor={3} saturation={0.25} fade speed={0.3} />

      <SimulationStepper />
      <CameraRig />
      <FactoryTrack segmentCount={ACTIVE_TRACK_SEGMENTS} segmentLength={TRACK_SEGMENT_LENGTH} />
      <FactoryEnvironment />
      <Obstacles />
      <Collectibles />
      <Powerups />
      <Effects />
      <Float speed={2.2} rotationIntensity={0.05} floatIntensity={0.18}>
        <PlayerBurger character={character} />
      </Float>
    </>
  );
}
