import {
  FALL_GRAVITY_MULT,
  FAST_FALL_VELOCITY,
  GRAVITY,
  JUMP_VELOCITY,
  LANE_CHANGE_TIME
} from './constants';
import { sim } from './engine';
import { clamp } from './math';

/**
 * Smash-style boss fight, side view. Fight axis = world X: the player
 * (rendered via the puppeted sim fields) duels THE MEGA MANAGER across a
 * floating stage. Mechanics built from fighting-game research:
 * - hitstop: Smash formula floor(d*0.65+6) frames, both fighters freeze
 * - input buffer: 160ms tap buffer (Smash Ultimate uses 9f)
 * - knockback: simplified Smash formula, scales with accumulated percent
 * - frame data: light 5f startup / 3f active / 10f recovery, chains to a
 *   heavy on the 3rd hit (Tough Love Arena chain pattern)
 * - boss telegraphs 0.8-1.4s, long recoveries = punish windows
 */

export type BossPhase = 'intro' | 'attack' | 'recovery' | 'windup' | 'stagger' | 'launch' | 'victory' | 'defeat';

export type AttackType = 'slam' | 'lowSweep' | 'highSweep' | 'shockwave';

export interface BossAttack {
  type: AttackType;
  /** zone center (slam) in world X */
  zoneX: number;
  telegraph: number;
  t: number;
  resolved: boolean;
  /** travelling pin position for sweeps */
  pinX: number;
  prevPinX: number;
}

export type BossEvent =
  | { type: 'dodge' }
  | { type: 'playerHit' }
  | { type: 'bossHit'; combo: number; damage: number }
  | { type: 'clank' }
  | { type: 'superSlam' }
  | { type: 'stagger' }
  | { type: 'meterFull' }
  | { type: 'launch'; pip: number }
  | { type: 'roundStart'; pip: number }
  | { type: 'victory' }
  | { type: 'defeat' };

type PlayerAtkPhase = 'idle' | 'startup' | 'active' | 'recover';

export interface BossSim {
  active: boolean;
  time: number;
  phase: BossPhase;
  phaseT: number;
  /** pips remaining (3 → 0); a pip falls when percent crosses its threshold */
  hp: number;
  /** Smash-style accumulated damage percent */
  percent: number;
  hearts: number;
  meter: number;
  combo: number;
  invulnT: number;
  /** hitstop freeze remaining (everything pauses) */
  hitstopT: number;
  /** slow-mo factor for the launch "special zoom" */
  timeScale: number;
  score: number;
  attack: BossAttack | null;
  queue: AttackType[];
  /** boss body position/motion */
  bossX: number;
  bossY: number;
  bossVelX: number;
  bossVelY: number;
  /** player attack state machine */
  atkPhase: PlayerAtkPhase;
  atkT: number;
  atkHeavy: boolean;
  atkBuffer: number;
  hitFlash: number;
  /** meleelight rule: getting hit cancels your move — boss stun freezes his attack */
  bossStunT: number;
  jumpsUsed: number;
  events: BossEvent[];
}

declare global {
  interface Window {
    __burgerBoss?: BossSim;
  }
}

export const boss: BossSim = {
  active: false,
  time: 0,
  phase: 'intro',
  phaseT: 0,
  hp: 3,
  percent: 0,
  hearts: 3,
  meter: 0,
  combo: 0,
  invulnT: 0,
  hitstopT: 0,
  timeScale: 1,
  score: 0,
  attack: null,
  queue: [],
  bossX: -8,
  bossY: 0,
  bossVelX: 0,
  bossVelY: 0,
  atkPhase: 'idle',
  atkT: 0,
  atkHeavy: false,
  atkBuffer: 0,
  hitFlash: 0,
  bossStunT: 0,
  jumpsUsed: 0,
  events: []
};

if (typeof window !== 'undefined') window.__burgerBoss = boss;

/* ------------------------------ tuning ------------------------------ */

export const STAGE_MIN_X = -7.5; // player can chase deep into boss territory
export const STAGE_MAX_X = 2.5;
export const BOSS_HOME_X = -8;
const BOSS_MIN_X = -10.5;
const DASH_STEP = 1.9;

const INTRO_TIME = 2.4;
const RECOVERY_TIME = 1.25; // punish window after each boss attack
const WINDUP_TIME = 1.5;
const STAGGER_TIME = 3.5; // big punish window
const LAUNCH_TIME = 1.7;
const VICTORY_TIME = 2.6;
const DEFEAT_TIME = 1.6;

