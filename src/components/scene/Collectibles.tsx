import { laneX } from '../../game/math';
import { useRunnerStore } from '../../game/runnerStore';

export function Collectibles() {
  const coins = useRunnerStore((state) => state.coins);

  return (
    <group>
      {coins.filter((coin) => coin.active).map((coin) => (
        <group key={coin.id} position={[laneX(coin.lane), coin.y, coin.z]} rotation={[Math.PI / 2, 0, coin.z * 0.8]}>
          <mesh>
            <cylinderGeometry args={[0.34, 0.34, 0.09, 28]} />
            <meshStandardMaterial color="#ffbf3f" metalness={0.75} roughness={0.18} emissive="#ffd84d" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.055]}>
            <torusGeometry args={[0.19, 0.018, 8, 20]} />
            <meshStandardMaterial color="#fff2a8" emissive="#ffd84d" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
