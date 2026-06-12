import { sim } from './engine';
import { clamp } from './math';

/**
 * MORTAL KOMBAT-style 1v1 fight (MK11 presentation, MK Mobile touch grammar):
 * health bars, best-of-3 rounds, tap strings, hold-to-block with chip damage,
 * uppercut launcher, meter special, throws against turtling, FATAL BLOW under
 * 30% health, and "FINISH THE ORDER!" on match point. Locked side axis:
 * player walks along world X (sim.laneX puppets the renderer), boss mirrors.
 */

export type BossPhase = 'intro' | 'fight' | 'roundEnd' | 'finishHim' | 'finisher' | 'victory' | 'defeat';

export type FighterState =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'block'
  | 'duck'
  | 'special'
  | 'uppercut'
  | 'hitstun'
  | 'knockdown'
  | 'throw';

export interface FxEvent {
  kind: 'spark' | 'chip' | 'dust' | 'super';
  x: number;
  y: number;
  t: number;
}

export type BossEvent =
  | { type: 'playerHit'; damage: number }
  | { type: 'bossHit'; combo: number; damage: number }
  | { type: 'block' }
  | { type: 'special' }
  | { type: 'uppercut' }
  | { type: 'throw' }
  | { type: 'knockdown' }
  | { type: 'roundStart'; round: number }
  | { type: 'ko'; winner: 'player' | 'boss' }
  | { type: 'finishHim' }
  | { type: 'fatal' }
  | { type: 'victory' }
  | { type: 'defeat' };

interface AttackStep {
  startup: number;
  active: number;
  recover: number;
  damage: number;
  reach: number;
  knockdown?: boolean;
  low?: boolean; // duckable highs are default; lows must be blocked
}

export interface BossSim {
  active: boolean;
  time: number;
  phase: BossPhase;
  phaseT: number;
  round: number;
  playerWins: number;
  bossWins: number;
  playerHP: number;
  bossHP: number;
  meter: number;
  fatalUsed: boolean;
  combo: number;
  hitstopT: number;
  timeScale: number;
  score: number;
  /** player fighter state */
  pState: FighterState;
  pStateT: number;
  pString: number; // current string step 0..2
  pBuffer: number;
  pBlockHeld: boolean;
  /** boss fighter */
  bossX: number;
  bossY: number;
  bState: FighterState;
  bStateT: number;
  bString: number;
  bCooldown: number;
  bTelegraph: number; // >0 while windup flashes red
  bBlockedRecently: number;
  /** projectile (sauce bottle), x<-90 = inactive */
  projX: number;
  projDir: number;
  projFrom: 'player' | 'boss';
  hitFlash: number;
  pHitFlash: number;
  fx: FxEvent[];
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
  round: 1,
  playerWins: 0,
  bossWins: 0,
  playerHP: 100,
  bossHP: 100,
  meter: 0,
  fatalUsed: false,
  combo: 0,
  hitstopT: 0,
  timeScale: 1,
  score: 0,
  pState: 'idle',
  pStateT: 0,
  pString: 0,
  pBuffer: 0,
  pBlockHeld: false,
  bossX: -6.5,
  bossY: 0,
  bState: 'idle',
  bStateT: 0,
  bString: 0,
  bCooldown: 1,
  bTelegraph: 0,
  bBlockedRecently: 0,
  projX: -999,
  projDir: 1,
  projFrom: 'boss',
  hitFlash: 0,
  pHitFlash: 0,
  fx: [],
  events: []
};

if (typeof window !== 'undefined') window.__burgerBoss = boss;

/* ------------------------------ tuning ------------------------------ */

export const P_MIN_X = -6.5; // must reach the boss even at his deepest corner (B_MIN_X + MIN_GAP)
export const P_MAX_X = 5.0;
export const B_MIN_X = -8.0;
export const B_MAX_X = 2.0;
const MIN_GAP = 1.5;
const WALK_STEP = 1.1;

const INTRO_TIME = 2.2;
const ROUND_END_TIME = 2.4;
const FINISH_WINDOW = 6;

