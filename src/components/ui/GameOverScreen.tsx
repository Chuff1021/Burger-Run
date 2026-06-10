import { motion } from 'framer-motion';
import { Home, RotateCcw, Trophy } from 'lucide-react';
import { formatMeters, formatNumber } from '../../game/math';
import { useRunnerStore } from '../../game/runnerStore';

export function GameOverScreen() {
  const restart = useRunnerStore((state) => state.restart);
  const goToMenu = useRunnerStore((state) => state.goToMenu);
  const score = useRunnerStore((state) => state.score);
  const distance = useRunnerStore((state) => state.distance);
  const runCoins = useRunnerStore((state) => state.runCoins);
  const save = useRunnerStore((state) => state.save);
  const newBest = Math.floor(score) >= save.bestScore && save.bestScore > 0;

  return (
    <motion.section className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className="modal-panel"
        initial={{ scale: 0.9, y: 32 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      >
        <span className="eyebrow danger">Run Complete</span>
        <h2>{newBest ? 'New Best!' : 'Wrecked in the Kitchen'}</h2>
        {newBest && (
          <div className="best-banner">
            <Trophy size={20} />
            Personal record — {formatNumber(score)} points
          </div>
        )}
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
          <span>
            <b>+{formatNumber(runCoins)} coins</b> banked to your wallet ({formatNumber(save.wallet)} total)
          </span>
        </div>
        <button className="primary-button" type="button" onClick={restart}>
          <RotateCcw size={21} />
          Run It Back
        </button>
        <button className="glass-button full" type="button" onClick={goToMenu}>
          <Home size={18} />
          Menu
        </button>
      </motion.div>
    </motion.section>
  );
}
