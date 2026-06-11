import { Heart, Zap } from 'lucide-react';
import { useRunnerStore } from '../../game/runnerStore';

export function BossHUD() {
  const bossHp = useRunnerStore((state) => state.bossHp);
  const bossHearts = useRunnerStore((state) => state.bossHearts);
  const bossMeter = useRunnerStore((state) => state.bossMeter);
  const prompt = useRunnerStore((state) => state.bossPromptText);

  return (
    <section className="hud-layer boss-hud" aria-label="Boss fight HUD">
      {/* player hearts */}
      <div className="boss-hearts">
        {[0, 1, 2].map((i) => (
          <Heart key={i} size={30} fill={i < bossHearts ? 'currentColor' : 'none'} opacity={i < bossHearts ? 1 : 0.3} />
        ))}
      </div>

      {/* boss name + pips */}
      <div className="boss-bar">
        <strong>THE MEGA MANAGER</strong>
        <div className="boss-pips">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`boss-pip ${i < bossHp ? 'full' : 'empty'}`}>
              🍔
            </span>
          ))}
        </div>
      </div>

      {/* smash meter */}
      <div className={`smash-meter ${bossMeter >= 1 ? 'ready' : ''}`}>
        <Zap size={18} fill={bossMeter >= 1 ? 'currentColor' : 'none'} />
        <div className="smash-track">
          <i style={{ width: `${Math.round(bossMeter * 100)}%` }} />
        </div>
        <span>SMASH</span>
      </div>

      {/* action prompt */}
      {prompt && <div className={`boss-prompt ${prompt.includes('!') ? 'urgent' : ''}`}>{prompt}</div>}
    </section>
  );
}
