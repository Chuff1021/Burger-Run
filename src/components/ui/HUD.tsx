import { Gauge, Pause, Settings, ShoppingBag, Star, UserRound } from 'lucide-react';
import { formatMeters, formatNumber } from '../../game/math';
import { useRunnerStore } from '../../game/runnerStore';
import type { PowerupType } from '../../game/types';

const powerupLabel: Record<PowerupType, string> = {
  magnet: 'Magnet',
  shield: 'Shield',
  speedBoost: 'Boost',
  doubleCoins: 'x2 Coins',
  ketchupRush: 'Rush'
};

export function HUD() {
  const status = useRunnerStore((state) => state.status);
  const score = useRunnerStore((state) => state.score);
  const distance = useRunnerStore((state) => state.distance);
  const runCoins = useRunnerStore((state) => state.runCoins);
  const multiplier = useRunnerStore((state) => state.multiplier);
  const powerups = useRunnerStore((state) => state.powerups);
  const pause = useRunnerStore((state) => state.pause);
  const setActivePanel = useRunnerStore((state) => state.setActivePanel);

  return (
    <section className="hud-layer" aria-label="Game HUD">
      <div className="hud-top">
        <div className="stat-stack">
          <article className="hud-card">
            <span>Score</span>
            <strong>{formatNumber(score)}</strong>
          </article>
          <article className="hud-card compact">
            <span>Distance</span>
            <strong>{formatMeters(distance)}</strong>
          </article>
          <article className="hud-card compact coin">
            <span>Coins</span>
            <strong>{formatNumber(runCoins)}</strong>
          </article>
        </div>

        <div className="hud-right">
          <article className="multiplier-card">
            <span>x{multiplier}</span>
            <small>Multiplier</small>
          </article>
          <button className="icon-button" type="button" onClick={pause} aria-label="Pause game" disabled={status !== 'running'}>
            <Pause size={26} />
          </button>
        </div>
      </div>

      <div className="side-actions">
        <button className="icon-button" type="button" onClick={() => setActivePanel('characters')} aria-label="Character select">
          <UserRound size={21} />
        </button>
        <button className="icon-button" type="button" onClick={() => setActivePanel('shop')} aria-label="Upgrade shop">
          <ShoppingBag size={21} />
        </button>
        <button className="icon-button" type="button" onClick={() => setActivePanel('settings')} aria-label="Settings">
          <Settings size={21} />
        </button>
      </div>

      <div className="mission-card">
        <Gauge size={18} />
        <div>
          <span>Next Goal</span>
          <strong>5,000 M</strong>
        </div>
        <Star size={18} />
      </div>

      <div className="powerup-dock">
        {(Object.keys(powerups) as PowerupType[]).map((type) => (
          <article key={type} className={`powerup-slot ${powerups[type] > 0 ? 'active' : ''}`}>
            <strong>{powerupLabel[type]}</strong>
            <span>{powerups[type] > 0 ? `${powerups[type].toFixed(1)}s` : 'Ready'}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
