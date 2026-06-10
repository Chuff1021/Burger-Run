import type { CharacterDefinition, ObstacleDefinition, ObstacleKind, PowerupTimers } from './types';

export const LANES = [-2.4, 0, 2.4] as const;
export const START_SPEED = 14;
export const MAX_SPEED = 31;
export const SPEED_RAMP = 0.19;
export const TRACK_SEGMENT_LENGTH = 12;
export const ACTIVE_TRACK_SEGMENTS = 18;
export const SPAWN_AHEAD_Z = 118;
export const DESPAWN_Z = -18;
export const PLAYER_COLLISION_Z = 0;
export const PLAYER_COLLISION_RADIUS = 0.92;
export const MAGNET_RADIUS = 5.2;
export const COIN_POOL_SIZE = 96;
export const OBSTACLE_POOL_SIZE = 38;
export const POWERUP_POOL_SIZE = 10;
export const GRAVITY = 22;
export const JUMP_VELOCITY = 9.2;
export const SLIDE_DURATION = 0.74;

export const EMPTY_POWERUPS: PowerupTimers = {
  magnet: 0,
  shield: 0,
  speedBoost: 0,
  doubleCoins: 0,
  ketchupRush: 0
};

export const POWERUP_DURATION: PowerupTimers = {
  magnet: 9,
  shield: 11,
  speedBoost: 4.5,
  doubleCoins: 8,
  ketchupRush: 5.5
};

export const OBSTACLES: Record<ObstacleKind, ObstacleDefinition> = {
  hotCrate: { label: 'Hot Crate', clearance: 'none', color: '#ffbf3f' },
  sauceRoller: { label: 'Sauce Roller', clearance: 'jump', color: '#ff2f2f' },
  grillFlame: { label: 'Grill Flame', clearance: 'jump', color: '#ff6a1a' },
  sauceGate: { label: 'Sauce Gate', clearance: 'slide', color: '#24d6ff' },
  robotArm: { label: 'Robot Arm', clearance: 'none', color: '#ffd84d' }
};

export const CHARACTER_ROSTER: CharacterDefinition[] = [
  {
    id: 'classic',
    name: 'Classic Burger',
    tagline: 'Balanced house special',
    accent: '#ffbf3f',
    glow: '#ff6a1a',
    locked: false,
    statLabel: 'Balanced'
  },
  {
    id: 'bacon',
    name: 'Bacon Beast',
    tagline: 'Flame-grilled momentum',
    accent: '#ff2f2f',
    glow: '#ff6a1a',
    locked: false,
    statLabel: 'Power'
  },
  {
    id: 'robot',
    name: 'Robot Burger',
    tagline: 'Factory tuned precision',
    accent: '#24d6ff',
    glow: '#67ff72',
    locked: false,
    statLabel: 'Control'
  },
  {
    id: 'king',
    name: 'King Burger',
    tagline: 'Gold-tier swagger',
    accent: '#ffd84d',
    glow: '#ffbf3f',
    locked: false,
    statLabel: 'Rewards'
  }
];
