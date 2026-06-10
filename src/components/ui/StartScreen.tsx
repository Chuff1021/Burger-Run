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
      <motion.div className="brand-lockup" initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="burger-crown" />
        <h1>BURGER RUN</h1>
        <p>Eat fast. Run faster.</p>
      </motion.div>

      <div className="start-actions">
        <button className="primary-button" type="button" onClick={startRun}>
          <Play size={24} />
          Run
        </button>
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
          <span>Best</span>
          <strong>{formatNumber(save.bestScore)}</strong>
        </article>
        <article>
          <span>Distance</span>
          <strong>{formatMeters(save.bestDistance)}</strong>
        </article>
      </div>
    </motion.section>
  );
}
