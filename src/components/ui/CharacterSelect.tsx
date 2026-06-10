import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { CHARACTER_ROSTER } from '../../game/constants';
import { useRunnerStore } from '../../game/runnerStore';

export function CharacterSelect() {
  const selectedCharacter = useRunnerStore((state) => state.save.selectedCharacter);
  const selectCharacter = useRunnerStore((state) => state.selectCharacter);
  const close = useRunnerStore((state) => state.setActivePanel);

  return (
    <motion.section className="modal-layer panel-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="modal-panel wide" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="close-button" type="button" onClick={() => close('none')} aria-label="Close character select">
          <X size={20} />
        </button>
        <span className="eyebrow">Roster</span>
        <h2>Choose Runner</h2>
        <div className="character-grid">
          {CHARACTER_ROSTER.map((character) => (
            <button
              key={character.id}
              type="button"
              className={`character-card ${selectedCharacter === character.id ? 'selected' : ''}`}
              onClick={() => selectCharacter(character.id)}
              style={{ '--accent': character.accent } as React.CSSProperties}
            >
              <span className="mini-burger" />
              <strong>{character.name}</strong>
              <small>{character.tagline}</small>
              <em>{character.statLabel}</em>
              {selectedCharacter === character.id && <Check size={18} />}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
