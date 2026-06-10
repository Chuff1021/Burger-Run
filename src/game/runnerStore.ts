import { create } from 'zustand';
import { playCue, startMusic, stopMusic } from './audioManager';
import { EMPTY_POWERUPS, GOALS } from './constants';
import { jump as engineJump, moveLane as engineMoveLane, resetSim, sim, slide as engineSlide, stepSim, stopSim } from './engine';
import { triggerHaptic } from './haptics';
import { loadSave, writeSave } from './saveSystem';
import type { CharacterId, GameStatus, PowerupTimers, SaveState, SettingsState } from './types';

/**
 * UI-facing store. The 60fps simulation lives in engine.ts; this store only
 * mirrors readouts ~10x/sec for the HUD plus slow state (status, save, panels)
 * so React render work stays tiny.
 */

export interface Toast {
  id: number;
  text: string;
  tone: 'gold' | 'cyan' | 'red';
}

interface RunnerStore {
  status: GameStatus;
  score: number;
  distance: number;
  runCoins: number;
  multiplier: number;
  nextGoal: number;
  goalsHit: number;
  /** mirrors sim.poolVersion so entity lists know when to resync */
  poolVersion: number;
  powerups: PowerupTimers;
  save: SaveState;
  activePanel: 'none' | 'characters' | 'shop' | 'settings';
  toasts: Toast[];
  startRun: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  goToMenu: () => void;
  moveLane: (direction: -1 | 1) => void;
  jump: () => void;
  slide: () => void;
  tick: (dt: number) => void;
  setActivePanel: (panel: RunnerStore['activePanel']) => void;
  selectCharacter: (character: CharacterId) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
}

let hudAccumulator = 0;
let toastId = 0;

function hudSnapshot() {
  return {
    score: sim.score,
    distance: sim.distance,
    runCoins: sim.runCoins,
    multiplier: sim.multiplier,
    nextGoal: GOALS[sim.nextGoalIndex] ?? GOALS[GOALS.length - 1],
    goalsHit: sim.nextGoalIndex,
    poolVersion: sim.poolVersion,
    powerups: { ...sim.powerups }
  };
}

export const useRunnerStore = create<RunnerStore>((set, get) => ({
  status: 'menu',
  score: 0,
  distance: 0,
  runCoins: 0,
  multiplier: 1,
  nextGoal: GOALS[0],
  goalsHit: 0,
  poolVersion: 0,
  powerups: { ...EMPTY_POWERUPS },
  save: loadSave(),
  activePanel: 'none',
  toasts: [],

  startRun: () => {
    const settings = get().save.settings;
    playCue('start', settings.audio);
    startMusic(settings.audio && settings.music);
    resetSim();
    hudAccumulator = 1; // force immediate HUD sync
    set({ status: 'running', activePanel: 'none', toasts: [], ...hudSnapshot() });
  },

  pause: () => {
    if (get().status !== 'running') return;
    stopMusic();
    set({ status: 'paused' });
  },

  resume: () => {
    if (get().status !== 'paused') return;
    const settings = get().save.settings;
    startMusic(settings.audio && settings.music);
    set({ status: 'running' });
  },

  restart: () => {
    get().startRun();
  },

  goToMenu: () => {
    stopSim();
    stopMusic();
    set({ status: 'menu', activePanel: 'none' });
  },

  moveLane: (direction) => {
    if (get().status !== 'running') return;
    engineMoveLane(direction);
  },

  jump: () => {
    const state = get();
    if (state.status !== 'running') return;
    if (engineJump()) {
      playCue('jump', state.save.settings.audio);
      triggerHaptic(10, state.save.settings.haptics);
    }
  },

  slide: () => {
    const state = get();
    if (state.status !== 'running') return;
    if (engineSlide()) {
      playCue('slide', state.save.settings.audio);
      triggerHaptic(8, state.save.settings.haptics);
    }
  },

  tick: (dt) => {
    const state = get();
    if (state.status !== 'running') return;

    const alive = stepSim(dt);
    const settings = state.save.settings;
    const newToasts: Toast[] = [];

    for (const event of sim.events) {
      switch (event.type) {
        case 'coin':
          playCue('coin', settings.audio);
          break;
        case 'powerup':
          playCue('powerup', settings.audio);
          triggerHaptic([18, 28, 18], settings.haptics);
          break;
        case 'shieldBreak':
          playCue('shieldBreak', settings.audio);
          triggerHaptic([30, 30, 30], settings.haptics);
          newToasts.push({ id: ++toastId, text: 'SHIELD SAVED YOU!', tone: 'cyan' });
          break;
        case 'nearMiss':
          playCue('nearMiss', settings.audio);
          newToasts.push({ id: ++toastId, text: `NEAR MISS +${event.bonus}`, tone: 'cyan' });
          break;
        case 'goal':
          playCue('goal', settings.audio);
          newToasts.push({ id: ++toastId, text: `${event.meters.toLocaleString('en-US')}M GOAL +${event.reward} COINS`, tone: 'gold' });
          break;
        case 'milestone':
          newToasts.push({ id: ++toastId, text: `MULTIPLIER x${event.multiplier}`, tone: 'gold' });
          break;
        case 'crash':
          playCue('crash', settings.audio);
          triggerHaptic([40, 60, 90], settings.haptics);
          break;
      }
    }
    sim.events.length = 0;

    if (!alive) {
      stopMusic();
      const save: SaveState = {
        ...state.save,
        wallet: state.save.wallet + sim.runCoins,
        bestScore: Math.max(state.save.bestScore, Math.floor(sim.score)),
        bestDistance: Math.max(state.save.bestDistance, Math.floor(sim.distance)),
        totalRuns: state.save.totalRuns + 1
      };
      writeSave(save);
      set({ status: 'gameOver', save, toasts: [], ...hudSnapshot() });
      return;
    }

    // throttle HUD state to ~10 Hz; toasts flush immediately
    hudAccumulator += dt;
    if (newToasts.length > 0 || hudAccumulator >= 0.1) {
      hudAccumulator = 0;
      const toasts = newToasts.length > 0 ? [...state.toasts, ...newToasts].slice(-3) : state.toasts;
      set({ ...hudSnapshot(), toasts });
      if (newToasts.length > 0) {
        const ids = newToasts.map((t) => t.id);
        window.setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => !ids.includes(t.id)) }));
        }, 1800);
      }
    }
  },

  setActivePanel: (activePanel) => {
    playCue('uiClick', get().save.settings.audio);
    set({ activePanel });
  },

  selectCharacter: (selectedCharacter) => {
    const save = { ...get().save, selectedCharacter };
    writeSave(save);
    set({ save });
  },

  updateSettings: (settings) => {
    const save = {
      ...get().save,
      settings: {
        ...get().save.settings,
        ...settings
      }
    };
    writeSave(save);
    if (settings.music === false || settings.audio === false) stopMusic();
    set({ save });
  }
}));
