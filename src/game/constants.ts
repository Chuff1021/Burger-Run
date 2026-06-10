import type { CharacterDefinition, ObstacleDefinition, ObstacleKind, PowerupTimers } from './types';

export const LANES = [-2.4, 0, 2.4] as const;
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

export const GRAVITY = 27;
export const JUMP_VELOCITY = 10.6;
export const FAST_FALL_VELOCITY = -16;
export const SLIDE_DURATION = 0.8;
export const LANE_LERP = 13;

export const MAGNET_RADIUS_Z = 9;
export const MAGNET_PULL_SPEED = 26;
export const COIN_COLLECT_RADIUS = 1.15;

/** base multiplier grows every MULTIPLIER_STEP meters */
export const MULTIPLIER_STEP = 400;
export const MULTIPLIER_CAP = 30;

export const GOALS = [500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 20000];
export const GOAL_REWARD_BASE = 50;

export const NEAR_MISS_BONUS = 150;

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
