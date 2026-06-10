export type GameStatus = 'menu' | 'running' | 'paused' | 'gameOver';

export type CharacterId = 'classic' | 'bacon' | 'robot' | 'king';

export type ObstacleKind = 'hotCrate' | 'sauceRoller' | 'grillFlame' | 'sauceGate' | 'robotArm';

export type PowerupType = 'magnet' | 'shield' | 'speedBoost' | 'doubleCoins' | 'ketchupRush';

export type VisualQuality = 'low' | 'medium' | 'high';

export interface ObstacleEntity {
  id: number;
  active: boolean;
  lane: number;
  z: number;
  kind: ObstacleKind;
}

export interface CoinEntity {
  id: number;
  active: boolean;
  lane: number;
  z: number;
  y: number;
  collected: boolean;
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
  ketchupRush: number;
}

export interface SettingsState {
  audio: boolean;
  haptics: boolean;
  reducedEffects: boolean;
  quality: VisualQuality;
}

export interface SaveState {
  wallet: number;
  bestScore: number;
  bestDistance: number;
  selectedCharacter: CharacterId;
  settings: SettingsState;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  tagline: string;
  accent: string;
  glow: string;
  locked: boolean;
  statLabel: string;
}

export interface ObstacleDefinition {
  label: string;
  clearance: 'none' | 'jump' | 'slide';
  color: string;
}
