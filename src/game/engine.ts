import {
  BOOST_MULTIPLIER,
  COIN_COLLECT_RADIUS,
  COIN_POOL_SIZE,
  DESPAWN_Z,
  EMPTY_POWERUPS,
  FALL_GRAVITY_MULT,
  FAST_FALL_VELOCITY,
  GOALS,
  GOAL_REWARD_BASE,
  GRAVITY,
  JUMP_VELOCITY,
  LANES,
  LANE_CHANGE_TIME,
  MAGNET_PULL_SPEED,
  MAGNET_RADIUS_Z,
  MAX_SPEED,
  MULTIPLIER_CAP,
  MULTIPLIER_STEP,
  NEAR_MISS_BONUS,
  OBSTACLES,
  OBSTACLE_POOL_SIZE,
  PLAYER_Z,
  POWERUP_DURATION,
  POWERUP_POOL_SIZE,
  SLIDE_DURATION,
  SPAWN_AHEAD_Z,
  SPEED_RAMP,
  START_SPEED
} from './constants';
import { clamp } from './math';
import { spawnChunk } from './patterns';
import type {
  CoinEntity,
  EngineEvent,
  ObstacleEntity,
  PowerupEntity,
  PowerupTimers
} from './types';

/**
 * The simulation lives OUTSIDE React. The scene reads `sim` directly inside
 * useFrame callbacks, so nothing re-renders per frame. The zustand store only
 * mirrors slow-changing UI state (score readouts at ~10 Hz, status changes).
 */

export interface Sim {
  running: boolean;
  time: number;
  score: number;
  distance: number;
  runCoins: number;
  multiplier: number;
  speed: number;
  /** effective forward speed after boosts (for FOV/FX) */
  worldSpeed: number;
  lane: number;
  laneX: number;
  /** lane-change tween state: world X at tween start, progress 0..1 */
  laneFromX: number;
  laneT: number;
  playerY: number;
  verticalVelocity: number;
  grounded: boolean;
  slideTimer: number;
  shake: number;
  /** seconds since run start the player has held a coin streak */
  coinStreak: number;
  powerups: PowerupTimers;
  obstacles: ObstacleEntity[];
  coins: CoinEntity[];
  pickups: PowerupEntity[];
  nextSpawnZ: number;
  nextGoalIndex: number;
  /** bumped whenever entities spawn/despawn so React lists can resync cheaply */
  poolVersion: number;
  events: EngineEvent[];
}

function createObstaclePool(): ObstacleEntity[] {
  return Array.from({ length: OBSTACLE_POOL_SIZE }, (_, id) => ({
    id,
    active: false,
    lane: 1,
    z: 0,
    kind: 'hotCrate' as const,
    seed: 0,
    passed: false
  }));
}

function createCoinPool(): CoinEntity[] {
  return Array.from({ length: COIN_POOL_SIZE }, (_, id) => ({
    id,
    active: false,
    lane: 1,
    x: 0,
    y: 1.05,
    z: 0,
    baseY: 1.05,
    spin: 0,
    pull: 0
  }));
}

function createPowerupPool(): PowerupEntity[] {
  return Array.from({ length: POWERUP_POOL_SIZE }, (_, id) => ({
    id,
    active: false,
    lane: 1,
    z: 0,
    type: 'magnet' as const
  }));
}

export const sim: Sim = {
  running: false,
  time: 0,
  score: 0,
  distance: 0,
  runCoins: 0,
  multiplier: 1,
  speed: START_SPEED,
  worldSpeed: START_SPEED,
  lane: 1,
  laneX: 0,
  laneFromX: 0,
  laneT: 1,
  playerY: 0,
  verticalVelocity: 0,
  grounded: true,
  slideTimer: 0,
  shake: 0,
  coinStreak: 0,
  powerups: { ...EMPTY_POWERUPS },
  obstacles: createObstaclePool(),
  coins: createCoinPool(),
  pickups: createPowerupPool(),
  nextSpawnZ: 0,
  nextGoalIndex: 0,
  poolVersion: 0,
  events: []
};

// debug/QA handle (read-only by convention)
declare global {
  interface Window {
    __burgerSim?: Sim;
  }
}
if (typeof window !== 'undefined') window.__burgerSim = sim;

