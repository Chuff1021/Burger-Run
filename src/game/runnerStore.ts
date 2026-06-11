import { create } from 'zustand';
import { playCue, startMusic, stopMusic } from './audioManager';
import { boss, bossJump, bossMoveLane, bossPrompt, bossSlide, bossTap, startBoss, stepBoss, stopBoss } from './bossSim';
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
  /** boss fight HUD mirror */
  bossHp: number;
  bossHearts: number;
  bossMeter: number;
  bossPercent: number;
  bossCombo: number;
  bossPromptText: string;
  bossDefeated: boolean;
  /** how the last boss fight ended (drives the win/lose screen) */
  bossOutcome: 'won' | 'lost' | null;
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
  attack: () => void;
  retryBoss: () => void;
  /** jump straight into the boss arena from the menu — no save writes */
  startBossPractice: () => void;
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
/** true when the fight was launched from the menu (no campaign rewards) */
let bossPractice = false;

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
  bossHp: 3,
  bossHearts: 3,
  bossMeter: 0,
  bossPercent: 0,
  bossCombo: 0,
  bossPromptText: '',
  bossDefeated: false,
  bossOutcome: null,
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
    bossPractice = false;
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
      bossDefeated: false,
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
    stopBoss();
    stopMusic();
    set({ status: 'menu', activePanel: 'none' });
  },

  moveLane: (direction) => {
    const status = get().status;
    if (status === 'boss') {
      bossMoveLane(direction);
      return;
    }
    if (status !== 'running') return;
    engineMoveLane(direction);
  },

  jump: () => {
    const state = get();
    if (state.status === 'boss') {
      bossJump();
      return;
    }
    if (state.status !== 'running') return;
    if (engineJump()) {
      playCue('jump', state.save.settings.audio);
      triggerHaptic(10, state.save.settings.haptics);
    }
  },

  slide: () => {
    const state = get();
    if (state.status === 'boss') {
      bossSlide();
      return;
    }
    if (state.status !== 'running') return;
    if (engineSlide()) {
      playCue('slide', state.save.settings.audio);
      triggerHaptic(8, state.save.settings.haptics);
    }
  },

  attack: () => {
    if (get().status !== 'boss') return;
    bossTap();
  },

  retryBoss: () => {
    const settings = get().save.settings;
    playCue('start', settings.audio);
    startMusic(settings.audio && settings.music);
    startBoss();
    set({ status: 'boss', bossHp: 3, bossHearts: 3, bossMeter: 0, bossPercent: 0, bossCombo: 0, bossOutcome: null, bossPromptText: bossPrompt() });
  },

  startBossPractice: () => {
    bossPractice = true;
    get().retryBoss();
    set({ activePanel: 'none' });
  },

  tick: (dt) => {
    const state = get();

    // ---- boss arena tick ----
    if (state.status === 'boss') {
      const settings = state.save.settings;
      const result = stepBoss(dt);

      for (const event of boss.events) {
        switch (event.type) {
          case 'dodge':
            playCue('nearMiss', settings.audio);
            break;
          case 'perfectDodge':
            playCue('nearMiss', settings.audio);
            triggerHaptic([12, 16], settings.haptics);
            break;
          case 'meterFull':
            playCue('powerup', settings.audio);
            triggerHaptic([20, 30, 20], settings.haptics);
            break;
          case 'playerHit':
            playCue('crash', settings.audio);
            triggerHaptic([40, 60, 40], settings.haptics);
            break;
          case 'bossHit':
            playCue('punch', settings.audio);
            triggerHaptic(event.damage >= 18 ? [25, 20, 25] : 20, settings.haptics);
            break;
          case 'counterHit':
            playCue('shieldBreak', settings.audio);
            triggerHaptic([20, 20, 35], settings.haptics);
            break;
          case 'clank':
            playCue('uiClick', settings.audio);
            break;
          case 'superSlam':
            playCue('bossRoar', settings.audio);
            triggerHaptic([40, 80, 60], settings.haptics);
            break;
          case 'stagger':
            playCue('shieldBreak', settings.audio);
            break;
          case 'launch':
            playCue('bossRoar', settings.audio);
            triggerHaptic([30, 50, 70], settings.haptics);
            break;
          case 'roundStart':
            playCue('bossRoar', settings.audio);
            break;
          case 'victory':
            playCue('goal', settings.audio);
            triggerHaptic([40, 60, 100], settings.haptics);
            break;
          case 'defeat':
            playCue('crash', settings.audio);
            break;
        }
      }
      boss.events.length = 0;

      if (result === 'won') {
        stopBoss();
        stopMusic();
        if (bossPractice) {
          // practice victory: celebrate, never touch the save
          set({ status: 'bossDefeat', bossOutcome: 'won', toasts: [] });
          return;
        }
        const campaign = structuredClone(state.save.campaign);
        campaign.worldCleared[0] = true;
        campaign.unlockedWorld = Math.max(campaign.unlockedWorld, 2);
        const save: SaveState = {
          ...state.save,
          campaign,
          wallet: state.save.wallet + sim.runCoins + 200,
          bestScore: Math.max(state.save.bestScore, Math.floor(sim.score + boss.score)),
          totalRuns: state.save.totalRuns + 1
        };
        writeSave(save);
        set({ status: 'worldComplete', save, bossDefeated: true, toasts: [] });
        return;
      }
      if (result === 'lost') {
        stopBoss();
        stopMusic();
        set({ status: 'bossDefeat', bossOutcome: 'lost', toasts: [] });
        return;
      }

      // ~10 Hz HUD mirror
      hudAccumulator += dt;
      if (hudAccumulator >= 0.1) {
        hudAccumulator = 0;
        set({
          bossHp: boss.hp,
          bossHearts: boss.hearts,
          bossMeter: boss.meter,
          bossPercent: Math.round(boss.percent),
          bossCombo: boss.combo,
          bossPromptText: bossPrompt()
        });
      }
      return;
    }

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
          // course done — persist section stars, then THE BOSS AWAITS
          const stars = sectionStarsEarned();
          const sectionStars = [...get().sectionStars];
          sectionStars[sim.checkpoints.length - 1] = stars;
          const campaign = structuredClone(state.save.campaign);
          campaign.stars[0][sim.checkpoints.length - 1] = Math.max(campaign.stars[0][sim.checkpoints.length - 1], stars);
          campaignSave = { ...state.save, campaign };
          set({ sectionStars });
          finished = true;
          playCue('bossRoar', settings.audio);
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

    // crossed the finish line — into the boss arena
    if (finished && campaignSave) {
      writeSave(campaignSave);
      startBoss();
      set({
        status: 'boss',
        save: campaignSave,
        toasts: [],
        bossHp: 3,
        bossHearts: 3,
        bossMeter: 0,
        bossPromptText: bossPrompt(),
        ...hudSnapshot()
      });
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
