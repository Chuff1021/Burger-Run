export type GameStatus = 'menu' | 'running' | 'paused' | 'gameOver';

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
  | { type: 'milestone'; multiplier: number };

export interface SettingsState {
  audio: boolean;
  music: boolean;
  haptics: boolean;
  reducedEffects: boolean;
  quality: VisualQuality;
}

export interface SaveState {
  wallet: number;
  bestScore: number;
  bestDistance: number;
  totalRuns: number;
  selectedCharacter: CharacterId;
  settings: SettingsState;
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