export function resetSim() {
  sim.running = true;
  sim.time = 0;
  sim.score = 0;
  sim.distance = 0;
  sim.runCoins = 0;
  sim.multiplier = 1;
  sim.speed = START_SPEED;
  sim.worldSpeed = START_SPEED;
  sim.lane = 1;
  sim.laneX = 0;
  sim.laneFromX = 0;
  sim.laneT = 1;
  sim.playerY = 0;
  sim.verticalVelocity = 0;
  sim.grounded = true;
  sim.slideTimer = 0;
  sim.shake = 0;
  sim.coinStreak = 0;
  sim.powerups = { ...EMPTY_POWERUPS };
  for (const o of sim.obstacles) o.active = false;
  for (const c of sim.coins) c.active = false;
  for (const p of sim.pickups) p.active = false;
  sim.nextGoalIndex = 0;
  sim.events.length = 0;

  // pre-fill the runway, keeping the first 20m clear
  sim.nextSpawnZ = 20;
  while (sim.nextSpawnZ < SPAWN_AHEAD_Z) {
    sim.nextSpawnZ += spawnChunk({
      z: sim.nextSpawnZ,
      distance: 0,
      obstacles: sim.obstacles,
      coins: sim.coins,
      powerups: sim.pickups
    });
  }
  sim.poolVersion += 1;
}

export function stopSim() {
  sim.running = false;
}

export function moveLane(direction: -1 | 1) {
  if (!sim.running) return;
  const next = clamp(sim.lane + direction, 0, 2);
  if (next === sim.lane) return;
  // start a fresh fixed-duration tween from wherever we are right now —
  // retargetable mid-move, so double-swipes chain across two lanes
  sim.laneFromX = sim.laneX;
  sim.lane = next;
  sim.laneT = 0;
}

export function jump(): boolean {
  if (!sim.running || !sim.grounded) return false;
  sim.verticalVelocity = JUMP_VELOCITY;
  sim.grounded = false;
  sim.slideTimer = 0;
  return true;
}

export function slide(): boolean {
  if (!sim.running) return false;
  if (!sim.grounded) {
    // fast-fall: slam back to the track
    sim.verticalVelocity = FAST_FALL_VELOCITY;
    return true;
  }
  sim.slideTimer = SLIDE_DURATION;
  return true;
}

export function isSliding(): boolean {
  return sim.slideTimer > 0 && sim.playerY < 0.2;
}

function obstacleHit(obstacle: ObstacleEntity): boolean {
  if (!obstacle.active) return false;
  // physical proximity, not lane index — a half-finished dodge gets you clear
  if (Math.abs((LANES[obstacle.lane] ?? 0) - sim.laneX) > 1.2) return false;
  if (Math.abs(obstacle.z - PLAYER_Z) > 0.95) return false;
  const clearance = OBSTACLES[obstacle.kind].clearance;
  if (clearance === 'jump' && sim.playerY > 0.92) return false;
  if (clearance === 'slide' && isSliding()) return false;
  return true;
}

/**
 * Advances the simulation. Pushes EngineEvents into sim.events; the caller
 * (store tick) drains them for audio/haptics/HUD updates.
 * Returns true while the run is alive, false on crash.
 */
