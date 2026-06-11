import {
  FALL_GRAVITY_MULT,
  FAST_FALL_VELOCITY,
  GRAVITY,
  JUMP_VELOCITY,
  LANES,
  LANE_CHANGE_TIME,
  SLIDE_DURATION
} from './constants';
import { sim } from './engine';
import { clamp } from './math';

/**
 * "Lane Brawler" boss fight. Runs while the runner sim is frozen and PUPPETS
 * the same sim movement fields (laneX/playerY/slideTimer/...) so the existing
 * character, camera shake, and effects render unchanged. The boss attacks in
 * telegraphed lane patterns; clean dodges fill the smash meter; dodging the
 * big windup staggers the boss and opens a strike window.
 */

export type BossPhase = 'intro' | 'dodge' | 'windup' | 'stagger' | 'strike' | 'victory' | 'defeat';

export type AttackType = 'slam' | 'lowSweep' | 'highSweep' | 'shockwave';

export interface BossAttack {
  type: AttackType;
  lane: number;
  /** seconds the telegraph shows before the hit lands */
  telegraph: number;
  t: number;
  resolved: boolean;
}

export type BossEvent =
  | { type: 'dodge' }
  | { type: 'playerHit' }
  | { type: 'bossHit'; combo: number }
  | { type: 'superSlam' }
  | { type: 'stagger' }
  | { type: 'meterFull' }
  | { type: 'roundStart'; pip: number }
  | { type: 'victory' }
  | { type: 'defeat' };

export interface BossSim {
  active: boolean;
  time: number;
  phase: BossPhase;
  phaseT: number;
  hp: number; // pips, 3 → 0
  hearts: number;
  meter: number; // 0..1
  combo: number;
  invulnT: number;
  strikeCooldown: number;
  score: number;
  attack: BossAttack | null;
  queue: BossAttack[];
  /** scene animation drivers */
  bossLane: number; // lane the boss is acting on (for lunges)
  hitFlash: number; // boss flash on being struck
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
  hearts: 3,
  meter: 0,
  combo: 0,
  invulnT: 0,
  strikeCooldown: 0,
  score: 0,
  attack: null,
  queue: [],
  bossLane: 1,
  hitFlash: 0,
  events: []
};

if (typeof window !== 'undefined') window.__burgerBoss = boss;

const INTRO_TIME = 2.4;
const WINDUP_TIME = 1.7;
const STAGGER_TIME = 0.9;
const STRIKE_TIME = 3.4;
const RECOVER_BETWEEN_ATTACKS = 0.5;
const METER_PER_DODGE = 0.2;
const VICTORY_TIME = 2.8;
const DEFEAT_TIME = 1.6;

function buildRound(pip: number): BossAttack[] {
  const speed = pip === 3 ? 1.0 : pip === 2 ? 0.84 : 0.7;
  const tg = (base: number) => base * speed;
  const lane = () => Math.floor(Math.random() * 3);
  const rounds: Record<number, AttackType[]> = {
    3: ['slam', 'lowSweep', 'slam', 'highSweep'],
    2: ['slam', 'highSweep', 'shockwave', 'slam', 'lowSweep'],
    1: ['shockwave', 'slam', 'lowSweep', 'highSweep', 'slam', 'shockwave']
  };
  return (rounds[pip] ?? rounds[1]).map((type) => ({
    type,
    lane: lane(),
    telegraph: tg(type === 'shockwave' ? 1.25 : 1.0),
    t: 0,
    resolved: false
  }));
}

export function startBoss() {
  boss.active = true;
  boss.time = 0;
  boss.phase = 'intro';
  boss.phaseT = 0;
  boss.hp = 3;
  boss.hearts = 3;
  boss.meter = 0;
  boss.combo = 0;
  boss.invulnT = 0;
  boss.strikeCooldown = 0;
  boss.score = 0;
  boss.attack = null;
  boss.queue = [];
  boss.bossLane = 1;
  boss.hitFlash = 0;
  boss.events.length = 0;
  // park the puppet in the center lane
  sim.lane = 1;
  sim.laneX = 0;
  sim.laneFromX = 0;
  sim.laneT = 1;
  sim.playerY = 0;
  sim.verticalVelocity = 0;
  sim.grounded = true;
  sim.slideTimer = 0;
  sim.turnLean = 0;
}