const ATK_STARTUP = 0.085; // ~5f
const ATK_ACTIVE = 0.05; // ~3f
const ATK_RECOVER = 0.17; // ~10f
const ATK_RANGE = 3.2;
const ATK_LUNGE = 0.95;
/** buffer must outlive active+recover (~220ms) so mash-chains connect */
const ATK_BUFFER_TIME = 0.28;
const LIGHT_DMG = 12;
const HEAVY_DMG = 18;
const SUPER_DMG = 35;
/** percent thresholds where the next hit LAUNCHES a pip away */
const PIP_THRESHOLDS = [60, 130, 200];
const METER_PER_DODGE = 0.2;

function hitstopFor(damage: number): number {
  // Smash: floor(d*0.65+6) frames @60fps, capped
  return Math.min(0.3, ((damage * 0.65 + 6) / 60) * 0.85);
}

function knockbackFor(damage: number): number {
  // simplified SmashWiki formula, w=100, s=0.85, b=30
  const p = boss.percent;
  const kb = ((p / 10 + (p * damage) / 20) * 1.4 + 18) * 0.85 + 30;
  return kb * 0.02; // world-units impulse
}

/* ------------------------------ control ------------------------------ */

export function startBoss() {
  boss.active = true;
  boss.time = 0;
  boss.phase = 'intro';
  boss.phaseT = 0;
  boss.hp = 3;
  boss.percent = 0;
  boss.hearts = 3;
  boss.meter = 0;
  boss.combo = 0;
  boss.invulnT = 0;
  boss.hitstopT = 0;
  boss.timeScale = 1;
  boss.score = 0;
  boss.attack = null;
  boss.queue = [];
  boss.bossX = BOSS_HOME_X;
  boss.bossY = 0;
  boss.bossVelX = 0;
  boss.bossVelY = 0;
  boss.atkPhase = 'idle';
  boss.atkT = 0;
  boss.atkHeavy = false;
  boss.atkBuffer = 0;
  boss.hitFlash = 0;
  boss.bossStunT = 0;
  boss.jumpsUsed = 0;
  boss.events.length = 0;
  // park the puppet stage-left, facing the boss
  sim.lane = 1;
  sim.laneX = 1.2;
  sim.laneFromX = 1.2;
  sim.laneT = 1;
  sim.playerY = 0;
  sim.verticalVelocity = 0;
  sim.grounded = true;
  sim.slideTimer = 0;
  sim.turnLean = 0;
}

export function stopBoss() {
  boss.active = false;
  boss.timeScale = 1;
}

function fightInputBlocked(): boolean {
  return !boss.active || boss.phase === 'victory' || boss.phase === 'defeat' || boss.phase === 'launch';
}

/** swipe left/right = spacing dash along the fight axis (screen dir = -X right) */
export function bossMoveLane(direction: -1 | 1) {
  if (fightInputBlocked()) return;
  const target = clamp(sim.laneX + (direction === 1 ? -DASH_STEP : DASH_STEP), STAGE_MIN_X, STAGE_MAX_X);
  sim.laneFromX = sim.laneX;
  sim.laneT = 0;
  // store the dash target in lane slot 1's stead — we drive laneX manually
  dashTarget = target;
}
let dashTarget = 1.2;

export function bossJump(): boolean {
  if (fightInputBlocked()) return false;
  if (sim.grounded) {
    sim.verticalVelocity = JUMP_VELOCITY;
    sim.grounded = false;
    sim.slideTimer = 0;
    boss.jumpsUsed = 1;
    return true;
  }
  // double jump (meleelight: ~0.94x of the full hop)
  if (boss.jumpsUsed < 2) {
    sim.verticalVelocity = JUMP_VELOCITY * 0.94;
    boss.jumpsUsed = 2;
    return true;
  }
  return false;
}

export function bossSlide(): boolean {
  if (fightInputBlocked()) return false;
  // full meter = BURGER SLAM super, any time you can reach him
  if (boss.meter >= 1 && Math.abs(sim.laneX - boss.bossX) < ATK_RANGE + 1) {
    boss.meter = 0;
    landHit(SUPER_DMG, true);
    boss.hearts = Math.min(3, boss.hearts + 1);
    boss.events.push({ type: 'superSlam' });
    return true;
  }
  if (!sim.grounded) {
    sim.verticalVelocity = FAST_FALL_VELOCITY;
    return true;
  }
  sim.slideTimer = 0.6; // duck
  return true;
}

