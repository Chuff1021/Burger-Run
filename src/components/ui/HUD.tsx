import { Magnet, Pause, Shield, Star, Zap } from 'lucide-react';
import { POWERUP_DURATION } from '../../game/constants';
import { formatMeters, formatNumber } from '../../game/math';
import { useRunnerStore } from '../../game/runnerStore';
import type { PowerupType } from '../../game/types';

const POWERUP_META: { type: PowerupType; label: string; icon: 'magnet' | 'shield' | 'boost' | 'coins' }[] = [
  { type: 'magnet', label: 'Magnet', icon: 'magnet' },
  { type: 'shield', label: 'Shield', icon: 'shield' },
  { type: 'speedBoost', label: 'Speed Boost', icon: 'boost' },
  { type: 'doubleCoins', label: 'Double Coins', icon: 'coins' }
];

function PowerupGlyph({ icon }: { icon: 'magnet' | 'shield' | 'boost' | 'coins' }) {
  if (icon === 'magnet') return <Magnet size={22} />;
  if (icon === 'shield') return <Shield size={22} />;
  if (icon === 'boost') return <Zap size={22} />;
  return <span className="coin-glyph">x2</span>;
}

export function HUD() {
  const status = useRunnerStore((state) => state.status);
  const score = useRunnerStore((state) => state.score);
  const distance = useRunnerStore((state) => state.distance);
  const runCoins = useRunnerStore((state) => state.runCoins);
  const multiplier = useRunnerStore((state) => state.multiplier);
  const nextGoal = useRunnerStore((state) => state.nextGoal);
  const goalsHit = useRunnerStore((state) => state.goalsHit);
  const powerups = useRunnerStore((state) => state.powerups);
  const toasts = useRunnerStore((state) => state.toasts);
  const pause = useRunnerStore((state) => state.pause);

  if (status === 'menu') return null;

  return (
    <section className="hud-layer" aria-label="Game HUD">
      {/* ---- top-left: score stack ---- */}
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

      {/* ---- top-right: multiplier + pause ---- */}
      <div className="hud-right">
        <article className="multiplier-card">
          <span>x{multiplier}</span>
          <small>Multiplier</small>
        </article>
        <button className="icon-button" type="button" onClick={pause} aria-label="Pause game" disabled={status !== 'running'}>
          <Pause size={26} fill="currentColor" />
        </button>
      </div>

      {/* ---- right: next goal panel ---- */}
      <article className="mission-card">
        <span>Next Goal</span>
        <strong>{formatMeters(nextGoal)}</strong>
        <div className="goal-stars">
          {[0, 1, 2].map((i) => (
            <Star key={i} size={17} fill={i < Math.min(3, goalsHit) ? 'currentColor' : 'none'} />
          ))}
        </div>
      </article>

      {/* ---- center toasts ---- */}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            {toast.text}
          </div>
        ))}
      </div>

      {/* ---- bottom: power-up dock ---- */}
      <div className="powerup-dock">
        <span className="dock-title">Power Ups</span>
        <div className="dock-slots">
          {POWERUP_META.map(({ type, label, icon }) => {
            const remaining = powerups[type];
            const active = remaining > 0;
            const pct = active ? Math.min(100, (remaining / POWERUP_DURATION[type]) * 100) : 0;
            return (
              <article key={type} className={`powerup-slot slot-${icon} ${active ? 'active' : ''}`}>
                <div className="slot-icon">
                  <PowerupGlyph icon={icon} />
                </div>
                <strong>{label}</strong>
                {active && <i className="slot-meter" style={{ width: `${pct}%` }} />}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
