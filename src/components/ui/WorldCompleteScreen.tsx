import { motion } from 'framer-motion';
import { Home, RotateCcw, Star } from 'lucide-react';
import { WORLDS } from '../../game/constants';
import { formatNumber } from '../../game/math';
import { useRunnerStore } from '../../game/runnerStore';

const SECTION_NAMES = ['Section 1', 'Section 2', 'Final Stretch'];

export function WorldCompleteScreen() {
  const startRun = useRunnerStore((state) => state.startRun);
  const goToMenu = useRunnerStore((state) => state.goToMenu);
  const score = useRunnerStore((state) => state.score);
  const runCoins = useRunnerStore((state) => state.runCoins);
  const sectionStars = useRunnerStore((state) => state.sectionStars);
  const world = WORLDS[0];

  return (
    <motion.section className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className="modal-panel"
        initial={{ scale: 0.85, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <span className="eyebrow">World Complete</span>
        <h2>
          {world.icon} {world.name} CLEARED!
        </h2>
        <div className="section-stars">
          {sectionStars.map((stars, i) => (
            <article key={i}>
              <span>{SECTION_NAMES[i]}</span>
              <div className="goal-stars">
                {[0, 1, 2].map((s) => (
                  <Star key={s} size={20} fill={s < stars ? 'currentColor' : 'none'} />
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="reward-grid">
          <article>
            <span>Score</span>
            <strong>{formatNumber(score)}</strong>
          </article>
          <article>
            <span>Coins Banked</span>
            <strong>{formatNumber(runCoins)}</strong>
          </article>
          <article>
            <span>Stars</span>
            <strong>{sectionStars.reduce((a, b) => a + b, 0)}/9</strong>
          </article>
        </div>
        <div className="reward-banner boss-tease">
          <span>
            <b>THE MEGA MANAGER</b> is waiting at the end of this world… boss fights arrive in the next update!
          </span>
        </div>
        <button className="primary-button" type="button" onClick={() => startRun('campaign')}>
          <RotateCcw size={21} />
          Run It Again
        </button>
        <button className="glass-button full" type="button" onClick={goToMenu}>
          <Home size={18} />
          Menu
        </button>
      </motion.div>
    </motion.section>
  );
}
