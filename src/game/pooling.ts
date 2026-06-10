import { COIN_POOL_SIZE, OBSTACLE_POOL_SIZE, POWERUP_POOL_SIZE } from './constants';
import type { CoinEntity, ObstacleEntity, PowerupEntity } from './types';

export const createObstaclePool = (): ObstacleEntity[] =>
  Array.from({ length: OBSTACLE_POOL_SIZE }, (_, id) => ({
    id,
    active: false,
    lane: 1,
    z: 0,
    kind: 'hotCrate'
  }));

export const createCoinPool = (): CoinEntity[] =>
  Array.from({ length: COIN_POOL_SIZE }, (_, id) => ({
    id,
    active: false,
    lane: 1,
    z: 0,
    y: 1.2,
    collected: false
  }));

export const createPowerupPool = (): PowerupEntity[] =>
  Array.from({ length: POWERUP_POOL_SIZE }, (_, id) => ({
    id,
    active: false,
    lane: 1,
    z: 0,
    type: 'magnet'
  }));
