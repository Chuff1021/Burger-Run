import { beforeEach, describe, expect, it } from 'vitest';
import { JUMP_VELOCITY, LANES, LANE_CHANGE_TIME, OBSTACLES, POWERUP_DURATION } from '../game/constants';
import { bendPoint, jump, moveLane, resetSim, sim, slide, stepSim } from '../game/engine';
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

  it('moveLane(+1) moves RIGHT on screen (-X when camera looks down +Z)', () => {
    // regression guard for the inverted-swipe bug: camera looks toward +Z,
    // so "screen right" is world -X — lane index must increase toward -X
    moveLane(1);
    for (let i = 0; i < 30; i += 1) stepSim(1 / 60);
    expect(sim.laneX).toBeLessThan(-1.5);
    expect(LANES[2]).toBeLessThan(LANES[0]);
  });

  it('completes a lane change in roughly LANE_CHANGE_TIME', () => {
    moveLane(-1);
    const steps = Math.ceil((LANE_CHANGE_TIME + 0.05) / (1 / 60));
    for (let i = 0; i < steps; i += 1) stepSim(1 / 60);
    expect(Math.abs(sim.laneX - LANES[0])).toBeLessThan(0.01);
  });

  it('retargets a lane change mid-tween (double swipe crosses two lanes)', () => {
    moveLane(-1);
    for (let i = 0; i < 5; i += 1) stepSim(1 / 60); // mid-tween
    moveLane(-1); // ignored at edge? no — from lane 0 it clamps
    expect(sim.lane).toBe(0);
    moveLane(1);
    moveLane(1);
    for (let i = 0; i < 30; i += 1) stepSim(1 / 60);
    expect(sim.lane).toBe(2);
    expect(Math.abs(sim.laneX - LANES[2])).toBeLessThan(0.01);
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

describe('corners', () => {
  beforeEach(() => {
    resetSim();
    sim.corners.length = 0;
  });

  it('swiping the turn direction inside the window consumes the corner', () => {
    sim.corners.push({ z: 5, dir: 1, consumed: false });
    moveLane(1);
    expect(sim.corners[0].consumed).toBe(true);
    expect(sim.lane).toBe(1); // turn does not change lanes
  });

  it('missing the turn crashes into the corner wall', () => {
    sim.corners.push({ z: 3, dir: -1, consumed: false });
    let alive = true;
    for (let i = 0; i < 60 && alive; i += 1) alive = stepSim(1 / 60);
    expect(alive).toBe(false);
  });

  it('a consumed corner is crossed seamlessly and kicks the camera yaw', () => {
    sim.corners.push({ z: 3, dir: 1, consumed: false });
    moveLane(1);
    let alive = true;
    for (let i = 0; i < 60 && alive; i += 1) alive = stepSim(1 / 60);
    expect(alive).toBe(true);
    expect(sim.corners).toHaveLength(0);
    expect(sim.cameraYawKick).toBeCloseTo(Math.PI / 2, 3);
  });

  it('bendPoint rotates points beyond a right-turn corner toward screen-right (-X)', () => {
    sim.corners.push({ z: 10, dir: 1, consumed: false });
    const out = { x: 0, z: 0, yaw: 0 };
    bendPoint(0, 18, out); // 8m past the corner
    expect(out.x).toBeCloseTo(-8, 4);
    expect(out.z).toBeCloseTo(10, 4);
    expect(out.yaw).toBeCloseTo(-Math.PI / 2, 4);
    // points before the corner are untouched
    bendPoint(1.2, 4, out);
    expect(out.x).toBeCloseTo(1.2, 4);
    expect(out.z).toBeCloseTo(4, 4);
    expect(out.yaw).toBe(0);
  });

  it('corners eventually spawn during a long run with a clear runway around them', () => {
    sim.powerups.shield = 9999; // survive obstacles while running far
    let sawCorner = false;
    for (let i = 0; i < 60 * 60 && sim.running; i += 1) {
      stepSim(1 / 60);
      sim.powerups.shield = 9999;
      const corner = sim.corners[0];
      if (corner) {
        sawCorner = true;
        // nothing spawned in the corner clear zone
        for (const o of sim.obstacles) {
          if (o.active) expect(Math.abs(o.z - corner.z)).toBeGreaterThan(4);
        }
        if (!corner.consumed && corner.z < 8) moveLane(corner.dir);
      }
    }
    expect(sawCorner).toBe(true);
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

describe('campaign mode', () => {
  it('marathon has no checkpoints; campaign loads World 1', () => {
    resetSim('marathon');
    expect(sim.checkpoints).toHaveLength(0);
    resetSim('campaign');
    expect(sim.checkpoints).toEqual([600, 1250, 2000]);
    expect(sim.nextCheckpointIndex).toBe(0);
  });

  it('crossing a checkpoint emits the event once', () => {
    resetSim('campaign');
    sim.distance = 598;
    sim.powerups.shield = 9999;
    const events: string[] = [];
    for (let i = 0; i < 120; i += 1) {
      stepSim(1 / 60);
      sim.powerups.shield = 9999;
      for (const e of sim.events) events.push(e.type);
      sim.events.length = 0;
    }
    expect(events.filter((t) => t === 'checkpoint')).toHaveLength(1);
  });

  it('crossing the finish line emits finish and stops the run', () => {
    resetSim('campaign', 1960);
    sim.powerups.shield = 9999;
    let sawFinish = false;
    for (let i = 0; i < 300 && sim.running; i += 1) {
      stepSim(1 / 60);
      sim.powerups.shield = 9999;
      if (sim.events.some((e) => e.type === 'finish')) sawFinish = true;
      sim.events.length = 0;
    }
    expect(sawFinish).toBe(true);
    expect(sim.running).toBe(false);
  });

  it('respawn carry restores coins and score at the checkpoint', () => {
    resetSim('campaign', 600, { coins: 55, score: 12345 });
    expect(sim.runCoins).toBe(55);
    expect(sim.score).toBe(12345);
    expect(sim.distance).toBe(600);
    expect(sim.nextCheckpointIndex).toBe(1);
  });

  it('keeps a clear runway around checkpoint gates', () => {
    for (let trial = 0; trial < 10; trial += 1) {
      resetSim('campaign', 520);
      for (const o of sim.obstacles) {
        if (!o.active) continue;
        const absolute = 520 + o.z;
        expect(Math.abs(absolute - 600)).toBeGreaterThan(4);
      }
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
