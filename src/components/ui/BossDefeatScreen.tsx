import { motion } from 'framer-motion';
import { Home, Swords, Trophy } from 'lucide-react';
import { useRunnerStore } from '../../game/runnerStore';

export function BossDefeatScreen() {
  const retryBoss = useRunnerStore((state) => state.retryBoss);
  const goToMenu = useRunnerStore((state) => state.goToMenu);
  const outcome = useRunnerStore((state) => state.bossOutcome);
  const won = outcome === 'won';

  return (
    <motion.section className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className="modal-panel slim"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      >
        <span className={won ? 'eyebrow' : 'eyebrow danger'}>{won ? 'Arena Victory' : 'Knocked Out'}</span>
        <h2>{won ? 'You Fired The Manager!' : 'The Manager Wins… This Time'}</h2>
        {won ? (
          <div className="best-banner">
            <Trophy size={20} />
            Practice win — campaign rewards come from beating him at the end of a run!
          </div>
        ) : (
          <div className="reward-banner">
            <span>
              Dodge his attacks to fill your <b>SMASH</b> meter — when he&apos;s dizzy, <b>tap tap tap</b>!
            </span>
          </div>
        )}
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