export function stopBoss() {
  boss.active = false;
}

/* ----------------------------- input ----------------------------- */

export function bossMoveLane(direction: -1 | 1) {
  if (!boss.active || boss.phase === 'victory' || boss.phase === 'defeat') return;
  const next = clamp(sim.lane + direction, 0, 2);
  if (next === sim.lane) return;
  sim.laneFromX = sim.laneX;
  sim.lane = next;
  sim.laneT = 0;
}

export function bossJump(): boolean {
  if (!boss.active || boss.phase === 'victory' || boss.phase === 'defeat') return false;
  // during the strike window an up-swipe is a HIT, not a jump
  if (boss.phase === 'strike') {
    if (boss.strikeCooldown > 0) return false;
    boss.strikeCooldown = 0.32;
    boss.combo += 1;
    boss.hitFlash = 1;
    boss.score += 150;
    boss.events.push({ type: 'bossHit', combo: boss.combo });
    return true;
  }
  if (!sim.grounded) return false;
  sim.verticalVelocity = JUMP_VELOCITY;
  sim.grounded = false;
  sim.slideTimer = 0;
  return true;
}

export function bossSlide(): boolean {
  if (!boss.active || boss.phase === 'victory' || boss.phase === 'defeat') return false;
  // full meter + down-swipe in the strike window = BURGER SLAM super
  if (boss.phase === 'strike' && boss.meter >= 1) {
    boss.meter = 0;
    boss.combo += 3;
    boss.hitFlash = 1;
    boss.score += 600;
    boss.hearts = Math.min(3, boss.hearts + 1);
    boss.events.push({ type: 'superSlam' });
    endStrike();
    return true;
  }
  if (!sim.grounded) {
    sim.verticalVelocity = FAST_FALL_VELOCITY;
    return true;
  }
  sim.slideTimer = SLIDE_DURATION;
  return true;
}

/* ----------------------------- phases ----------------------------- */

function isSlidingNow(): boolean {
  return sim.slideTimer > 0 && sim.playerY < 0.2;
}

function dodgedAttack(attack: BossAttack): boolean {
  switch (attack.type) {
    case 'slam':
      return sim.lane !== attack.lane;
    case 'lowSweep':
      return sim.playerY > 0.55;
    case 'highSweep':
      return isSlidingNow();
    case 'shockwave':
      return sim.playerY > 0.35;
  }
}

function setPhase(phase: BossPhase) {
  boss.phase = phase;
  boss.phaseT = 0;
}

function endStrike() {
  boss.hp -= 1;
  boss.combo = 0;
  if (boss.hp <= 0) {
    setPhase('victory');
    boss.events.push({ type: 'victory' });
  } else {
    boss.queue = buildRound(boss.hp);
    boss.attack = null;
    setPhase('dodge');
    boss.events.push({ type: 'roundStart', pip: boss.hp });
  }
}

function resolveHit(attack: BossAttack) {
  if (dodgedAttack(attack)) {
    const before = boss.meter;
    boss.meter = Math.min(1, boss.meter + METER_PER_DODGE);
    boss.score += 100;
    boss.events.push({ type: 'dodge' });
    if (before < 1 && boss.meter >= 1) boss.events.push({ type: 'meterFull' });
  } else if (boss.invulnT <= 0) {
    boss.hearts -= 1;
    boss.invulnT = 1.1;
    sim.shake = 0.8;
    boss.events.push({ type: 'playerHit' });
    if (boss.hearts <= 0) {
      setPhase('defeat');
      boss.events.push({ type: 'defeat' });
    }
  }
}