// player string: jab → cross → spinning ender (MK-style 1-1-2)
// startups timed to the CLIPS at their display speeds — damage lands when
// the fist visually extends (contact-frame sync, the thing that sells hits)
const P_STRING: AttackStep[] = [
  { startup: 0.22, active: 0.1, recover: 0.2, damage: 5, reach: 2.4 },
  { startup: 0.24, active: 0.1, recover: 0.22, damage: 6, reach: 2.4 },
  { startup: 0.34, active: 0.12, recover: 0.34, damage: 9, reach: 2.6, knockdown: true }
];
const P_UPPERCUT: AttackStep = { startup: 0.42, active: 0.12, recover: 0.55, damage: 13, reach: 2.4, knockdown: true };
const SPECIAL_DMG = 10;
const SPECIAL_COST = 0.5;
const FATAL_DMG = 32;
const CHIP_RATIO = 0.18;
const THROW_DMG = 9;

// boss strings by round (faster + heavier later)
function bossString(round: number): AttackStep[] {
  const s = 1 - (round - 1) * 0.12;
  return [
    { startup: 0.42 * s, active: 0.08, recover: 0.3, damage: 6, reach: 2.6 },
    { startup: 0.3 * s, active: 0.08, recover: 0.34, damage: 7, reach: 2.6 },
    { startup: 0.36 * s, active: 0.09, recover: 0.55, damage: 10, reach: 2.8, knockdown: true, low: true }
  ];
}

const HITSTUN = 0.32;
const KNOCKDOWN_TIME = 1.15;
const BLOCK_PUSH = 0.55;

function hitstopFor(damage: number): number {
  return Math.min(0.26, ((damage * 0.65 + 6) / 60) * 0.9);
}

let pHitDone = false;
let bHitDone = false;

/* ------------------------------ control ------------------------------ */

function resetRound() {
  pHitDone = false;
  bHitDone = false;
  boss.playerHP = 100;
  boss.bossHP = 100;
  boss.combo = 0;
  boss.pState = 'idle';
  boss.pStateT = 0;
  boss.pString = 0;
  boss.pBuffer = 0;
  boss.bossX = -6.5;
  boss.bossY = 0;
  boss.bState = 'idle';
  boss.bStateT = 0;
  boss.bCooldown = 1.2;
  boss.bTelegraph = 0;
  boss.projX = -999;
  sim.laneX = 1.6;
  sim.laneFromX = 1.6;
  sim.laneT = 1;
  sim.playerY = 0;
  sim.verticalVelocity = 0;
  sim.grounded = true;
  sim.slideTimer = 0;
}

export function startBoss() {
  boss.active = true;
  boss.time = 0;
  boss.phase = 'intro';
  boss.phaseT = 0;
  boss.round = 1;
  boss.playerWins = 0;
  boss.bossWins = 0;
  boss.meter = 0;
  boss.fatalUsed = false;
  boss.hitstopT = 0;
  boss.timeScale = 1;
  boss.score = 0;
  boss.hitFlash = 0;
  boss.pHitFlash = 0;
  boss.fx.length = 0;
  boss.events.length = 0;
  boss.pBlockHeld = false;
  resetRound();
  sim.turnLean = 0;
}

export function stopBoss() {
  boss.active = false;
  boss.timeScale = 1;
}

function canAct(): boolean {
  return (
    boss.active &&
    boss.phase === 'fight' &&
    boss.pState !== 'hitstun' &&
    boss.pState !== 'knockdown' &&
    boss.pState !== 'throw'
  );
}

function moveTo(x: number) {
  sim.laneFromX = sim.laneX;
  sim.laneT = 0;
  dashTarget = clamp(x, P_MIN_X, P_MAX_X);
}
let dashTarget = 1.6;

/** MCoC scheme: swipe toward = DASH-IN ATTACK (auto-closes to range), swipe away = dash back */
export function bossMoveLane(direction: -1 | 1) {
  if (!canAct() || boss.pState === 'attack' || boss.pState === 'uppercut') return;
  if (direction === 1) {
    // dash-in attack: lunge all the way to striking range and swing
    boss.pState = 'attack';
    boss.pStateT = 0;
    boss.pString = 0;
    moveTo(boss.bossX + MIN_GAP);
    return;
  }
  moveTo(sim.laneX + WALK_STEP * 1.6); // dash back
  boss.pState = 'walk';
  boss.pStateT = 0;
}

/** swipe up = MK uppercut (launcher, punishable on whiff) */
export function bossJump(): boolean {
  if (!canAct() || boss.pState === 'attack' || boss.pState === 'uppercut') return false;
  boss.pState = 'uppercut';
  boss.pStateT = 0;
  boss.events.push({ type: 'uppercut' });
  return true;
}

