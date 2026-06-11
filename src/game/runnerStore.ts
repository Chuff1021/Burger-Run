import { create } from 'zustand';
import { playCue, startMusic, stopMusic } from './audioManager';
import { CAMPAIGN_LIVES, EMPTY_POWERUPS, GOALS, RESPAWN_DELAY_MS, SECTION_COIN_STAR } from './constants';
import { jump as engineJump, moveLane as engineMoveLane, resetSim, sim, slide as engineSlide, stepSim, stopSim } from './engine';
import { triggerHaptic } from './haptics';
import { loadSave, writeSave } from './saveSystem';
import type { CharacterId, GameStatus, PlayMode, PowerupTimers, SaveState, SettingsState } from './types';

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
  playMode: PlayMode;
  /** campaign run state */
  lives: number;
  sectionStars: number[];
  lastSectionStars: number;
  nextCheckpoint: number;
  score: number;
  distance: number;
  runCoins: number;
  multiplier: number;
  nextGoal: number;
  goalsHit: number;
  /** mirrors sim.poolVersion so entity lists know when to resync */
  poolVersion: number;
  /** upcoming corner readout for the HUD turn banner (0 = none) */
  cornerDir: -1 | 0 | 1;
  cornerDist: number;
  powerups: PowerupTimers;
  save: SaveState;
  activePanel: 'none' | 'characters' | 'shop' | 'settings' | 'worlds';
  toasts: Toast[];
  startRun: (mode?: PlayMode) => void;
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

/** per-section tracking for star criteria (coins collected, took a hit) */
let sectionCoinBase = 0;
let sectionTookHit = false;
let lastCheckpointDistance = 0;
/** coins/score locked in at the last checkpoint — what a respawn resumes with */
let checkpointCarry = { coins: 0, score: 0 };
let respawnTimer: number | null = null;

function sectionStarsEarned(): number {
  const coins = sim.runCoins - sectionCoinBase;
  return 1 + (coins >= SECTION_COIN_STAR ? 1 : 0) + (sectionTookHit ? 0 : 1);
}

function hudSnapshot() {
  const corner = sim.corners[0];
  const cornerPending = corner && !corner.consumed && corner.z > 0;
  return {
    cornerDir: (cornerPending ? corner.dir : 0) as -1 | 0 | 1,
    cornerDist: cornerPending ? Math.max(0, Math.round(corner.z)) : 999,
    score: sim.score,
    distance: sim.distance,
    runCoins: sim.runCoins,
    multiplier: sim.multiplier,
    nextGoal: GOALS[sim.nextGoalIndex] ?? GOALS[GOALS.length - 1],
    goalsHit: sim.nextGoalIndex,
    nextCheckpoint: sim.checkpoints[sim.nextCheckpointIndex] ?? 0,
    poolVersion: sim.poolVersion,
    powerups: { ...sim.powerups }
  };
}

