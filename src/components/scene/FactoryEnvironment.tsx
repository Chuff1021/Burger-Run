import { Text } from '@react-three/drei';
import { useRunnerStore } from '../../game/runnerStore';

function NeonSign({ text, x, z, color }: { text: string; x: number; z: number; color: string }) {
  return (
    <group position={[x, 2.2, z]} rotation={[0, x < 0 ? 0.45 : -0.45, 0]}>
      <mesh>
        <boxGeometry args={[2.7, 0.84, 0.16]} />
        <meshStandardMaterial color="#1a1010" metalness={0.5} roughness={0.28} emissive={color} emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[2.35, 0.11, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} />
      </mesh>
      <mesh position={[0, -0.28, -0.1]}>
        <boxGeometry args={[1.7, 0.08, 0.08]} />
        <meshStandardMaterial color="#24d6ff" emissive="#24d6ff" emissiveIntensity={2} />
      </mesh>
      <Text position={[0, 0.18, -0.15]} fontSize={0.28} anchorX="center" anchorY="middle" color="#fff8e6">
        {text}
      </Text>
    </group>
  );
}

function SaucePipe({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 4.2, z]} rotation={[0, 0, x < 0 ? -0.2 : 0.2]}>
      <mesh>
        <cylinderGeometry args={[0.34, 0.42, 4.6, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} metalness={0.35} roughness={0.22} />
      </mesh>
      <mesh position={[0, -2.55, 0]}>
        <coneGeometry args={[0.38, 0.9, 18]} />
        <meshStandardMaterial color="#d7dce4" metalness={0.8} roughness={0.18} emissive={color} emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, -3.05, 0]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
      </mesh>
    </group>
  );
}

function RobotArm({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 1.6, z]} rotation={[0, x < 0 ? 0.7 : -0.7, 0]}>
      <mesh>
        <sphereGeometry args={[0.42, 18, 18]} />
        <meshStandardMaterial color="#242b35" metalness={0.9} roughness={0.18} emissive="#24d6ff" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0.65 * Math.sign(-x), 0.35, 0]}>
        <boxGeometry args={[1.4, 0.32, 0.32]} />
        <meshStandardMaterial color="#c8891e" metalness={0.65} roughness={0.24} />
      </mesh>
      <mesh position={[1.35 * Math.sign(-x), -0.15, 0]}>
        <boxGeometry args={[1.2, 0.26, 0.26]} />
        <meshStandardMaterial color="#1c222d" metalness={0.85} roughness={0.2} emissive="#ff6a1a" emissiveIntensity={0.18} />
      </mesh>
    </group>
  );
}

export function FactoryEnvironment() {
  const distance = useRunnerStore((state) => state.distance);
  const base = -(distance % 24);
  const props = Array.from({ length: 9 }, (_, index) => base + index * 24 - 28);

  return (
    <group>
      {props.map((z, index) => (
        <group key={index}>
          <mesh position={[-5.4, 0.8, z + 8]}>
            <boxGeometry args={[1.2, 1.6, 8]} />
            <meshStandardMaterial color="#151922" metalness={0.8} roughness={0.25} emissive="#ff6a1a" emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[5.4, 0.8, z + 8]}>
            <boxGeometry args={[1.2, 1.6, 8]} />
            <meshStandardMaterial color="#151922" metalness={0.8} roughness={0.25} emissive="#24d6ff" emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[0, 5.1, z + 10]}>
            <boxGeometry args={[10.8, 0.34, 0.42]} />
            <meshStandardMaterial color="#232b36" metalness={0.82} roughness={0.2} emissive="#24d6ff" emissiveIntensity={0.12} />
          </mesh>
          <NeonSign text={index % 2 ? 'FRY ZONE' : 'FLAME'} x={index % 2 ? 5.2 : -5.2} z={z + 6} color={index % 2 ? '#ffbf3f' : '#ff2f2f'} />
          <SaucePipe x={index % 2 ? 3.9 : -3.9} z={z + 11} color={index % 2 ? '#ffd84d' : '#ff2f2f'} />
          <RobotArm x={index % 2 ? -4.2 : 4.2} z={z + 14} />
          <mesh position={[index % 2 ? -5.2 : 5.2, 0.45, z + 16]}>
            <boxGeometry args={[2.4, 0.9, 2.5]} />
            <meshStandardMaterial color="#32120e" emissive="#ff6a1a" emissiveIntensity={0.55} metalness={0.35} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
