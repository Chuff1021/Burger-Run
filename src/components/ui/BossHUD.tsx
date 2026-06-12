import { Shield, Swords, Zap } from 'lucide-react';
import { PIP_THRESHOLDS } from '../../game/bossSim';
import { useRunnerStore } from '../../game/runnerStore';

export function BossHUD() {
  const bossHp = useRunnerStore((state) => state.bossHp);
  const bossHearts = useRunnerStore((state) => state.bossHearts);
  const bossMeter = useRunnerStore((state) => state.bossMeter);
  const bossPercent = useRunnerStore((state) => state.bossPercent);
  const bossCombo = useRunnerStore((state) => state.bossCombo);
  const prompt = useRunnerStore((state) => state.bossPromptText);
  const segmentIndex = Math.max(0, 3 - bossHp);
  const previousThreshold = segmentIndex === 0 ? 0 : PIP_THRESHOLDS[segmentIndex - 1];
  const currentThreshold = PIP_THRESHOLDS[segmentIndex] ?? PIP_THRESHOLDS[PIP_THRESHOLDS.length - 1];
  const segmentProgress = Math.max(0, Math.min(1, (bossPercent - previousThreshold) / (currentThreshold - previousThreshold)));
  const bossHealth = Math.max(0, ((Math.max(0, bossHp - 1) + (1 - segmentProgress)) / 3) * 100);
  const playerHealth = Math.max(0, Math.min(100, (bossHearts / 3) * 100));
  const promptTone =
    prompt.includes('COUNTER') || prompt.includes('PUNISH') || prompt.includes('COMBO') || prompt.includes('FINAL') ? 'attack' : 'defend';

  return (
    <section className="hud-layer boss-hud" aria-label="Boss fight HUD">
      <div className="versus-hud">
        <div className="fighter-panel player-side">
          <div className="fighter-meta">
            <span>MEGA BURGER</span>
            <b>{bossHearts} VITAL</b>
          </div>
          <div className="health-shell player-health" aria-label="Player health">
            <i style={{ width: `${playerHealth}%` }} />
          </div>
        </div>

        <div className="round-medallion">
          <span>ROUND</span>
          <b>{4 - bossHp}</b>
        </div>

        <div className="fighter-panel boss-side">
          <div className="fighter-meta">
            <span>THE MEGA MANAGER</span>
            <b>{Math.round(bossHealth)}%</b>
          </div>
          <div className="health-shell boss-health" aria-label="Boss health">
            <i style={{ width: `${bossHealth}%` }} />
          </div>
        </div>
      </div>

      {bossCombo > 1 && (
        <div key={bossCombo} className="combo-counter">
          {bossCombo} HIT CHAIN
        </div>
      )}

      <div className={`finisher-meter ${bossMeter >= 1 ? 'ready' : ''}`}>
        <Zap size={18} fill={bossMeter >= 1 ? 'currentColor' : 'none'} />
        <div className="finisher-track">
          <i style={{ width: `${Math.round(bossMeter * 100)}%` }} />
        </div>
        <span>{bossMeter >= 1 ? 'FINAL FRY' : 'PRESSURE'}</span>
      </div>

      {prompt && <div className={`boss-prompt ${promptTone}`}>{prompt}</div>}

      <div className="fight-command-dock" aria-label="Boss fight commands">
        <span>
          <Swords size={15} /> STRIKE
        </span>
        <span>DASH</span>
        <span>EVADE</span>
        <span>
          <Shield size={15} /> GUARD
        </span>
      </div>
    </section>
  );
}
