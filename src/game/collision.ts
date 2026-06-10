import { MAGNET_RADIUS, OBSTACLES, PLAYER_COLLISION_RADIUS, PLAYER_COLLISION_Z } from './constants';
import type { CoinEntity, ObstacleEntity, PowerupEntity, PowerupTimers } from './types';

export function isObstacleHit(obstacle: ObstacleEntity, lane: number, playerY: number, isSliding: boolean) {
  if (!obstacle.active || obstacle.lane !== lane) return false;
  if (Math.abs(obstacle.z - PLAYER_COLLISION_Z) > PLAYER_COLLISION_RADIUS) return false;

  const clearance = OBSTACLES[obstacle.kind].clearance;
  if (clearance === 'jump' && playerY > 1.05) return false;
  if (clearance === 'slide' && isSliding) return false;
  return true;
}

export function isCoinCollected(coin: CoinEntity, lane: number, powerups: PowerupTimers) {
  if (!coin.active || coin.collected) return false;

  const zDistance = Math.abs(coin.z - PLAYER_COLLISION_Z);
  if (coin.lane === lane && zDistance < 1.1) return true;
  return powerups.magnet > 0 && zDistance < MAGNET_RADIUS && Math.abs(coin.lane - lane) <= 1;
}

export function isPowerupCollected(powerup: PowerupEntity, lane: number) {
  return powerup.active && powerup.lane === lane && Math.abs(powerup.z - PLAYER_COLLISION_Z) < 1.12;
}