export const useRunnerStore = create<RunnerStore>((set, get) => ({
  status: 'menu',
  playMode: 'marathon',
  lives: CAMPAIGN_LIVES,
  sectionStars: [0, 0, 0],
  lastSectionStars: 0,
  nextCheckpoint: 0,
  score: 0,
  distance: 0,
  runCoins: 0,
  multiplier: 1,
  nextGoal: GOALS[0],
  goalsHit: 0,
  poolVersion: 0,
  cornerDir: 0,
  cornerDist: 999,
  powerups: { ...EMPTY_POWERUPS },
  save: loadSave(),
  activePanel: 'none',
  toasts: [],

  startRun: (mode = get().playMode) => {
    if (respawnTimer !== null) {
      window.clearTimeout(respawnTimer);
      respawnTimer = null;
    }
    const settings = get().save.settings;
    playCue('start', settings.audio);
    startMusic(settings.audio && settings.music);
    resetSim(mode);
    sectionCoinBase = 0;
    sectionTookHit = false;
    lastCheckpointDistance = 0;
    checkpointCarry = { coins: 0, score: 0 };
    hudAccumulator = 1; // force immediate HUD sync
    set({
      status: 'running',
      playMode: mode,
      lives: CAMPAIGN_LIVES,
      sectionStars: [0, 0, 0],
      activePanel: 'none',
      toasts: [],
      ...hudSnapshot()
    });
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
    if (respawnTimer !== null) {
      window.clearTimeout(respawnTimer);
      respawnTimer = null;
    }
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
    let finished = false;
    let campaignSave: SaveState | null = null;

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
          sectionTookHit = true;
          newToasts.push({ id: ++toastId, text: 'SHIELD SAVED YOU!', tone: 'cyan' });
          break;
        case 'checkpoint': {
          const stars = sectionStarsEarned();
          playCue('goal', settings.audio);
          triggerHaptic([20, 30, 20], settings.haptics);
          newToasts.push({ id: ++toastId, text: `CHECKPOINT! ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, tone: 'gold' });
          const sectionStars = [...get().sectionStars];
          sectionStars[event.index] = stars;
          // persist best stars + lock in coins/score for respawns
          const campaign = structuredClone(state.save.campaign);
          campaign.stars[0][event.index] = Math.max(campaign.stars[0][event.index], stars);
          campaignSave = { ...state.save, campaign };
          lastCheckpointDistance = sim.checkpoints[event.index];
          checkpointCarry = { coins: sim.runCoins, score: sim.score };
          sectionCoinBase = sim.runCoins;
          sectionTookHit = false;
          set({ sectionStars });
          break;
        }
        case 'finish': {
          const stars = sectionStarsEarned();
          const sectionStars = [...get().sectionStars];
          sectionStars[sim.checkpoints.length - 1] = stars;
          const campaign = structuredClone(state.save.campaign);
          campaign.stars[0][sim.checkpoints.length - 1] = Math.max(campaign.stars[0][sim.checkpoints.length - 1], stars);
          campaign.worldCleared[0] = true;
          campaignSave = {
            ...state.save,
            campaign,
            wallet: state.save.wallet + sim.runCoins,
            bestScore: Math.max(state.save.bestScore, Math.floor(sim.score)),
            totalRuns: state.save.totalRuns + 1
          };
          set({ sectionStars });
          finished = true;
          playCue('goal', settings.audio);
          triggerHaptic([30, 40, 60], settings.haptics);
          break;
        }
        case 'nearMiss':
          playCue('nearMiss', settings.audio);
          newToasts.push({ id: ++toastId, text: `NEAR MISS +${event.bonus}`, tone: 'cyan' });
          break;
        case 'turn':
          playCue('turn', settings.audio);
          triggerHaptic(14, settings.haptics);
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

    // crossed the finish line — world complete celebration
    if (finished && campaignSave) {
      stopMusic();
      writeSave(campaignSave);
      set({ status: 'worldComplete', save: campaignSave, toasts: [], ...hudSnapshot() });
      return;
    }
    if (campaignSave) {
      writeSave(campaignSave);
      set({ save: campaignSave });
    }

    if (!alive) {
      // campaign with lives left: respawn at the last checkpoint
      if (state.playMode === 'campaign' && state.lives > 1) {
        stopMusic();
        sectionTookHit = false;
        set({ status: 'respawn', lives: state.lives - 1, toasts: [], ...hudSnapshot() });
        if (respawnTimer !== null) window.clearTimeout(respawnTimer);
        respawnTimer = window.setTimeout(() => {
          respawnTimer = null;
          resetSim('campaign', lastCheckpointDistance, checkpointCarry);
          sectionCoinBase = checkpointCarry.coins;
          sectionTookHit = false;
          const settingsNow = get().save.settings;
          startMusic(settingsNow.audio && settingsNow.music);
          hudAccumulator = 1;
          set({ status: 'running', ...hudSnapshot() });
        }, RESPAWN_DELAY_MS);
        return;
      }

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