/** swipe down = sauce-blast special (meter) or duck */
export function bossSlide(): boolean {
  if (!canAct()) return false;
  if (boss.meter >= SPECIAL_COST && boss.projX < -90) {
    boss.meter -= SPECIAL_COST;
    boss.pState = 'special';
    boss.pStateT = 0;
    boss.projX = sim.laneX - 0.8;
    boss.projDir = -1;
    boss.projFrom = 'player';
    boss.events.push({ type: 'special' });
    return true;
  }
  boss.pState = 'duck';
  boss.pStateT = 0;
  return true;
}

/** tap = attack string (chains on buffered taps) */
export function bossTap() {
  if (!canAct()) return;
  if (boss.pState === 'attack' || boss.pState === 'uppercut' || boss.pState === 'special') {
    boss.pBuffer = 0.3;
    return;
  }
  boss.pState = 'attack';
  boss.pStateT = 0;
  boss.pString = 0;
  // auto-close to striking range (MCoC lunge-to-target) — spacing is the
  // game's job, not the player's
  moveTo(boss.bossX + MIN_GAP);
}

export function bossBlockStart() {
  boss.pBlockHeld = true;
  if (canAct() && (boss.pState === 'idle' || boss.pState === 'walk' || boss.pState === 'duck')) {
    boss.pState = 'block';
    boss.pStateT = 0;
  }
}

export function bossBlockEnd() {
  boss.pBlockHeld = false;
  if (boss.pState === 'block') boss.pState = 'idle';
}

export function fatalReady(): boolean {
  return boss.phase === 'fight' && !boss.fatalUsed && boss.playerHP <= 30 && boss.meter >= 1;
}

export function bossFatalBlow(): boolean {
  if (!fatalReady() || !canAct()) return false;
  boss.fatalUsed = true;
  boss.meter = 0;
  boss.timeScale = 0.32;
  boss.hitstopT = 0.1;
  moveTo(boss.bossX + MIN_GAP);
  damageBoss(FATAL_DMG, true);
  boss.events.push({ type: 'fatal' });
  boss.fx.push({ kind: 'super', x: boss.bossX, y: 2, t: 0 });
  return true;
}

/* ------------------------------ combat ------------------------------ */

function pushFx(kind: FxEvent['kind'], x: number, y: number) {
  boss.fx.push({ kind, x, y, t: 0 });
  if (boss.fx.length > 12) boss.fx.shift();
}

function damageBoss(damage: number, heavy = false) {
  bHitDone = false; // interrupting his swing resets his connect guard
  boss.bossHP = Math.max(0, boss.bossHP - damage);
  boss.combo += 1;
  boss.meter = Math.min(1, boss.meter + 0.1);
  boss.score += damage * 15;
  boss.hitFlash = 1;
  boss.hitstopT = Math.max(boss.hitstopT, hitstopFor(damage));
  sim.shake = Math.min(1, 0.2 + damage * 0.03);
  boss.bossX = clamp(boss.bossX - (heavy ? 0.7 : 0.3), B_MIN_X, B_MAX_X);
  pushFx('spark', boss.bossX + 1, 1.8 + Math.random() * 0.8);
  boss.events.push({ type: 'bossHit', combo: boss.combo, damage });
  if (boss.bossHP <= 0) endRound('player');
}

function damagePlayer(damage: number, knockdown = false) {
  if (boss.pState === 'block') {
    const chip = Math.max(1, Math.round(damage * CHIP_RATIO));
    boss.playerHP = Math.max(0, boss.playerHP - chip);
    boss.meter = Math.min(1, boss.meter + 0.05);
    moveTo(sim.laneX + BLOCK_PUSH);
    pushFx('chip', sim.laneX - 0.6, 1.4);
    boss.events.push({ type: 'block' });
    boss.bBlockedRecently = 2.2;
  } else {
    boss.playerHP = Math.max(0, boss.playerHP - damage);
    boss.meter = Math.min(1, boss.meter + 0.08);
    boss.combo = 0;
    boss.pHitFlash = 1;
    boss.hitstopT = Math.max(boss.hitstopT, hitstopFor(damage) * 0.8);
    sim.shake = Math.min(1, 0.25 + damage * 0.03);
    boss.pState = knockdown ? 'knockdown' : 'hitstun';
    boss.pStateT = 0;
    pHitDone = false; // an interrupted attack must not eat the next one's hit
    moveTo(sim.laneX + (knockdown ? 1.4 : 0.5));
    pushFx('spark', sim.laneX - 0.4, 1.6);
    boss.events.push({ type: 'playerHit', damage });
    if (knockdown) boss.events.push({ type: 'knockdown' });
  }
  if (boss.playerHP <= 0) endRound('boss');
}

