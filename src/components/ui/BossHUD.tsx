import { Flame, Zap } from 'lucide-react';
import { useRunnerStore } from '../../game/runnerStore';

export function BossHUD() {
  const bossHP = useRunnerStore((state) => state.bossHP);
  const playerHP = useRunnerStore((state) => state.playerHP);
  const meter = useRunnerStore((state) => state.bossMeter);
  const round = useRunnerStore((state) => state.bossRound);
  const playerWins = useRunnerStore((state) => state.playerWins);
  const bossWins = useRunnerStore((state) => state.bossWins);
  const combo = useRunnerStore((state) => state.bossCombo);
  const fatalArmed = useRunnerStore((state) => state.fatalArmed);
  const prompt = useRunnerStore((state) => state.bossPromptText);
  const fatalBlow = useRunnerStore((state) => state.fatalBlow);

  return (
    <section className="hud-layer mk-hud" aria-label="Fight HUD">
      {/* ---- MK health bars facing center ---- */}
      <div className="mk-bars">
        <div className="mk-side">
          <div className="mk-bar player">
            <i style={{ width: `${playerHP}%` }} />
          </div>
          <div className="mk-meta">
            <span className="mk-name">FRY BOY</span>
            <span className="mk-pips">
              {[0, 1].map((i) => (
                <b key={i} className={i < playerWins ? 'won' : ''} />
              ))}
            </span>
          </div>
        </div>
        <div className="mk-round">R{round}</div>
        <div className="mk-side right">
          <div className="mk-bar boss">
            <i style={{ width: `${bossHP}%` }} />
          </div>
          <div className="mk-meta">
            <span className="mk-pips">
              {[0, 1].map((i) => (
                <b key={i} className={i < bossWins ? 'won' : ''} />
              ))}
            </span>
            <span className="mk-name">MEGA MANAGER</span>
          </div>
        </div>
      </div>

      {/* ---- banner ---- */}
      {prompt && <div className={`boss-prompt ${prompt.includes('!') ? 'urgent' : ''}`}>{prompt}</div>}

      {/* ---- combo ---- */}
      {combo > 1 && (
        <div key={combo} className="combo-counter">
          {combo} HITS!
        </div>
      )}

      {/* ---- meter + fatal blow ---- */}
      <div className={`smash-meter ${meter >= 1 ? 'ready' : ''}`}>
        <Zap size={18} fill={meter >= 0.5 ? 'currentColor' : 'none'} />
        <div className="smash-track">
          <i style={{ width: `${Math.round(meter * 100)}%` }} />
        </div>
        <span>SAUCE</span>
      </div>
      {fatalArmed && (
        <button className="fatal-button" type="button" onClick={fatalBlow} aria-label="Fatal Blow">
          <Flame size={26} fill="currentColor" />
          FATAL BLOW
        </button>
      )}

      <p className="mk-controls-hint">TAP attack · ➡ dash strike · HOLD LEFT SIDE block · ⬆ uppercut · ⬇ sauce blast · ⬅ back</p>
    </section>
  );
}