/** Steps the fight. Returns 'fighting' | 'won' | 'lost' when terminal anims end. */
export function stepBoss(dt: number): 'fighting' | 'won' | 'lost' {
  if (!boss.active) return 'fighting';
  boss.time += dt;
  boss.phaseT += dt;
  boss.invulnT = Math.max(0, boss.invulnT - dt);
  boss.strikeCooldown = Math.max(0, boss.strikeCooldown - dt);
  boss.hitFlash = Math.max(0, boss.hitFlash - dt * 3);
  sim.shake = Math.max(0, sim.shake - dt * 2.2);

  // puppet movement physics (same feel as the runner)
  if (sim.laneT < 1) {
    sim.laneT = Math.min(1, sim.laneT + dt / LANE_CHANGE_TIME);
    const ease = 1 - (1 - sim.laneT) * (1 - sim.laneT);
    sim.laneX = sim.laneFromX + ((LANES[sim.lane] ?? 0) - sim.laneFromX) * ease;
  } else {
    sim.laneX = LANES[sim.lane] ?? 0;
  }
  if (!sim.grounded) {
    sim.playerY += sim.verticalVelocity * dt;
    sim.verticalVelocity -= GRAVITY * (sim.verticalVelocity < 0 ? FALL_GRAVITY_MULT : 1) * dt;
    if (sim.playerY <= 0) {
      sim.playerY = 0;
      sim.verticalVelocity = 0;
      sim.grounded = true;
    }
  }
  sim.slideTimer = Math.max(0, sim.slideTimer - dt);

  switch (boss.phase) {
    case 'intro':
      if (boss.phaseT >= INTRO_TIME) {
        boss.queue = buildRound(boss.hp);
        setPhase('dodge');
        boss.events.push({ type: 'roundStart', pip: boss.hp });
      }
      break;

    case 'dodge': {
      if (!boss.attack) {
        const next = boss.queue.shift();
        if (!next) {
          setPhase('windup');
          break;
        }
        boss.attack = next;
        boss.bossLane = next.lane;
        break;
      }
      boss.attack.t += dt;
      if (!boss.attack.resolved && boss.attack.t >= boss.attack.telegraph) {
        boss.attack.resolved = true;
        resolveHit(boss.attack);
      }
      if (boss.attack.t >= boss.attack.telegraph + RECOVER_BETWEEN_ATTACKS) {
        boss.attack = null;
      }
      break;
    }

    case 'windup':
      // the BIG one: an arena-wide shockwave — jump it to stagger the boss
      if (boss.phaseT >= WINDUP_TIME) {
        const dodged = sim.playerY > 0.35;
        if (dodged) {
          boss.meter = Math.min(1, boss.meter + METER_PER_DODGE);
          boss.score += 150;
          boss.events.push({ type: 'stagger' });
          setPhase('stagger');
        } else if (boss.invulnT <= 0) {
          boss.hearts -= 1;
          boss.invulnT = 1.1;
          sim.shake = 0.9;
          boss.events.push({ type: 'playerHit' });
          if (boss.hearts <= 0) {
            setPhase('defeat');
            boss.events.push({ type: 'defeat' });
          } else {
            boss.queue = buildRound(boss.hp);
            setPhase('dodge');
          }
        } else {
          boss.queue = buildRound(boss.hp);
          setPhase('dodge');
        }
      }
      break;

    case 'stagger':
      if (boss.phaseT >= STAGGER_TIME) setPhase('strike');
      break;

    case 'strike':
      if (boss.phaseT >= STRIKE_TIME) endStrike();
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

/** HUD prompt for the current moment — tells a kid exactly what to do. */
export function bossPrompt(): string {
  switch (boss.phase) {
    case 'intro':
      return 'THE MEGA MANAGER';
    case 'dodge': {
      const attack = boss.attack;
      if (!attack || attack.resolved) return '';
      switch (attack.type) {
        case 'slam':
          return attack.lane === sim.lane ? 'MOVE!' : '';
        case 'lowSweep':
          return 'JUMP!';
        case 'highSweep':
          return 'SLIDE!';
        case 'shockwave':
          return 'JUMP THE WAVE!';
      }
      break;
    }
    case 'windup':
      return 'DODGE THE BIG ONE — JUMP!';
    case 'stagger':
      return 'HE’S DIZZY!';
    case 'strike':
      return boss.meter >= 1 ? 'SWIPE DOWN — BURGER SLAM!' : 'GO! SWIPE UP TO HIT!';
    case 'victory':
      return 'ORDER UP! YOU WIN!';
    case 'defeat':
      return 'WRECKED…';
  }
  return '';
}
