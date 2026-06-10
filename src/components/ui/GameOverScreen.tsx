import { motion } from 'framer-motion';
import { Home, RotateCcw, Star } from 'lucide-react';
import { formatMeters, formatNumber } from '../../game/math';
import { useRunnerStore } from '../../game/runnerStore';

export function GameOverScreen() {
  const restart = useRunnerStore((state) => state.restart);
  const goToMenu = useRunnerStore((state) => state.goToMenu);
  const score = useRunnerStore((state) => state.score);
  const distance = useRunnerStore((state) => state.distance);
  const runCoins = useRunnerStore((state) => state.runCoins);

  return (
    <motion.section className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="modal-panel" initial={{ scale: 0.92, y: 28 }} animate={{ scale: 1, y: 0 }}>
        <span className="eyebrow danger">Run Complete</span>
        <h2>Factory Crash</h2>
        <div className="reward-grid">
          <article>
            <span>Score</span>
            <strong>{formatNumber(score)}</strong>
          </article>
          <article>
            <span>Distance</span>
            <strong>{formatMeters(distance)}</strong>
          </article>
          <article>
            <span>Coins</span>
            <strong>{formatNumber(runCoins)}</strong>
          </article>
        </div>
        <div className="reward-banner">
          <Star size={22} />
          <div>
            <strong>Rewards banked</strong>
            <span>Coins were added to your upgrade wallet.</span>
          </div>
        </div>
        <button className="primary-button" type="button" onClick={restart}>
          <RotateCcw size={21} />
          Restart
        </button>
        <button className="glass-button full" type="button" onClick={goToMenu}>
          <Home size={18} />
          Menu
        </button>
      </motion.div>
    </motion.section>
  );
}