/** TAP = attack (light, chains into a heavy on the 3rd hit) */
export function bossTap() {
  if (fightInputBlocked()) return;
  if (boss.atkPhase === 'idle') {
    beginAttack();
  } else {
    boss.atkBuffer = ATK_BUFFER_TIME; // buffered — fires when recover ends
  }
}

function beginAttack() {
  boss.atkPhase = 'startup';
  boss.atkT = 0;
  boss.atkHeavy = boss.combo > 0 && (boss.combo + 1) % 3 === 0;
  // lunge toward the boss
  sim.laneFromX = sim.laneX;
  sim.laneT = 0;
  dashTarget = clamp(sim.laneX - ATK_LUNGE, STAGE_MIN_X, STAGE_MAX_X);
}

function landHit(damage: number, isSuper = false, aerial = false) {
  const staggerBonus = boss.phase === 'stagger' ? 1.25 : 1;
  const dealt = Math.round(damage * staggerBonus);
  boss.percent += dealt;
  boss.combo += 1;
  boss.score += dealt * 12;
  boss.hitFlash = 1;
  boss.hitstopT = hitstopFor(dealt);
  sim.shake = Math.min(1, 0.25 + dealt * 0.02);
  // he's a heavyweight: normal hits nudge him (so combos stay in reach),
  // launches use the full Smash impulse
  const kb = knockbackFor(dealt);
  boss.bossVelX = -kb * 0.45 * (isSuper ? 1.6 : 1);
  boss.bossVelY = kb * (aerial ? 0.55 : 0.3);
  // hitstun cancels his current action (meleelight: hitstun = kb * 0.4 frames)
  boss.bossStunT = Math.min(0.55, (kb * 0.4) / 60 + 0.12);
  boss.events.push({ type: 'bossHit', combo: boss.combo, damage: dealt });

  // crossing a pip threshold = LAUNCH
  const threshold = PIP_THRESHOLDS[3 - boss.hp];
  if (boss.percent >= threshold) {
    boss.hp -= 1;
    boss.timeScale = 0.35; // special-zoom slow-mo
    boss.bossVelX = -kb * 2.6 - 6;
    boss.bossVelY = kb * 1.4 + 7;
    setPhase(boss.hp <= 0 ? 'victory' : 'launch');
    boss.events.push(boss.hp <= 0 ? { type: 'victory' } : { type: 'launch', pip: boss.hp });
  }
}

/* ------------------------------ phases ------------------------------ */

function isDucking(): boolean {
  return sim.slideTimer > 0 && sim.playerY < 0.2;
}

function setPhase(phase: BossPhase) {
  boss.phase = phase;
  boss.phaseT = 0;
}

function makeAttack(type: AttackType): BossAttack {
  const speed = boss.hp === 3 ? 1 : boss.hp === 2 ? 0.85 : 0.72;
  return {
    type,
    zoneX: sim.laneX,
    telegraph: (type === 'shockwave' ? 1.35 : type === 'slam' ? 1.0 : 0.9) * speed,
    t: 0,
    resolved: false,
    pinX: boss.bossX + 1.5,
    prevPinX: boss.bossX + 1.5
  };
}

function roundQueue(pip: number): AttackType[] {
  const rounds: Record<number, AttackType[]> = {
    3: ['slam', 'lowSweep', 'highSweep'],
    2: ['lowSweep', 'slam', 'shockwave', 'highSweep'],
    1: ['shockwave', 'slam', 'highSweep', 'lowSweep', 'slam']
  };
  return [...(rounds[pip] ?? rounds[1])];
}

function resolveDodge(dodged: boolean) {
  if (dodged) {
    const before = boss.meter;
    boss.meter = Math.min(1, boss.meter + METER_PER_DODGE);
    boss.score += 100;
    boss.events.push({ type: 'dodge' });
    if (before < 1 && boss.meter >= 1) boss.events.push({ type: 'meterFull' });
  } else if (boss.invulnT <= 0) {
    boss.hearts -= 1;
    boss.invulnT = 1.1;
    sim.shake = 0.85;
    // player kickback
    sim.laneFromX = sim.laneX;
    sim.laneT = 0;
    dashTarget = clamp(sim.laneX + 1.3, STAGE_MIN_X, STAGE_MAX_X);
    boss.events.push({ type: 'playerHit' });
    if (boss.hearts <= 0) {
      setPhase('defeat');
      boss.events.push({ type: 'defeat' });
    }
  }
}