export function stepSim(dt: number): boolean {
  if (!sim.running) return false;
  sim.time += dt;

  // powerup timers
  const p = sim.powerups;
  p.magnet = Math.max(0, p.magnet - dt);
  p.shield = Math.max(0, p.shield - dt);
  p.speedBoost = Math.max(0, p.speedBoost - dt);
  p.doubleCoins = Math.max(0, p.doubleCoins - dt);

  // speed + travel
  sim.speed = Math.min(MAX_SPEED, sim.speed + SPEED_RAMP * dt);
  const boost = p.speedBoost > 0 ? BOOST_MULTIPLIER : 1;
  sim.worldSpeed = sim.speed * boost;
  const deltaZ = sim.worldSpeed * dt;
  const prevDistance = sim.distance;
  sim.distance += deltaZ;

  // milestone multiplier
  const baseMultiplier = Math.min(MULTIPLIER_CAP, 1 + Math.floor(sim.distance / MULTIPLIER_STEP));
  const prevBase = Math.min(MULTIPLIER_CAP, 1 + Math.floor(prevDistance / MULTIPLIER_STEP));
  sim.multiplier = baseMultiplier + (p.doubleCoins > 0 ? 2 : 0) + (p.speedBoost > 0 ? 2 : 0);
  if (baseMultiplier > prevBase) sim.events.push({ type: 'milestone', multiplier: sim.multiplier });

  // goals
  if (sim.nextGoalIndex < GOALS.length && sim.distance >= GOALS[sim.nextGoalIndex]) {
    const meters = GOALS[sim.nextGoalIndex];
    const reward = GOAL_REWARD_BASE * (sim.nextGoalIndex + 1);
    sim.runCoins += reward;
    sim.nextGoalIndex += 1;
    sim.events.push({ type: 'goal', meters, reward });
  }

  // lane change: fixed-duration tween, quadratic ease-out (Temple Run feel)
  if (sim.laneT < 1) {
    sim.laneT = Math.min(1, sim.laneT + dt / LANE_CHANGE_TIME);
    const ease = 1 - (1 - sim.laneT) * (1 - sim.laneT);
    sim.laneX = sim.laneFromX + ((LANES[sim.lane] ?? 0) - sim.laneFromX) * ease;
  } else {
    sim.laneX = LANES[sim.lane] ?? 0;
  }

  // vertical physics: heavier gravity on the way down for a weighty landing
  if (!sim.grounded) {
    sim.playerY += sim.verticalVelocity * dt;
    sim.verticalVelocity -= GRAVITY * (sim.verticalVelocity < 0 ? FALL_GRAVITY_MULT : 1) * dt;
    if (sim.playerY <= 0) {
      sim.playerY = 0;
      sim.verticalVelocity = 0;
      sim.grounded = true;
    }
  }
  sim.slideTimer = Math.max(0, sim.slideTimer - dt);
  sim.shake = Math.max(0, sim.shake - dt * 2.2);

  // move world
  let despawned = false;
  for (const o of sim.obstacles) {
    if (!o.active) continue;
    o.z -= deltaZ;
    if (o.z < DESPAWN_Z) {
      o.active = false;
      despawned = true;
    } else if (!o.passed && o.z < PLAYER_Z - 0.4) {
      o.passed = true;
      // near miss: obstacle in our lane that we cleared, or adjacent lane squeeze
      if (o.lane === sim.lane && OBSTACLES[o.kind].clearance !== 'none') {
        sim.score += NEAR_MISS_BONUS;
        sim.events.push({ type: 'nearMiss', bonus: NEAR_MISS_BONUS });
      }
    }
  }

  const magnetActive = p.magnet > 0;
  let coinsCollected = 0;
  for (const c of sim.coins) {
    if (!c.active) continue;
    c.z -= deltaZ;
    c.spin += dt * 3.4;
    if (c.z < DESPAWN_Z) {
      c.active = false;
      despawned = true;
      continue;
    }
    if (magnetActive && c.pull === 0 && Math.abs(c.z - PLAYER_Z) < MAGNET_RADIUS_Z) {
      c.pull = 1;
    }
    if (c.pull > 0) {
      // home in on the player
      const dx = sim.laneX - c.x;
      const dy = 1.0 + sim.playerY - c.y;
      const dz = PLAYER_Z - c.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const step = MAGNET_PULL_SPEED * dt;
      if (dist < Math.max(step, COIN_COLLECT_RADIUS * 0.7)) {
        c.active = false;
        coinsCollected += 1;
        despawned = true;
        continue;
      }
      c.x += (dx / dist) * step;
      c.y += (dy / dist) * step;
      c.z += (dz / dist) * step;
    } else {
      c.y = c.baseY + Math.sin(sim.time * 2.6 + c.id) * 0.07;
      const dz = Math.abs(c.z - PLAYER_Z);
      if (dz < COIN_COLLECT_RADIUS && Math.abs(c.x - sim.laneX) < 1.05 && Math.abs(c.y - 1.0 - sim.playerY) < 1.35) {
        c.active = false;
        coinsCollected += 1;
        despawned = true;
      }
    }
  }
  if (coinsCollected > 0) {
    const value = p.doubleCoins > 0 ? 2 : 1;
    const amount = coinsCollected * value;
    sim.runCoins += amount;
    sim.score += 50 * amount;
    sim.events.push({ type: 'coin', amount });
  }

  for (const pickup of sim.pickups) {
    if (!pickup.active) continue;
    pickup.z -= deltaZ;
    if (pickup.z < DESPAWN_Z) {
      pickup.active = false;
      despawned = true;
      continue;
    }
    if (Math.abs((LANES[pickup.lane] ?? 0) - sim.laneX) < 1.15 && Math.abs(pickup.z - PLAYER_Z) < 1.2 && sim.playerY < 1.6) {
      pickup.active = false;
      despawned = true;
      sim.powerups[pickup.type] = POWERUP_DURATION[pickup.type];
      sim.score += 350;
      sim.events.push({ type: 'powerup', powerup: pickup.type });
    }
  }

  // spawn ahead
  sim.nextSpawnZ -= deltaZ;
  let spawned = false;
  while (sim.nextSpawnZ < SPAWN_AHEAD_Z) {
    sim.nextSpawnZ += spawnChunk({
      z: sim.nextSpawnZ,
      distance: sim.distance,
      obstacles: sim.obstacles,
      coins: sim.coins,
      powerups: sim.pickups
    });
    spawned = true;
  }
  if (despawned || spawned) sim.poolVersion += 1;

  // collisions
  for (const o of sim.obstacles) {
    if (!obstacleHit(o)) continue;
    if (sim.powerups.shield > 0) {
      o.active = false;
      sim.powerups.shield = 0;
      sim.shake = 0.6;
      sim.poolVersion += 1;
      sim.events.push({ type: 'shieldBreak' });
      continue;
    }
    sim.shake = 1;
    sim.running = false;
    sim.events.push({ type: 'crash' });
    return false;
  }

  // distance score
  sim.score += deltaZ * 9 * sim.multiplier;
  return true;
}
