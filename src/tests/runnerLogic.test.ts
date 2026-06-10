import { beforeEach, describe, expect, it } from 'vitest';
import { JUMP_VELOCITY, OBSTACLES, POWERUP_DURATION } from '../game/constants';
import { jump, moveLane, resetSim, sim, slide, stepSim } from '../game/engine';
import { resolveSwipeGesture } from '../game/input';
import { spawnChunk } from '../game/patterns';

describe('engine basics', () => {
  beforeEach(() => {
    resetSim();
  });

  it('starts in the center lane with a clear runway', () => {
    expect(sim.lane).toBe(1);
    const early = sim.obstacles.filter((o) => o.active && o.z < 18);
    expect(early).toHaveLength(0);
  });

  it('clamps lane movement to the track', () => {
    moveLane(-1);
    moveLane(-1);
    moveLane(-1);
    expect(sim.lane).toBe(0);
    moveLane(1);
    moveLane(1);
    moveLane(1);
    moveLane(1);
    expect(sim.lane).toBe(2);
  });

  it('only jumps when grounded', () => {
    expect(jump()).toBe(true);
    expect(sim.verticalVelocity).toBe(JUMP_VELOCITY);
    expect(jump()).toBe(false);
  });

  it('fast-falls when sliding mid-air', () => {
    jump();
    stepSim(0.1);
    expect(sim.playerY).toBeGreaterThan(0);
    slide();
    expect(sim.verticalVelocity).toBeLessThan(0);
  });

  it('advances distance and score over time', () => {
    for (let i = 0; i < 60; i += 1) stepSim(1 / 60);
    expect(sim.distance).toBeGreaterThan(10);
    expect(sim.score).toBeGreaterThan(0);
  });

  it('crashes on a solid obstacle in the player lane', () => {
    for (const o of sim.obstacles) o.active = false;
    const obstacle = sim.obstacles[0];
    obstacle.active = true;
    obstacle.lane = 1;
    obstacle.kind = 'hotCrate';
    obstacle.z = 3;
    let alive = true;
    for (let i = 0; i < 120 && alive; i += 1) alive = stepSim(1 / 60);
    expect(alive).toBe(false);
    expect(sim.running).toBe(false);
  });

  it('clears a jumpable obstacle when airborne', () => {
    for (const o of sim.obstacles) o.active = false;
    const obstacle = sim.obstacles[0];
    obstacle.active = true;
    obstacle.lane = 1;
    obstacle.kind = 'meatRoller';
    obstacle.z = 6;
    let alive = true;
    for (let i = 0; i < 240 && alive; i += 1) {
      if (obstacle.z < 5 && sim.grounded) jump();
      alive = stepSim(1 / 60);
      if (obstacle.z < -2) break;
    }
    expect(alive).toBe(true);
  });

  it('shield absorbs one hit', () => {
    sim.powerups.shield = POWERUP_DURATION.shield;
    for (const o of sim.obstacles) o.active = false;
    const obstacle = sim.obstacles[0];
    obstacle.active = true;
    obstacle.lane = 1;
    obstacle.kind = 'hotCrate';
    obstacle.z = 3;
    let alive = true;
    for (let i = 0; i < 120 && alive; i += 1) alive = stepSim(1 / 60);
    expect(alive).toBe(true);
    expect(sim.powerups.shield).toBe(0);
  });

  it('magnet pulls coins in from any lane', () => {
    sim.powerups.magnet = POWERUP_DURATION.magnet;
    for (const c of sim.coins) c.active = false;
    const coin = sim.coins[0];
    coin.active = true;
    coin.lane = 0;
    coin.x = -2.4;
    coin.y = 1.05;
    coin.baseY = 1.05;
    coin.z = 6;
    coin.pull = 0;
    const startCoins = sim.runCoins;
    for (let i = 0; i < 120; i += 1) stepSim(1 / 60);
    expect(sim.runCoins).toBeGreaterThan(startCoins);
  });
});

describe('pattern spawning', () => {
  beforeEach(() => {
    resetSim();
  });

  it('every spawned row leaves at least one survivable lane', () => {
    for (const o of sim.obstacles) o.active = false;
    for (const c of sim.coins) c.active = false;
    for (let trial = 0; trial < 200; trial += 1) {
      spawnChunk({ z: 0, distance: 5000, obstacles: sim.obstacles, coins: sim.coins, powerups: sim.pickups });
      const active = sim.obstacles.filter((o) => o.active);
      const rows = new Map<number, typeof active>();
      for (const o of active) {
        const key = Math.round(o.z / 2);
        const row = rows.get(key) ?? [];
        row.push(o);
        rows.set(key, row);
      }
      for (const row of rows.values()) {
        const blockedSolid = row.filter((o) => OBSTACLES[o.kind].clearance === 'none').map((o) => o.lane);
        expect(new Set(blockedSolid).size).toBeLessThan(3);
      }
      for (const o of sim.obstacles) o.active = false;
      for (const c of sim.coins) c.active = false;
      for (const p of sim.pickups) p.active = false;
    }
  });
});

describe('swipe gestures', () => {
  it('resolves the four directions', () => {
    expect(resolveSwipeGesture({ x: 0, y: 0 }, { x: 80, y: 4 })).toBe('right');
    expect(resolveSwipeGesture({ x: 80, y: 0 }, { x: 0, y: 4 })).toBe('left');
    expect(resolveSwipeGesture({ x: 0, y: 80 }, { x: 4, y: 0 })).toBe('up');
    expect(resolveSwipeGesture({ x: 0, y: 0 }, { x: 4, y: 80 })).toBe('down');
    expect(resolveSwipeGesture({ x: 0, y: 0 }, { x: 8, y: 8 })).toBeNull();
  });
});