/** Steps the fight. Returns 'fighting' | 'won' | 'lost'. */
export function stepBoss(rawDt: number): 'fighting' | 'won' | 'lost' {
  if (!boss.active) return 'fighting';

  // hitstop freezes EVERYTHING except its own timer (Smash hitlag)
  if (boss.hitstopT > 0) {
    boss.hitstopT -= rawDt;
    return 'fighting';
  }
  // special-zoom slow-mo eases back to full speed
  boss.timeScale += (1 - boss.timeScale) * Math.min(1, rawDt * 1.6);
  const dt = rawDt * boss.timeScale;

  boss.time += dt;
  boss.bossStunT = Math.max(0, boss.bossStunT - dt);
  // while stunned, the boss cannot advance his attacks or phases
  const bossActs = boss.bossStunT <= 0;
  if (bossActs) boss.phaseT += dt;
  boss.invulnT = Math.max(0, boss.invulnT - dt);
  boss.hitFlash = Math.max(0, boss.hitFlash - dt * 3);
  sim.shake = Math.max(0, sim.shake - dt * 2.2);

  // ---- puppet player movement (dash tween + jump physics + duck) ----
  if (sim.laneT < 1) {
    sim.laneT = Math.min(1, sim.laneT + dt / LANE_CHANGE_TIME);
    const ease = 1 - (1 - sim.laneT) * (1 - sim.laneT);
    sim.laneX = sim.laneFromX + (dashTarget - sim.laneFromX) * ease;
  }
  if (!sim.grounded) {
    sim.playerY += sim.verticalVelocity * dt;
    sim.verticalVelocity -= GRAVITY * (sim.verticalVelocity < 0 ? FALL_GRAVITY_MULT : 1) * dt;
    if (sim.playerY <= 0) {
      sim.playerY = 0;
      sim.verticalVelocity = 0;
      sim.grounded = true;
      boss.jumpsUsed = 0;
    }
  }
  sim.slideTimer = Math.max(0, sim.slideTimer - dt);

  // ---- player attack state machine ----
  boss.atkBuffer = Math.max(0, boss.atkBuffer - dt);
  if (boss.atkPhase !== 'idle') {
    boss.atkT += dt;
    if (boss.atkPhase === 'startup' && boss.atkT >= ATK_STARTUP) {
      boss.atkPhase = 'active';
      boss.atkT = 0;
      // connect? (meleelight rule: pressing attack ALWAYS matters)
      if (Math.abs(sim.laneX - boss.bossX) < ATK_RANGE && boss.bossY < 2.2) {
        landHit(boss.atkHeavy ? HEAVY_DMG : LIGHT_DMG, false, !sim.grounded);
      } else {
        boss.combo = 0; // whiff drops the combo
      }
    } else if (boss.atkPhase === 'active' && boss.atkT >= ATK_ACTIVE) {
      boss.atkPhase = 'recover';
      boss.atkT = 0;
    } else if (boss.atkPhase === 'recover' && boss.atkT >= ATK_RECOVER) {
      boss.atkPhase = 'idle';
      boss.atkT = 0;
      if (boss.atkBuffer > 0) {
        boss.atkBuffer = 0;
        beginAttack();
      }
    }
  }

  // ---- boss knockback physics ----
  boss.bossX += boss.bossVelX * dt;
  boss.bossY += boss.bossVelY * dt;
  if (boss.phase === 'launch' || boss.phase === 'victory') {
    boss.bossVelY -= 14 * dt; // tumble through the air
  } else {
    boss.bossVelX *= Math.pow(0.05, dt);
    boss.bossVelY -= 30 * dt;
    if (boss.bossY <= 0) {
      boss.bossY = 0;
      boss.bossVelY = 0;
    }
    boss.bossX = clamp(boss.bossX, BOSS_MIN_X, BOSS_HOME_X + 1);
  }

  // ---- fight phases ----
  switch (boss.phase) {
    case 'intro':
      if (boss.phaseT >= INTRO_TIME) {
        boss.queue = roundQueue(boss.hp);
        setPhase('attack');
        boss.events.push({ type: 'roundStart', pip: boss.hp });
      }
      break;

    case 'attack': {
      if (!boss.attack) {
        const type = boss.queue.shift();
        if (!type) {
          setPhase('windup');
          break;
        }
        boss.attack = makeAttack(type);
        break;
      }
      const attack = boss.attack;
      if (bossActs) attack.t += dt;
      const k = attack.t / attack.telegraph;

      if (attack.type === 'lowSweep' || attack.type === 'highSweep') {
        // pin launches after 55% telegraph and rolls across the stage
        if (k > 0.55) {
          attack.prevPinX = attack.pinX;
          attack.pinX += dt * 16;
          // crossing the player?
          if (!attack.resolved && attack.prevPinX < sim.laneX + 0.45 && attack.pinX >= sim.laneX - 0.45) {
            attack.resolved = true;
            resolveDodge(attack.type === 'lowSweep' ? sim.playerY > 0.55 : isDucking());
          }
        }
        if (attack.pinX > STAGE_MAX_X + 3) {
          boss.attack = null;
          setPhase('recovery');
        }
      } else if (attack.type === 'slam') {
        if (!attack.resolved && k >= 1) {
          attack.resolved = true;
          resolveDodge(Math.abs(sim.laneX - attack.zoneX) > 1.7);
        }
        if (attack.t >= attack.telegraph + 0.25) {
          boss.attack = null;
          setPhase('recovery');
        }
      } else {
        // shockwave ring reaches the player when its radius = distance
        const radius = Math.max(0, (k - 0.4) * 1.8) * Math.abs(STAGE_MAX_X - BOSS_MIN_X);
        const dist = Math.abs(sim.laneX - boss.bossX);
        if (!attack.resolved && radius >= dist) {
          attack.resolved = true;
          resolveDodge(sim.playerY > 0.35);
        }
        if (attack.t >= attack.telegraph + 0.35) {
          boss.attack = null;
          setPhase('recovery');
        }
      }
      break;
    }

    case 'recovery':
      if (boss.phaseT >= RECOVERY_TIME) {
        if (boss.queue.length > 0) setPhase('attack');
        else setPhase('windup');
      }
      break;

    case 'windup':
      if (boss.phaseT >= WINDUP_TIME) {
        const dodged = sim.playerY > 0.35;
        if (dodged) {
          boss.meter = Math.min(1, boss.meter + METER_PER_DODGE);
          boss.events.push({ type: 'stagger' });
          setPhase('stagger');
        } else {
          resolveDodge(false);
          if (boss.hearts > 0) {
            boss.queue = roundQueue(boss.hp);
            setPhase('attack');
          }
        }
      }
      break;

    case 'stagger':
      if (boss.phaseT >= STAGGER_TIME) {
        boss.combo = 0;
        boss.queue = roundQueue(boss.hp);
        setPhase('attack');
        boss.events.push({ type: 'roundStart', pip: boss.hp });
      }
      break;

    case 'launch':
      if (boss.phaseT >= LAUNCH_TIME) {
        // he storms back, angrier
        boss.bossX = BOSS_HOME_X;
        boss.bossY = 0;
        boss.bossVelX = 0;
        boss.bossVelY = 0;
        boss.combo = 0;
        boss.queue = roundQueue(boss.hp);
        setPhase('attack');
        boss.events.push({ type: 'roundStart', pip: boss.hp });
      }
      break;

    case 'victory':
      if (boss.phaseT >= VICTORY_TIME) return 'won';
      break;

    case 'defeat':
      if (boss.phaseT >= DEFEAT_TIME) return 'lost';
      break;
  }

  return 'fighting';
}

