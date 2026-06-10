import { DESPAWN_Z, TRACK_SEGMENT_LENGTH } from './constants';
import { randomChoice } from './math';
import type { CoinEntity, ObstacleEntity, ObstacleKind, PowerupEntity, PowerupType } from './types';

const obstacleKinds: ObstacleKind[] = ['hotCrate', 'sauceRoller', 'grillFlame', 'sauceGate', 'robotArm'];
const powerupTypes: PowerupType[] = ['magnet', 'shield', 'speedBoost', 'doubleCoins', 'ketchupRush'];
const lanes = [0, 1, 2] as const;

export function recyclePassedEntities(
  obstacles: ObstacleEntity[],
  coins: CoinEntity[],
  powerups: PowerupEntity[]
) {
  for (const obstacle of obstacles) {
    if (obstacle.active && obstacle.z < DESPAWN_Z) obstacle.active = false;
  }
  for (const coin of coins) {
    if (coin.active && coin.z < DESPAWN_Z) {
      coin.active = false;
      coin.collected = false;
    }
  }
  for (const powerup of powerups) {
    if (powerup.active && powerup.z < DESPAWN_Z) powerup.active = false;
  }
}

export function moveEntities(
  obstacles: ObstacleEntity[],
  coins: CoinEntity[],
  powerups: PowerupEntity[],
  deltaZ: number
) {
  for (const obstacle of obstacles) {
    if (obstacle.active) obstacle.z -= deltaZ;
  }
  for (const coin of coins) {
    if (coin.active) coin.z -= deltaZ;
  }
  for (const powerup of powerups) {
    if (powerup.active) powerup.z -= deltaZ;
  }
}

export function spawnSegment(
  z: number,
  distance: number,
  obstacles: ObstacleEntity[],
  coins: CoinEntity[],
  powerups: PowerupEntity[]
) {
  const density = Math.min(0.78, 0.34 + distance / 2600);
  const coinPatternLane = randomChoice(lanes);
  const coinCount = Math.random() > 0.55 ? 7 : 5;

  for (let i = 0; i < coinCount; i += 1) {
    const coin = coins.find((item) => !item.active);
    if (!coin) break;
    coin.active = true;
    coin.collected = false;
    coin.lane = coinPatternLane;
    coin.z = z + 2 + i * 1.08;
    coin.y = i === Math.floor(coinCount / 2) && Math.random() > 0.58 ? 2.45 : 1.15;
  }

  if (Math.random() < density) {
    const blockedLane = randomChoice(lanes);
    const obstacle = obstacles.find((item) => !item.active);
    if (obstacle) {
      obstacle.active = true;
      obstacle.lane = blockedLane;
      obstacle.kind = randomChoice(obstacleKinds);
      obstacle.z = z + 6.2;
    }

    if (distance > 300 && Math.random() > 0.68) {
      const second = obstacles.find((item) => !item.active);
      if (second) {
        second.active = true;
        second.lane = randomChoice(lanes.filter((lane) => lane !== blockedLane));
        second.kind = randomChoice(obstacleKinds);
        second.z = z + 9.4;
      }
    }
  }

  if (distance > 120 && Math.random() > 0.9) {
    const powerup = powerups.find((item) => !item.active);
    if (powerup) {
      powerup.active = true;
      powerup.lane = randomChoice(lanes);
      powerup.type = randomChoice(powerupTypes);
      powerup.z = z + TRACK_SEGMENT_LENGTH * 0.72;
    }
  }
}
