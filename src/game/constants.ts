import type { CharacterDefinition, ObstacleDefinition, ObstacleKind, PowerupTimers } from './types';

/**
 * Camera looks down +Z, so +X is SCREEN-LEFT. Index 0 = screen-left lane,
 * index 2 = screen-right lane, so moveLane(+1) moves right ON SCREEN.
 */
export const LANES = [2.4, 0, -2.4] as const;
export const LANE_WIDTH = 2.4;

export const START_SPEED = 12.5;
export const MAX_SPEED = 30;
export const SPEED_RAMP = 0.14;
export const BOOST_MULTIPLIER = 1.34;

export const SPAWN_AHEAD_Z = 130;
export const DESPAWN_Z = -16;
export const PLAYER_Z = 0;

export const COIN_POOL_SIZE = 140;
export const OBSTACLE_POOL_SIZE = 40;
export const POWERUP_POOL_SIZE = 8;

/**
 * Temple Run-style movement tuning (from reference-game analysis):
 * - lane change: fixed-duration tween with quadratic ease-out, retargetable
 * - jump: snappy fixed arc (~0.62s) with a heavier fall for weight
 * - slide: can cancel a jump into a fast-fall slam
 */
export const LANE_CHANGE_TIME = 0.18;
export const GRAVITY = 35;
export const FALL_GRAVITY_MULT = 1.4;
export const JUMP_VELOCITY = 11.4;
export const FAST_FALL_VELOCITY = -20;
export const SLIDE_DURATION = 0.75;

export const MAGNET_RADIUS_Z = 9;
export const MAGNET_PULL_SPEED = 26;
export const COIN_COLLECT_RADIUS = 1.15;

/** base multiplier grows every MULTIPLIER_STEP meters */
export const MULTIPLIER_STEP = 400;
export const MULTIPLIER_CAP = 30;

export const GOALS = [500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 20000];
export const GOAL_REWARD_BASE = 50;

export const NEAR_MISS_BONUS = 150;

/**
 * Corner system (Temple Run turns): the course throws 90° corners at the
 * runner; swipe the matching direction inside the window or crash into the
 * corner wall. Gaps keep at most one corner inside the spawn horizon.
 */
export const CORNER_FIRST_AT = 180;
export const CORNER_MIN_GAP = 140;
export const CORNER_MAX_GAP = 260;
/** swipe accepted while corner is between these z bounds */
export const TURN_WINDOW_AHEAD = 9;
export const TURN_FAIL_Z = -0.55;
export const TURN_BONUS = 100;
/** clear runway reserved around a corner (no obstacles/coins) */
export const CORNER_CLEAR_BEFORE = 8;
export const CORNER_CLEAR_AFTER = 22;

export const EMPTY_POWERUPS: PowerupTimers = {
  magnet: 0,
  shield: 0,
  speedBoost: 0,
  doubleCoins: 0
};

export const POWERUP_DURATION: PowerupTimers = {
  magnet: 10,
  shield: 12,
  speedBoost: 5,
  doubleCoins: 9
};

export const OBSTACLES: Record<ObstacleKind, ObstacleDefinition> = {
  hotCrate: { label: 'Hot Surface', clearance: 'none', color: '#ffbf3f' },
  meatRoller: { label: 'Meat Roller', clearance: 'jump', color: '#ff2f2f' },
  grillFlame: { label: 'Grill Flame', clearance: 'jump', color: '#ff6a1a' },
  sauceGate: { label: 'Sauce Gate', clearance: 'slide', color: '#24d6ff' },
  pressArm: { label: 'Press Arm', clearance: 'slide', color: '#ffd84d' }
};

export const CHARACTER_ROSTER: CharacterDefinition[] = [
  {
    id: 'classic',
    name: 'Mega Burger',
    tagline: 'The original factory runner',
    accent: '#ffbf3f',
    glow: '#ff6a1a',
    bun: '#e8973a',
    jacket: '#15181f',
    locked: false,
    statLabel: 'Balanced'
  },
  {
    id: 'bacon',
    name: 'Bacon Beast',
    tagline: 'Flame-grilled momentum',
    accent: '#ff2f2f',
    glow: '#ff6a1a',
    bun: '#d97e2e',
    jacket: '#2a1212',
    locked: false,
    statLabel: 'Power'
  },
  {
    id: 'robot',
    name: 'Robo Patty',
    tagline: 'Factory tuned precision',
    accent: '#24d6ff',
    glow: '#67ff72',
    bun: '#9fb2c8',
    jacket: '#10202c',
    locked: false,
    statLabel: 'Control'
  },
  {
    id: 'king',
    name: 'King Burger',
    tagline: 'Gold-tier swagger',
    accent: '#ffd84d',
    glow: '#ffbf3f',
    bun: '#efa83f',
    jacket: '#241c08',
    locked: false,
    statLabel: 'Rewards'
  }
];
