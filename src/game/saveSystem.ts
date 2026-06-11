import { CHARACTER_ROSTER, WORLDS } from './constants';
import type { CampaignState, SaveState, SettingsState } from './types';

const SAVE_KEY = 'burger-run-save-v1';

export const defaultSettings: SettingsState = {
  audio: true,
  music: true,
  haptics: true,
  reducedEffects: false,
  quality: 'high'
};

export function defaultCampaign(): CampaignState {
  return {
    unlockedWorld: 1,
    stars: WORLDS.map(() => [0, 0, 0]),
    worldCleared: WORLDS.map(() => false)
  };
}

export const defaultSave: SaveState = {
  wallet: 0,
  bestScore: 0,
  bestDistance: 0,
  totalRuns: 0,
  selectedCharacter: CHARACTER_ROSTER[0].id,
  campaign: defaultCampaign(),
  settings: defaultSettings
};

export function loadSave(): SaveState {
  if (typeof localStorage === 'undefined') return defaultSave;

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave;
    const parsed = JSON.parse(raw) as Partial<SaveState>;

    // v1 → v2 migration is purely additive: old saves get a fresh campaign
    // block while wallet/bests/settings carry over untouched.
    const campaign = parsed.campaign;
    return {
      ...defaultSave,
      ...parsed,
      campaign: {
        ...defaultCampaign(),
        ...campaign,
        stars: WORLDS.map((_, w) => {
          const row = campaign?.stars?.[w] ?? [];
          return [row[0] ?? 0, row[1] ?? 0, row[2] ?? 0];
        }),
        worldCleared: WORLDS.map((_, w) => campaign?.worldCleared?.[w] ?? false)
      },
      settings: {
        ...defaultSettings,
        ...parsed.settings
      }
    };
  } catch {
    return defaultSave;
  }
}

export function writeSave(save: SaveState) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
