import { create } from 'zustand';
import {
  EMPTY_POWERUPS,
  JUMP_VELOCITY,
  MAX_SPEED,
  POWERUP_DURATION,
  SPAWN_AHEAD_Z,
  SPEED_RAMP,
  START_SPEED,
  SLIDE_DURATION,
  TRACK_SEGMENT_LENGTH,
  GRAVITY
} from './constants';
import { isCoinCollected, isObstacleHit, isPowerupCollected } from './collision';
import { clamp } from './math';
import { createCoinPool, createObstaclePool, createPowerupPool } from './pooling';
import { loadSave, writeSave } from './saveSystem';
import { moveEntities, recyclePassedEntities, spawnSegment } from './spawning';
import type {
  CharacterId,
  CoinEntity,
  GameStatus,
  ObstacleEntity,
  PowerupEntity,
  PowerupTimers,
  SaveState,
  SettingsState
} from './types';
import { playCue } from './audioManager';
import { triggerHaptic } from './haptics';

interface RunnerStore {
  status: GameStatus;
  score: number;
  distance: number;
  runCoins: number;
  multiplier: number;
  speed: number;
  lane: number;
  laneTarget: number;
  laneX: number;
  playerY: number;
  verticalVelocity: number;
  slideTimer: number;
  shake: number;
  powerups: PowerupTimers;
  obstacles: ObstacleEntity[];
  coins: CoinEntity[];
  pickupPowerups: PowerupEntity[];
  nextSpawnZ: number;
  save: SaveState;
  activePanel: 'none' | 'characters' | 'shop' | 'settings';
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

function freshRunState() {
  const obstacles = createObstaclePool();
  const coins = createCoinPool();
  const pickupPowerups = createPowerupPool();
  let nextSpawnZ = 20;

  while (nextSpawnZ < SPAWN_AHEAD_Z) {
    spawnSegment(nextSpawnZ, 0, obstacles, coins, pickupPowerups);
    nextSpawnZ += TRACK_SEGMENT_LENGTH;
  }

  return {
    score: 0,
    distance: 0,
    runCoins: 0,
    multiplier: 1,
    speed: START_SPEED,
    lane: 1,
    laneTarget: 1,
    laneX: 0,
    playerY: 0,
    verticalVelocity: 0,
    slideTimer: 0,
    shake: 0,
    powerups: { ...EMPTY_POWERUPS },
    obstacles,
    coins,
    pickupPowerups,
    nextSpawnZ
  };
}

function finishRun(state: RunnerStore) {
  const save = {
    ...state.save,
    wallet: state.save.wallet + state.runCoins,
    bestScore: Math.max(state.save.bestScore, Math.floor(state.score)),
    bestDistance: Math.max(state.save.bestDistance, Math.floor(state.distance))
  };
  writeSave(save);
  return save;
}

export const useRunnerStore = create<RunnerStore>((set, get) => ({
  status: 'menu',
  ...freshRunState(),
  save: loadSave(),
  activePanel: 'none',

  startRun: () => {
    const settings = get().save.settings;
    playCue('start', settings.audio);
    set({ status: 'running', activePanel: 'none', ...freshRunState() });
  },

  pause: () => {
    if (get().status === 'running') set({ status: 'paused' });
  },

  resume: () => {
    if (get().status === 'paused') set({ status: 'running' });
  },

  restart: () => {
    get().startRun();
  },

  goToMenu: () => {
    set({ status: 'menu', activePanel: 'none', ...freshRunState() });
  },

  moveLane: (direction) => {
    const state = get();
    if (state.status !== 'running') return;
    set({ laneTarget: clamp(state.laneTarget + direction, 0, 2) });
  },

  jump: () => {
    const state = get();
    if (state.status !== 'running' || state.playerY > 0.03) return;
    playCue('jump', state.save.settings.audio);
    triggerHaptic(10, state.save.settings.haptics);
    set({ verticalVelocity: JUMP_VELOCITY, slideTimer: 0 });
  },

  slide: () => {
    const state = get();
    if (state.status !== 'running') return;
    playCue('slide', state.save.settings.audio);
    triggerHaptic(8, state.save.settings.haptics);
    set({ slideTimer: SLIDE_DURATION });
  },

  tick: (dt) => {
    const state = get();
    if (state.status !== 'running') return;

    const powerups = { ...state.powerups };
    for (const key of Object.keys(powerups) as (keyof PowerupTimers)[]) {
      powerups[key] = Math.max(0, powerups[key] - dt);
    }

    const speedBoost = powerups.speedBoost > 0 ? 1.24 : 1;
    const speed = Math.min(MAX_SPEED, state.speed + SPEED_RAMP * dt);
    const deltaZ = speed * speedBoost * dt;
    const distance = state.distance + deltaZ;
    const obstacles = state.obstacles.map((item) => ({ ...item }));
    const coins = state.coins.map((item) => ({ ...item }));
    const pickupPowerups = state.pickupPowerups.map((item) => ({ ...item }));

    moveEntities(obstacles, coins, pickupPowerups, deltaZ);
    recyclePassedEntities(obstacles, coins, pickupPowerups);

    let nextSpawnZ = state.nextSpawnZ - deltaZ;
    while (nextSpawnZ < SPAWN_AHEAD_Z) {
      spawnSegment(nextSpawnZ + SPAWN_AHEAD_Z, distance, obstacles, coins, pickupPowerups);
      nextSpawnZ += TRACK_SEGMENT_LENGTH;
    }

    const laneStep = state.laneTarget === state.lane ? state.lane : state.laneTarget;
    const laneXTarget = (laneStep - 1) * 2.4;
    const laneX = state.laneX + (laneXTarget - state.laneX) * Math.min(1, dt * 12);
    const lane = Math.abs(laneX - laneXTarget) < 0.08 ? laneStep : state.lane;

    let playerY = state.playerY + state.verticalVelocity * dt;
    let verticalVelocity = state.verticalVelocity - GRAVITY * dt;
    if (playerY <= 0) {
      playerY = 0;
      verticalVelocity = 0;
    }

    const slideTimer = Math.max(0, state.slideTimer - dt);
    const isSliding = slideTimer > 0 && playerY < 0.2;
    let runCoins = state.runCoins;
    let scoreBonus = 0;
    let collectedCoin = false;

    for (const coin of coins) {
      if (isCoinCollected(coin, lane, powerups)) {
        coin.active = false;
        coin.collected = true;
        const coinValue = powerups.doubleCoins > 0 ? 2 : 1;
        runCoins += coinValue;
        scoreBonus += 50 * coinValue;
        collectedCoin = true;
      }
    }

    if (collectedCoin) playCue('coin', state.save.settings.audio);

    for (const pickup of pickupPowerups) {
      if (isPowerupCollected(pickup, lane)) {
        pickup.active = false;
        powerups[pickup.type] = POWERUP_DURATION[pickup.type];
        scoreBonus += 350;
        playCue('powerup', state.save.settings.audio);
        triggerHaptic([18, 28, 18], state.save.settings.haptics);
      }
    }

    let status: GameStatus = 'running';
    let save = state.save;
    let shake = Math.max(0, state.shake - dt * 2);

    for (const obstacle of obstacles) {
      if (!isObstacleHit(obstacle, lane, playerY, isSliding)) continue;

      if (powerups.ketchupRush > 0) {
        obstacle.active = false;
        scoreBonus += 200;
        shake = 0.45;
        continue;
      }

      if (powerups.shield > 0) {
        obstacle.active = false;
        powerups.shield = 0;
        shake = 0.55;
        triggerHaptic([30, 30, 30], state.save.settings.haptics);
        continue;
      }

      status = 'gameOver';
      save = finishRun({ ...state, distance, score: state.score + scoreBonus, runCoins });
      playCue('crash', state.save.settings.audio);
      triggerHaptic([40, 60, 90], state.save.settings.haptics);
      shake = 0.8;
      break;
    }

    const multiplier =
      1 +
      (powerups.doubleCoins > 0 ? 1 : 0) +
      (powerups.speedBoost > 0 ? 1 : 0) +
      (powerups.ketchupRush > 0 ? 2 : 0);
    const score = state.score + deltaZ * 9 * multiplier + scoreBonus;

    set({
      status,
      save,
      score,
      distance,
      runCoins,
      multiplier,
      speed,
      lane,
      laneX,
      playerY,
      verticalVelocity,
      slideTimer,
      shake,
      powerups,
      obstacles,
      coins,
      pickupPowerups,
      nextSpawnZ
    });
  },

  setActivePanel: (activePanel) => set({ activePanel }),

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
    set({ save });
  }
}));
