import { useMemo } from 'react';
import { useRunnerStore } from '../../game/runnerStore';

interface EffectSeed {
  x: number;
  y: number;
  z: number;
  scale: number;
  color: string;
}

export function Effects() {
  const distance = useRunnerStore((state) => state.distance);
  const speed = useRunnerStore((state) => state.speed);
  const powerups = useRunnerStore((state) => state.powerups);
  const settings = useRunnerStore((state) => state.save.settings);
  const laneX = useRunnerStore((state) => state.laneX);
  const reduced = settings.reducedEffects || settings.quality === 'low';

  const speedLines = useMemo<EffectSeed[]>(
    () =>
      Array.from({ length: reduced ? 12 : 28 }, (_, index) => ({
        x: (index % 2 === 0 ? -1 : 1) * (3.9 + (index % 4) * 0.38),
        y: 0.6 + (index % 5) * 0.48,
        z: index * 6.8,
        scale: 0.8 + (index % 3) * 0.4,
        color: index % 3 === 0 ? '#24d6ff' : '#ffbf3f'
      })),
    [reduced]
  );

  const steamPuffs = useMemo<EffectSeed[]>(
    () =>
      Array.from({ length: reduced ? 8 : 18 }, (_, index) => ({
        x: (index % 2 === 0 ? -1 : 1) * (4.55 + (index % 3) * 0.35),
        y: 0.55 + (index % 4) * 0.22,
        z: index * 9.5 + 4,
        scale: 0.35 + (index % 4) * 0.12,
        color: '#dff8ff'
      })),
    [reduced]
  );

  const loop = (seedZ: number, span: number) => ((seedZ - (distance % span) + span) % span) - 12;

  return (
    <group>
      {speedLines.map((line, index) => (
        <mesh key={`line-${index}`} position={[line.x, line.y, loop(line.z, 150)]} rotation={[0, 0, line.x > 0 ? -0.2 : 0.2]}>
          <boxGeometry args={[0.035, 0.035, (0.75 + speed * 0.035) * line.scale]} />
          <meshStandardMaterial color={line.color} emissive={line.color} emissiveIntensity={1.6} transparent opacity={0.56} />
        </mesh>
      ))}

      {steamPuffs.map((puff, index) => (
        <mesh key={`steam-${index}`} position={[puff.x, puff.y + Math.sin(distance * 0.08 + index) * 0.12, loop(puff.z, 172)]}>
          <sphereGeometry args={[puff.scale, 12, 8]} />
          <meshStandardMaterial color={puff.color} emissive="#24d6ff" emissiveIntensity={0.12} transparent opacity={0.22} />
        </mesh>
      ))}

      {powerups.ketchupRush > 0 && (
        <group position={[laneX, 0.32, -0.3]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.05, 0.045, 8, 36]} />
            <meshStandardMaterial color="#ff2f2f" emissive="#ff2f2f" emissiveIntensity={2.4} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 0.1, -0.65]}>
            <coneGeometry args={[0.45, 2.4, 18]} />
            <meshStandardMaterial color="#ff2f2f" emissive="#ff2f2f" emissiveIntensity={1.9} transparent opacity={0.38} />
          </mesh>
        </group>
      )}
    </group>
  );
}
