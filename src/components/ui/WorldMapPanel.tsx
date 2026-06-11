import { motion } from 'framer-motion';
import { Lock, Play, Star, X } from 'lucide-react';
import { WORLDS } from '../../game/constants';
import { useRunnerStore } from '../../game/runnerStore';

export function WorldMapPanel() {
  const close = useRunnerStore((state) => state.setActivePanel);
  const startRun = useRunnerStore((state) => state.startRun);
  const campaign = useRunnerStore((state) => state.save.campaign);

  return (
    <motion.section className="modal-layer panel-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="modal-panel wide" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="close-button" type="button" onClick={() => close('none')} aria-label="Close world map">
          <X size={20} />
        </button>
        <span className="eyebrow">World Tour</span>
        <h2>Pick Your World</h2>
        <div className="world-grid">
          {WORLDS.map((world, i) => {
            const unlocked = world.available && world.id <= campaign.unlockedWorld;
            const stars = campaign.stars[i].reduce((a, b) => a + b, 0);
            const cleared = campaign.worldCleared[i];
            return (
              <article
                key={world.id}
                className={`world-card ${unlocked ? 'unlocked' : 'locked'} ${cleared ? 'cleared' : ''}`}
                style={{ '--accent': world.accent } as React.CSSProperties}
              >
                <span className="world-icon">{world.icon}</span>
                <strong>{world.name}</strong>
                <small>{world.tagline}</small>
                <div className="world-stars">
                  <Star size={15} fill="currentColor" />
                  <span>{stars}/9</span>
                  {cleared && <em>CLEARED</em>}
                </div>
                {unlocked ? (
                  <button className="world-play" type="button" onClick={() => startRun('campaign')}>
                    <Play size={16} fill="currentColor" />
                    Run It
                  </button>
                ) : (
                  <div className="world-locked">
                    <Lock size={16} />
                    {world.available ? 'Beat the previous world' : 'Coming soon'}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </motion.div>
    </motion.section>
  );
}
