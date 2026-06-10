import { laneX } from '../../game/math';
import { useRunnerStore } from '../../game/runnerStore';
import type { PowerupType } from '../../game/types';

const powerupColor: Record<PowerupType, string> = {
  magnet: '#ff2f2f',
  shield: '#24d6ff',
  speedBoost: '#67ff72',
  doubleCoins: '#ffbf3f',
  ketchupRush: '#ff2f2f'
};

export function Powerups() {
  const powerups = useRunnerStore((state) => state.pickupPowerups);

  return (
    <group>
      {powerups.filter((powerup) => powerup.active).map((powerup) => {
        const color = powerupColor[powerup.type];
        return (
          <group key={powerup.id} position={[laneX(powerup.lane), 1.28, powerup.z]} rotation={[0, powerup.z * 0.7, 0]}>
            <mesh>
              <octahedronGeometry args={[0.52]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.15} metalness={0.35} roughness={0.16} />
            </mesh>
            <mesh>
              <torusGeometry args={[0.72, 0.035, 8, 32]} />
              <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={1.8} transparent opacity={0.72} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
