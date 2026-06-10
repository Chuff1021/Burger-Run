import { describe, expect, it } from 'vitest';
import { isCoinCollected, isObstacleHit } from '../game/collision';
import { laneX } from '../game/math';
import type { CoinEntity, ObstacleEntity, PowerupTimers } from '../game/types';

const noPowerups: PowerupTimers = {
  magnet: 0,
  shield: 0,
  speedBoost: 0,
  doubleCoins: 0,
  ketchupRush: 0
};

describe('runner logic', () => {
  it('maps lanes to stable x positions', () => {
    expect(laneX(0)).toBe(-2.4);
    expect(laneX(1)).toBe(0);
    expect(laneX(2)).toBe(2.4);
  });

  it('requires jump clearance for floor hazards', () => {
    const obstacle: ObstacleEntity = {
      id: 1,
      active: true,
      lane: 1,
      z: 0,
      kind: 'grillFlame'
    };

    expect(isObstacleHit(obstacle, 1, 0, false)).toBe(true);
    expect(isObstacleHit(obstacle, 1, 1.2, false)).toBe(false);
  });

  it('requires slide clearance for overhead sauce gates', () => {
    const obstacle: ObstacleEntity = {
      id: 2,
      active: true,
      lane: 1,
      z: 0,
      kind: 'sauceGate'
    };

    expect(isObstacleHit(obstacle, 1, 0, false)).toBe(true);
    expect(isObstacleHit(obstacle, 1, 0, true)).toBe(false);
  });

  it('collects same-lane coins and expands range with magnet', () => {
    const coin: CoinEntity = {
      id: 1,
      active: true,
      collected: false,
      lane: 0,
      z: 3.2,
      y: 1
    };

    expect(isCoinCollected(coin, 1, noPowerups)).toBe(false);
    expect(isCoinCollected(coin, 1, { ...noPowerups, magnet: 4 })).toBe(true);
  });
});
