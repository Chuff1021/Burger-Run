export type GameStatus = 'menu' | 'running' | 'paused' | 'respawn' | 'worldComplete' | 'gameOver';

export type PlayMode = 'marathon' | 'campaign';

export type CharacterId = 'classic' | 'bacon' | 'robot' | 'king';

export type ObstacleKind = 'hotCrate' | 'meatRoller' | 'grillFlame' | 'sauceGate' | 'pressArm';

export type PowerupType = 'magnet' | 'shield' | 'speedBoost' | 'doubleCoins';

export type VisualQuality = 'low' | 'medium' | 'high';

export interface ObstacleEntity {
  id: number;
  active: boolean;
  lane: number;
  z: number;
  kind: ObstacleKind;
  /** per-entity animation seed */
  seed: number;
  /** set true once the player has passed it (near-miss bookkeeping) */
  passed: boolean;
}

export interface CoinEntity {
  id: number;
  active: boolean;
  lane: number;
  x: number;
  y: number;
  z: number;
  baseY: number;
  spin: number;
  /** 0 = free, >0 = being magnet-pulled toward the player */
  pull: number;
}

export interface PowerupEntity {
  id: number;
  active: boolean;
  lane: number;
  z: number;
  type: PowerupType;
}

export interface PowerupTimers {
  magnet: number;
  shield: number;
  speedBoost: number;
  doubleCoins: number;
}

export type EngineEvent =
  | { type: 'coin'; amount: number }
  | { type: 'powerup'; powerup: PowerupType }
  | { type: 'crash' }
  | { type: 'shieldBreak' }
  | { type: 'nearMiss'; bonus: number }
  | { type: 'goal'; meters: number; reward: number }
  | { type: 'milestone'; multiplier: number }
  | { type: 'turn'; dir: -1 | 1 }
  | { type: 'checkpoint'; index: number }
  | { type: 'finish' };

/** A 90° corner in the track. dir +1 = turn right (screen), -1 = left. */
export interface CornerEntity {
  z: number;
  dir: -1 | 1;
  consumed: boolean;
}

export interface SettingsState {
  audio: boolean;
  music: boolean;
  haptics: boolean;
  reducedEffects: boolean;
  quality: VisualQuality;
}

export interface CampaignState {
  /** highest world the player may enter (1-based) */
  unlockedWorld: number;
  /** stars earned per world per section, 0-3 */
  stars: number[][];
  /** world finished (boss beaten once bosses exist) */
  worldCleared: boolean[];
}

export interface SaveState {
  wallet: number;
  bestScore: number;
  bestDistance: number;
  totalRuns: number;
  selectedCharacter: CharacterId;
  campaign: CampaignState;
  settings: SettingsState;
}

export interface WorldDefinition {
  id: number;
  name: string;
  tagline: string;
  accent: string;
  icon: string;
  available: boolean;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  tagline: string;
  accent: string;
  glow: string;
  /** bun / jacket tint */
  bun: string;
  jacket: string;
  locked: boolean;
  statLabel: string;
}

export interface ObstacleDefinition {
  label: string;
  clearance: 'none' | 'jump' | 'slide';
  color: string;
}
