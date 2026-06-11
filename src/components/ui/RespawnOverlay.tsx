import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { CAMPAIGN_LIVES } from '../../game/constants';
import { useRunnerStore } from '../../game/runnerStore';

export function RespawnOverlay() {
  const lives = useRunnerStore((state) => state.lives);

  return (
    <motion.section className="screen-layer respawn-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className="respawn-card"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      >
        <strong>BACK TO THE CHECKPOINT!</strong>
        <div className="respawn-hearts">
          {Array.from({ length: CAMPAIGN_LIVES }, (_, i) => (
            <Heart key={i} size={34} fill={i < lives ? 'currentColor' : 'none'} className={i < lives ? '' : 'lost'} />
          ))}
        </div>
        <span>{lives === 1 ? 'Last life — make it count!' : 'Get ready…'}</span>
      </motion.div>
    </motion.section>
  );
}
