import { CHARACTER_ROSTER } from './constants';
import type { SaveState, SettingsState } from './types';

const SAVE_KEY = 'burger-run-save-v1';

export const defaultSettings: SettingsState = {
  audio: true,
  music: true,
  haptics: true,
  reducedEffects: false,
  quality: 'high'
};

export const defaultSave: SaveState = {
  wallet: 0,
  bestScore: 0,
  bestDistance: 0,
  totalRuns: 0,
  selectedCharacter: CHARACTER_ROSTER[0].id,
  settings: defaultSettings
};

export function loadSave(): SaveState {
  if (typeof localStorage === 'undefined') return defaultSave;

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave;
    const parsed = JSON.parse(raw) as Partial<SaveState>;

    return {
      ...defaultSave,
      ...parsed,
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
