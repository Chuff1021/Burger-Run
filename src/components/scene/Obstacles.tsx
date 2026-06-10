import { laneX } from '../../game/math';
import { useRunnerStore } from '../../game/runnerStore';
import type { ObstacleEntity } from '../../game/types';

function ObstacleMesh({ obstacle }: { obstacle: ObstacleEntity }) {
  const x = laneX(obstacle.lane);

  if (obstacle.kind === 'sauceGate') {
    return (
      <group position={[x, 1.65, obstacle.z]}>
        <mesh>
          <boxGeometry args={[1.75, 0.26, 0.42]} />
          <meshStandardMaterial color="#1e2834" metalness={0.7} roughness={0.22} emissive="#24d6ff" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, -0.32, 0]}>
          <boxGeometry args={[1.4, 0.12, 0.3]} />
          <meshStandardMaterial color="#ff2f2f" emissive="#ff2f2f" emissiveIntensity={1.4} />
        </mesh>
      </group>
    );
  }

  if (obstacle.kind === 'sauceRoller') {
    return (
      <group position={[x, 0.45, obstacle.z]} rotation={[0, 0, obstacle.z]}>
        <mesh>
          <cylinderGeometry args={[0.52, 0.52, 1.45, 22]} />
          <meshStandardMaterial color="#9b1818" roughness={0.25} metalness={0.35} emissive="#ff2f2f" emissiveIntensity={0.4} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.cos(i) * 0.52, Math.sin(i) * 0.52, 0]}>
            <coneGeometry args={[0.08, 0.24, 8]} />
            <meshStandardMaterial color="#d8dde8" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
    );
  }

  if (obstacle.kind === 'grillFlame') {
    return (
      <group position={[x, 0.45, obstacle.z]}>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[1.7, 0.18, 1.2]} />
          <meshStandardMaterial color="#1b1e24" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh>
          <coneGeometry args={[0.52, 1.45, 18]} />
          <meshStandardMaterial color="#ff6a1a" emissive="#ff6a1a" emissiveIntensity={2.2} transparent opacity={0.88} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[0.3, 1.0, 18]} />
          <meshStandardMaterial color="#ffd84d" emissive="#ffd84d" emissiveIntensity={1.7} transparent opacity={0.78} />
        </mesh>
      </group>
    );
  }

  if (obstacle.kind === 'robotArm') {
    return (
      <group position={[x, 0.95, obstacle.z]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.5, 0.36, 0.46]} />
          <meshStandardMaterial color="#c88723" metalness={0.7} roughness={0.2} emissive="#ffbf3f" emissiveIntensity={0.26} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.32, 18, 18]} />
          <meshStandardMaterial color="#202832" metalness={0.9} roughness={0.16} emissive="#24d6ff" emissiveIntensity={0.35} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0.55, obstacle.z]}>
      <mesh>
        <boxGeometry args={[1.5, 1.05, 1.35]} />
        <meshStandardMaterial color="#272d36" metalness={0.72} roughness={0.2} emissive="#ffbf3f" emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, 0.18, -0.7]}>
        <boxGeometry args={[1.05, 0.28, 0.08]} />
        <meshStandardMaterial color="#ffd84d" emissive="#ffbf3f" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, -0.22, -0.72]}>
        <boxGeometry args={[0.8, 0.1, 0.08]} />
        <meshStandardMaterial color="#ff2f2f" emissive="#ff2f2f" emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
}

export function Obstacles() {
  const obstacles = useRunnerStore((state) => state.obstacles);
  return (
    <group>
      {obstacles.filter((obstacle) => obstacle.active).map((obstacle) => (
        <ObstacleMesh key={obstacle.id} obstacle={obstacle} />
      ))}
    </group>
  );
}