function endRound(winner: 'player' | 'boss') {
  if (winner === 'player') boss.playerWins += 1;
  else boss.bossWins += 1;
  boss.events.push({ type: 'ko', winner });
  if (winner === 'player' && boss.playerWins >= 2) {
    boss.phase = 'finishHim';
    boss.phaseT = 0;
    boss.bState = 'hitstun';
    boss.events.push({ type: 'finishHim' });
    return;
  }
  if (winner === 'boss' && boss.bossWins >= 2) {
    boss.phase = 'defeat';
    boss.phaseT = 0;
    boss.events.push({ type: 'defeat' });
    return;
  }
  boss.phase = 'roundEnd';
  boss.phaseT = 0;
}

/** finishing tap during FINISH THE ORDER */
export function finishTap(): boolean {
  if (boss.phase !== 'finishHim') return false;
  boss.phase = 'finisher';
  boss.phaseT = 0;
  boss.timeScale = 0.4;
  boss.hitstopT = 0.12;
  pushFx('super', boss.bossX, 2.2);
  sim.shake = 1;
  return true;
}

/* ------------------------------ boss AI ------------------------------ */

function aiDecide(round: number) {
  const gap = Math.abs(sim.laneX - boss.bossX) - 1.2;
  const aggression = 0.45 + round * 0.12;
  const r = Math.random();

  // punish a turtling player with a throw
  if (gap < 1.2 && boss.bBlockedRecently > 0 && r < 0.3) {
    boss.bState = 'throw';
    boss.bStateT = 0;
    boss.bTelegraph = 0.5;
    return;
  }
  if (gap > 3.5) {
    if (r < 0.25 && boss.projX < -90) {
      boss.bState = 'special';
      boss.bStateT = 0;
      boss.bTelegraph = 0.55;
    } else {
      boss.bState = 'walk';
      boss.bStateT = 0;
    }
    return;
  }
  if (gap > 1.4) {
    boss.bState = r < aggression ? 'walk' : 'idle';
    boss.bStateT = 0;
    boss.bCooldown = 0.25;
    return;
  }
  // close range
  if (r < aggression) {
    boss.bState = 'attack';
    boss.bString = 0;
    boss.bStateT = 0;
    boss.bTelegraph = bossString(round)[0].startup;
  } else if (r < aggression + 0.2) {
    boss.bState = 'block';
    boss.bStateT = 0;
    boss.bCooldown = 0.6;
  } else {
    boss.bossX = clamp(boss.bossX - 0.8, B_MIN_X, B_MAX_X);
    boss.bState = 'walk';
    boss.bStateT = 0;
    boss.bCooldown = 0.4;
  }
}

/* ------------------------------ step ------------------------------ */

