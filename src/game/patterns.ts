import { LANES } from './constants';
import { randomChoice } from './math';
import type { CoinEntity, ObstacleEntity, ObstacleKind, PowerupEntity, PowerupType } from './types';

/**
 * Pattern-based chunk spawning. Each chunk is a hand-tuned recipe (coins +
 * obstacles laid out relative to the chunk origin) so runs feel designed
 * instead of random, and every obstacle row always leaves an escape route.
 */

export interface ChunkContext {
  z: number;
  distance: number;
  obstacles: ObstacleEntity[];
  coins: CoinEntity[];
  powerups: PowerupEntity[];
}

const JUMPABLE: ObstacleKind[] = ['meatRoller', 'grillFlame'];
const SLIDEABLE: ObstacleKind[] = ['sauceGate', 'pressArm'];
const SOLID: ObstacleKind[] = ['hotCrate'];

const powerupTypes: PowerupType[] = ['magnet', 'shield', 'speedBoost', 'doubleCoins'];
const lanes = [0, 1, 2] as const;

function takeCoin(ctx: ChunkContext): CoinEntity | undefined {
  return ctx.coins.find((c) => !c.active);
}

function takeObstacle(ctx: ChunkContext): ObstacleEntity | undefined {
  return ctx.obstacles.find((o) => !o.active);
}

function placeCoin(ctx: ChunkContext, lane: number, z: number, y = 1.05) {
  const coin = takeCoin(ctx);
  if (!coin) return;
  coin.active = true;
  coin.lane = lane;
  coin.x = LANES[lane] ?? 0;
  coin.z = ctx.z + z;
  coin.y = y;
  coin.baseY = y;
  coin.spin = Math.random() * Math.PI * 2;
  coin.pull = 0;
}

function placeObstacle(ctx: ChunkContext, lane: number, z: number, kind: ObstacleKind) {
  const obstacle = takeObstacle(ctx);
  if (!obstacle) return;
  obstacle.active = true;
  obstacle.lane = lane;
  obstacle.z = ctx.z + z;
  obstacle.kind = kind;
  obstacle.seed = Math.random() * Math.PI * 2;
  obstacle.passed = false;
}

function placePowerup(ctx: ChunkContext, lane: number, z: number) {
  const powerup = ctx.powerups.find((p) => !p.active);
  if (!powerup) return;
  powerup.active = true;
  powerup.lane = lane;
  powerup.z = ctx.z + z;
  powerup.type = randomChoice(powerupTypes);
}

function coinLine(ctx: ChunkContext, lane: number, startZ: number, count: number, spacing = 1.6) {
  for (let i = 0; i < count; i += 1) placeCoin(ctx, lane, startZ + i * spacing);
}

/** arc of coins over a jumpable obstacle */
function coinArc(ctx: ChunkContext, lane: number, centerZ: number) {
  const offsets = [-3.2, -1.9, -0.7, 0.7, 1.9, 3.2];
  for (const off of offsets) {
    const y = 1.05 + Math.max(0, 2.0 - Math.abs(off) * 0.62);
    placeCoin(ctx, lane, centerZ + off, y);
  }
}

/* ------------------------------------------------------------------ */
/* Chunks. Each returns its length in meters.                          */
/* ------------------------------------------------------------------ */

function chunkBreather(ctx: ChunkContext): number {
  const lane = randomChoice(lanes);
  coinLine(ctx, lane, 3, 6);
  return 16;
}

function chunkWeave(ctx: ChunkContext): number {
  const order = Math.random() > 0.5 ? [0, 1, 2] : [2, 1, 0];
  let z = 2;
  for (const lane of order) {
    coinLine(ctx, lane, z, 4, 1.5);
    z += 7;
  }
  return 26;
}

function chunkJumpArc(ctx: ChunkContext): number {
  const lane = randomChoice(lanes);
  placeObstacle(ctx, lane, 9, randomChoice(JUMPABLE));
  coinArc(ctx, lane, 9);
  const side = randomChoice(lanes.filter((l) => l !== lane));
  coinLine(ctx, side, 4, 5);
  return 20;
}

function chunkSlideTunnel(ctx: ChunkContext): number {
  const lane = randomChoice(lanes);
  placeObstacle(ctx, lane, 8, randomChoice(SLIDEABLE));
  coinLine(ctx, lane, 5.5, 5, 1.4);
  return 18;
}

function chunkDoubleTrouble(ctx: ChunkContext): number {
  // two lanes threatened at the same row — one jumpable, one solid; third lane free with coins
  const solidLane = randomChoice(lanes);
  const jumpLane = randomChoice(lanes.filter((l) => l !== solidLane));
  const freeLane = lanes.find((l) => l !== solidLane && l !== jumpLane)!;
  placeObstacle(ctx, solidLane, 9, randomChoice(SOLID));
  placeObstacle(ctx, jumpLane, 9, randomChoice(JUMPABLE));
  coinLine(ctx, freeLane, 5, 7, 1.5);
  coinArc(ctx, jumpLane, 9);
  return 22;
}

function chunkGauntlet(ctx: ChunkContext): number {
  // staggered rows force lane changes; every row leaves at least one open lane
  const rows = [6, 13, 20];
  let lastBlocked: number = -1;
  for (const rowZ of rows) {
    const choices = lanes.filter((l) => l !== lastBlocked);
    const blocked = randomChoice(choices);
    placeObstacle(ctx, blocked, rowZ, randomChoice([...JUMPABLE, ...SOLID, ...SLIDEABLE]));
    lastBlocked = blocked;
    const open = randomChoice(lanes.filter((l) => l !== blocked));
    coinLine(ctx, open, rowZ - 1.5, 3, 1.5);
  }
  return 28;
}

function chunkPowerAlley(ctx: ChunkContext): number {
  const lane = randomChoice(lanes);
  placePowerup(ctx, lane, 8);
  coinLine(ctx, lane, 3, 3, 1.5);
  const guardLane = randomChoice(lanes.filter((l) => l !== lane));
  placeObstacle(ctx, guardLane, 8, randomChoice([...JUMPABLE, ...SLIDEABLE]));
  return 18;
}

function chunkWall(ctx: ChunkContext): number {
  // all three lanes occupied but two are clearable — high-tension moment
  const solidLane = randomChoice(lanes);
  for (const lane of lanes) {
    if (lane === solidLane) placeObstacle(ctx, lane, 10, randomChoice(SOLID));
    else placeObstacle(ctx, lane, 10, Math.random() > 0.5 ? randomChoice(JUMPABLE) : randomChoice(SLIDEABLE));
  }
  const arcLane = randomChoice(lanes.filter((l) => l !== solidLane));
  coinArc(ctx, arcLane, 10);
  return 24;
}

type Chunk = (ctx: ChunkContext) => number;

const TIER_1: Chunk[] = [chunkBreather, chunkWeave, chunkJumpArc, chunkSlideTunnel, chunkPowerAlley];
const TIER_2: Chunk[] = [chunkWeave, chunkJumpArc, chunkSlideTunnel, chunkDoubleTrouble, chunkGauntlet, chunkPowerAlley];
const TIER_3: Chunk[] = [chunkJumpArc, chunkSlideTunnel, chunkDoubleTrouble, chunkGauntlet, chunkWall, chunkPowerAlley, chunkGauntlet];

/** spawn one chunk at ctx.z, returns chunk length so the caller can advance */
export function spawnChunk(ctx: ChunkContext): number {
  const pool = ctx.distance < 400 ? TIER_1 : ctx.distance < 1500 ? TIER_2 : TIER_3;
  const chunk = randomChoice(pool);
  return chunk(ctx);
}
