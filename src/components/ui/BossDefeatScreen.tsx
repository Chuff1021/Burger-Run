import { motion } from 'framer-motion';
import { Home, Swords } from 'lucide-react';
import { useRunnerStore } from '../../game/runnerStore';

export function BossDefeatScreen() {
  const retryBoss = useRunnerStore((state) => state.retryBoss);
  const goToMenu = useRunnerStore((state) => state.goToMenu);

  return (
    <motion.section className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className="modal-panel slim"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      >
        <span className="eyebrow danger">Knocked Out</span>
        <h2>The Manager Wins… This Time</h2>
        <div className="reward-banner">
          <span>
            Dodge his attacks to fill your <b>SMASH</b> meter — and when he gets dizzy, <b>swipe up</b> fast!
          </span>
        </div>
        <button className="primary-button" type="button" onClick={retryBoss}>
          <Swords size={21} />
          Fight Again
        </button>
        <button className="glass-button full" type="button" onClick={goToMenu}>
          <Home size={18} />
          Menu
        </button>
      </motion.div>
    </motion.section>
  );
}
