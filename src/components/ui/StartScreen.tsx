import { motion } from 'framer-motion';
import { Play, Settings, ShoppingBag, UserRound } from 'lucide-react';
import { formatMeters, formatNumber } from '../../game/math';
import { useRunnerStore } from '../../game/runnerStore';

export function StartScreen() {
  const startRun = useRunnerStore((state) => state.startRun);
  const setActivePanel = useRunnerStore((state) => state.setActivePanel);
  const save = useRunnerStore((state) => state.save);

  return (
    <motion.section className="screen-layer start-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="brand-lockup"
        initial={{ y: -30, opacity: 0, scale: 0.94 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 17 }}
      >
        <div className="burger-crown" />
        <h1>
          <span className="title-burger">BURGER</span>
          <span className="title-run">RUN</span>
        </h1>
        <p>Eat fast. Run faster.</p>
      </motion.div>

      <div className="start-actions">
        <motion.button
          className="primary-button"
          type="button"
          onClick={startRun}
          whileTap={{ scale: 0.96 }}
          animate={{ boxShadow: ['0 0 28px rgba(255,191,63,0.45)', '0 0 52px rgba(255,191,63,0.8)', '0 0 28px rgba(255,191,63,0.45)'] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
        >
          <Play size={26} fill="currentColor" />
          Run
        </motion.button>
        <div className="menu-buttons">
          <button className="glass-button" type="button" onClick={() => setActivePanel('characters')}>
            <UserRound size={18} />
            Characters
          </button>
          <button className="glass-button" type="button" onClick={() => setActivePanel('shop')}>
            <ShoppingBag size={18} />
            Upgrades
          </button>
          <button className="glass-button" type="button" onClick={() => setActivePanel('settings')}>
            <Settings size={18} />
            Settings
          </button>
        </div>
      </div>

      <div className="profile-strip">
        <article>
          <span>Wallet</span>
          <strong>{formatNumber(save.wallet)}</strong>
        </article>
        <article>
          <span>Best Score</span>
          <strong>{formatNumber(save.bestScore)}</strong>
        </article>
        <article>
          <span>Best Distance</span>
          <strong>{formatMeters(save.bestDistance)}</strong>
        </article>
      </div>

      <p className="controls-hint">Swipe or use arrow keys — left/right to dodge, up to jump, down to slide</p>
    </motion.section>
  );
}
