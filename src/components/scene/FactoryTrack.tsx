import { useMemo } from 'react';
import { useRunnerStore } from '../../game/runnerStore';

interface FactoryTrackProps {
  segmentCount: number;
  segmentLength: number;
}

function TrackSegment({ z, index, length }: { z: number; index: number; length: number }) {
  const stripeColor = index % 2 === 0 ? '#24d6ff' : '#ff6a1a';

  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, -0.08, length / 2]}>
        <boxGeometry args={[8.4, 0.16, length]} />
        <meshStandardMaterial color="#151922" metalness={0.7} roughness={0.28} emissive="#05070b" />
      </mesh>
      {[-2.4, 0, 2.4].map((x) => (
        <mesh key={x} position={[x, 0.025, length / 2]}>
          <boxGeometry args={[1.9, 0.035, length * 0.94]} />
          <meshStandardMaterial color="#1d232e" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
      {[-3.6, -1.2, 1.2, 3.6].map((x) => (
        <mesh key={x} position={[x, 0.08, length / 2]}>
          <boxGeometry args={[0.08, 0.08, length * 0.92]} />
          <meshStandardMaterial color={stripeColor} emissive={stripeColor} emissiveIntensity={1.5} />
        </mesh>
      ))}
      {Array.from({ length: 4 }).map((_, plate) => (
        <mesh key={plate} position={[0, 0.065, 1.5 + plate * 2.75]}>
          <boxGeometry args={[8.05, 0.03, 0.08]} />
          <meshStandardMaterial color="#343c4b" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function FactoryTrack({ segmentCount, segmentLength }: FactoryTrackProps) {
  const distance = useRunnerStore((state) => state.distance);
  const segments = useMemo(() => Array.from({ length: segmentCount }, (_, index) => index), [segmentCount]);
  const offset = -(distance % segmentLength) - segmentLength * 2;

  return (
    <group>
      {segments.map((index) => (
        <TrackSegment key={index} index={index} z={offset + index * segmentLength} length={segmentLength} />
      ))}
    </group>
  );
}