export function stepBoss(rawDt: number): 'fighting' | 'won' | 'lost' {
  if (!boss.active) return 'fighting';

  if (boss.hitstopT > 0) {
    boss.hitstopT -= rawDt;
    return 'fighting';
  }
  boss.timeScale += (1 - boss.timeScale) * Math.min(1, rawDt * 1.4);
  const dt = rawDt * boss.timeScale;
  boss.time += dt;
  boss.phaseT += dt;
  boss.hitFlash = Math.max(0, boss.hitFlash - dt * 3);
  boss.pHitFlash = Math.max(0, boss.pHitFlash - dt * 3);
  boss.bBlockedRecently = Math.max(0, boss.bBlockedRecently - dt);
  boss.pBuffer = Math.max(0, boss.pBuffer - dt);
  sim.shake = Math.max(0, sim.shake - dt * 2.2);
  for (const f of boss.fx) f.t += dt;

  // player walk tween (puppet)
  if (sim.laneT < 1) {
    sim.laneT = Math.min(1, sim.laneT + dt / 0.18);
    const ease = 1 - (1 - sim.laneT) * (1 - sim.laneT);
    sim.laneX = sim.laneFromX + (dashTarget - sim.laneFromX) * ease;
  }

  // projectile
  if (boss.projX > -90) {
    boss.projX += boss.projDir * 9 * dt;
    const targetX = boss.projFrom === 'player' ? boss.bossX : sim.laneX;
    if (Math.abs(boss.projX - targetX) < 0.8) {
      if (boss.projFrom === 'player') damageBoss(SPECIAL_DMG);
      else if (boss.pState === 'duck') pushFx('chip', sim.laneX, 0.8);
      else damagePlayer(8);
      boss.projX = -999;
    } else if (boss.projX < B_MIN_X - 3 || boss.projX > P_MAX_X + 3) {
      boss.projX = -999;
    }
  }

  switch (boss.phase) {
    case 'intro':
      if (boss.phaseT >= INTRO_TIME) {
        boss.phase = 'fight';
        boss.phaseT = 0;
        boss.events.push({ type: 'roundStart', round: boss.round });
      }
      break;

    case 'roundEnd':
      if (boss.phaseT >= ROUND_END_TIME) {
        boss.round += 1;
        resetRound();
        boss.phase = 'intro';
        boss.phaseT = INTRO_TIME - 1.1; // shorter "ROUND N" card
      }
      break;

    case 'finishHim':
      if (boss.phaseT >= FINISH_WINDOW) finishTap(); // auto-finish for kids
      break;

    case 'finisher':
      if (boss.phaseT >= 2.4) {
        boss.phase = 'victory';
        boss.phaseT = 0;
        boss.events.push({ type: 'victory' });
      }
      break;

    case 'victory':
      if (boss.phaseT >= 1.2) return 'won';
      break;

    case 'defeat':
      if (boss.phaseT >= 1.8) return 'lost';
      break;

    case 'fight': {
      // ---- player state machine ----
      boss.pStateT += dt;
      const p = boss.pState;
      if (p === 'attack') {
        const step = P_STRING[boss.pString];
        if (boss.pStateT >= step.startup && boss.pStateT < step.startup + step.active) {
          // active frames: connect once
          if (!pHitDone && Math.abs(sim.laneX - boss.bossX) < step.reach + 1.2 && boss.bState !== 'knockdown') {
            pHitDone = true;
            if (boss.bState === 'block') {
              boss.bossHP = Math.max(0, boss.bossHP - Math.max(1, Math.round(step.damage * CHIP_RATIO)));
              pushFx('chip', boss.bossX + 0.8, 1.6);
            } else {
              damageBoss(step.damage, step.knockdown);
              if (step.knockdown) {
                boss.bState = 'knockdown';
                boss.bStateT = 0;
              } else {
                boss.bState = 'hitstun';
                boss.bStateT = 0;
              }
            }
          }
        } else if (boss.pStateT >= step.startup + step.active + step.recover) {
          pHitDone = false;
          if (boss.pBuffer > 0 && boss.pString < P_STRING.length - 1) {
            boss.pString += 1;
            boss.pStateT = 0;
            boss.pBuffer = 0;
            moveTo(boss.bossX + MIN_GAP); // chase his knockback between hits
          } else {
            boss.pState = 'idle';
            boss.pString = 0;
          }
        }
      } else if (p === 'uppercut') {
        const u = P_UPPERCUT;
        if (boss.pStateT >= u.startup && boss.pStateT < u.startup + u.active) {
          if (!pHitDone && Math.abs(sim.laneX - boss.bossX) < u.reach + 1.2 && boss.bState !== 'knockdown') {
            pHitDone = true;
            if (boss.bState === 'block') {
              pushFx('chip', boss.bossX + 0.8, 1.8);
            } else {
              damageBoss(u.damage, true);
              boss.bState = 'knockdown';
              boss.bStateT = 0;
              boss.bossY = 0.01;
            }
          }
        } else if (boss.pStateT >= u.startup + u.active + u.recover) {
          pHitDone = false;
          boss.pState = 'idle';
        }
      } else if (p === 'special' && boss.pStateT >= 0.35) {
        boss.pState = 'idle';
      } else if (p === 'duck' && boss.pStateT >= 0.55) {
        boss.pState = boss.pBlockHeld ? 'block' : 'idle';
      } else if (p === 'hitstun' && boss.pStateT >= HITSTUN) {
        boss.pState = boss.pBlockHeld ? 'block' : 'idle';
      } else if (p === 'knockdown' && boss.pStateT >= KNOCKDOWN_TIME) {
        boss.pState = 'idle';
      } else if (p === 'walk' && boss.pStateT >= 0.2) {
        boss.pState = boss.pBlockHeld ? 'block' : 'idle';
      }

      // ---- boss state machine ----
      boss.bStateT += dt;
      boss.bTelegraph = Math.max(0, boss.bTelegraph - dt);
      const b = boss.bState;
      if (b === 'idle') {
        boss.bCooldown -= dt;
        if (boss.bCooldown <= 0) {
          aiDecide(boss.round);
          boss.bCooldown = 0.55 - boss.round * 0.08 + Math.random() * 0.4;
        }
      } else if (b === 'walk') {
        const dir = Math.sign(sim.laneX - MIN_GAP - boss.bossX);
        boss.bossX = clamp(boss.bossX + dir * (1.6 + boss.round * 0.3) * dt, B_MIN_X, Math.min(B_MAX_X, sim.laneX - MIN_GAP));
        if (boss.bStateT > 0.5) {
          boss.bState = 'idle';
          boss.bCooldown = 0.1;
        }
      } else if (b === 'attack') {
        const steps = bossString(boss.round);
        const step = steps[boss.bString];
        if (!bHitDone && boss.bStateT >= step.startup && boss.bStateT < step.startup + step.active) {
          bHitDone = true;
          const inReach = Math.abs(sim.laneX - boss.bossX) < step.reach + 1.0;
          if (inReach && boss.pState !== 'knockdown') {
            // ducking avoids highs; lows must be blocked
            if (boss.pState === 'duck' && !step.low) pushFx('chip', sim.laneX, 0.7);
            else damagePlayer(step.damage, step.knockdown);
          }
        } else if (boss.bStateT >= step.startup + step.active + step.recover) {
          bHitDone = false;
          if (boss.bString < steps.length - 1 && Math.random() < 0.75 && boss.pState !== 'knockdown') {
            boss.bString += 1;
            boss.bStateT = 0;
            boss.bTelegraph = steps[boss.bString].startup;
          } else {
            boss.bState = 'idle';
            boss.bString = 0;
            boss.bCooldown = 0.5 + Math.random() * 0.5;
          }
        }
      } else if (b === 'special') {
        if (boss.bStateT >= 0.55 && boss.projX < -90) {
          boss.projX = boss.bossX + 0.8;
          boss.projDir = 1;
          boss.projFrom = 'boss';
        }
        if (boss.bStateT >= 0.95) {
          boss.bState = 'idle';
          boss.bCooldown = 0.7;
        }
      } else if (b === 'throw') {
        if (boss.bStateT >= 0.5 && boss.bStateT < 0.6) {
          if (Math.abs(sim.laneX - boss.bossX) < 2.6 && boss.pState !== 'knockdown') {
            // throws beat block (MK rule)
            const wasBlocking = boss.pState === 'block';
            boss.pState = 'idle';
            damagePlayer(THROW_DMG, true);
            if (wasBlocking) boss.events.push({ type: 'throw' });
          }
          boss.bState = 'idle';
          boss.bCooldown = 0.8;
        }
      } else if (b === 'block' && boss.bStateT >= 0.7) {
        boss.bState = 'idle';
        boss.bCooldown = 0.2;
      } else if (b === 'hitstun' && boss.bStateT >= HITSTUN) {
        boss.bState = 'idle';
        boss.bCooldown = 0.35;
      } else if (b === 'knockdown' && boss.bStateT >= KNOCKDOWN_TIME) {
        boss.bState = 'idle';
        boss.bCooldown = 0.3;
        boss.combo = 0;
      }
      break;
    }
  }

  return 'fighting';
}

/* ------------------------------ HUD ------------------------------ */

export function bossPrompt(): string {
  switch (boss.phase) {
    case 'intro':
      return boss.round === 1 ? 'ROUND 1 — FIGHT!' : `ROUND ${boss.round} — FIGHT!`;
    case 'roundEnd':
      return 'K.O.!';
    case 'finishHim':
      return 'FINISH THE ORDER! TAP!';
    case 'finisher':
      return 'ORDER UP!';
    case 'victory':
      return 'FLAWLESS LUNCH!';
    case 'defeat':
      return 'THE MANAGER WINS…';
    case 'fight':
      if (fatalReady()) return 'FATAL BLOW READY!';
      if (boss.bTelegraph > 0 && boss.bState === 'attack') return 'BLOCK!';
      if (boss.bState === 'throw') return 'THROW — MOVE!';
      return '';
  }
  return '';
}