/** HUD prompt — tells a kid exactly what to do right now. */
export function bossPrompt(): string {
  switch (boss.phase) {
    case 'intro':
      return 'THE MEGA MANAGER';
    case 'attack': {
      const attack = boss.attack;
      if (!attack || attack.resolved) return '';
      switch (attack.type) {
        case 'slam':
          return Math.abs(sim.laneX - attack.zoneX) <= 1.7 ? 'MOVE AWAY!' : '';
        case 'lowSweep':
          return 'JUMP THE PIN!';
        case 'highSweep':
          return 'DUCK!';
        case 'shockwave':
          return 'JUMP THE WAVE!';
      }
      break;
    }
    case 'recovery':
      return boss.meter >= 1 ? 'SWIPE DOWN — BURGER SLAM!' : 'HE\u2019S OPEN — TAP TAP TAP!';
    case 'windup':
      return 'BIG ONE — JUMP!';
    case 'stagger':
      return boss.meter >= 1 ? 'SWIPE DOWN — BURGER SLAM!' : 'HE’S DIZZY — TAP TAP TAP!';
    case 'launch':
      return 'LAUNCHED!';
    case 'victory':
      return 'ORDER UP! YOU WIN!';
    case 'defeat':
      return 'WRECKED…';
  }
  return '';
}
