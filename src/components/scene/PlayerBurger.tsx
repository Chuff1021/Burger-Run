import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { CharacterDefinition } from '../../game/types';
import { useRunnerStore } from '../../game/runnerStore';

export function PlayerBurger({ character }: { character: CharacterDefinition }) {
  const group = useRef<Group>(null);
  const laneX = useRunnerStore((state) => state.laneX);
  const playerY = useRunnerStore((state) => state.playerY);
  const slideTimer = useRunnerStore((state) => state.slideTimer);
  const speed = useRunnerStore((state) => state.speed);
  const isSliding = slideTimer > 0 && playerY < 0.2;

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(performance.now() * 0.009) * 0.035;
    group.current.rotation.x += (isSliding ? -0.38 : 0 - group.current.rotation.x) * dt * 10;
  });

  const isRobot = character.id === 'robot';
  const isKing = character.id === 'king';

  return (
    <group ref={group} position={[laneX, 0.74 + playerY, 0]} scale={isSliding ? [1.05, 0.72, 1.12] : [1, 1, 1]}>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.72, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
        <meshStandardMaterial color={isRobot ? '#bfc7d4' : '#f0a53d'} metalness={isRobot ? 0.8 : 0.25} roughness={0.23} emissive={character.glow} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.73, 0.8, 0.22, 32]} />
        <meshStandardMaterial color="#2b120b" roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 0.1, 32]} />
        <meshStandardMaterial color={character.accent} emissive={character.accent} emissiveIntensity={0.28} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.67, 0.76, 0.2, 32]} />
        <meshStandardMaterial color="#63d65f" roughness={0.5} emissive="#67ff72" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.58, 0.68, 0.42, 32]} />
        <meshStandardMaterial color="#121620" metalness={0.4} roughness={0.25} emissive={character.accent} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, -0.15, -0.54]}>
        <boxGeometry args={[0.8, 0.34, 0.05]} />
        <meshStandardMaterial color="#fffbf0" emissive="#ff2f2f" emissiveIntensity={0.35} />
      </mesh>
      {[-0.32, 0, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.89, -0.1]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#fff1c4" />
        </mesh>
      ))}
      {isKing && (
        <group position={[0, 1.12, 0]}>
          <mesh>
            <cylinderGeometry args={[0.46, 0.52, 0.16, 5]} />
            <meshStandardMaterial color="#ffd84d" metalness={0.55} roughness={0.18} emissive="#ffbf3f" emissiveIntensity={0.45} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.3, 0.16, Math.sin((i / 5) * Math.PI * 2) * 0.3]}>
              <coneGeometry args={[0.09, 0.26, 4]} />
              <meshStandardMaterial color="#ffd84d" emissive="#ffbf3f" emissiveIntensity={0.45} />
            </mesh>
          ))}
        </group>
      )}
      <mesh position={[0, -0.78, -0.28]}>
        <boxGeometry args={[0.38, 0.72, 0.34]} />
        <meshStandardMaterial color="#1d2532" roughness={0.3} emissive={character.glow} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, -1.14, -0.5]}>
        <boxGeometry args={[0.52, 0.16, 0.5]} />
        <meshStandardMaterial color="#b66b28" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.95, 0.55]}>
        <coneGeometry args={[0.14 + speed * 0.004, 1.7, 18]} />
        <meshStandardMaterial color={character.glow} emissive={character.glow} emissiveIntensity={1.8} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
