import { motion } from 'framer-motion';
import { Home, Play, RotateCcw, Settings } from 'lucide-react';
import { useRunnerStore } from '../../game/runnerStore';

export function PauseMenu() {
  const resume = useRunnerStore((state) => state.resume);
  const restart = useRunnerStore((state) => state.restart);
  const goToMenu = useRunnerStore((state) => state.goToMenu);
  const setActivePanel = useRunnerStore((state) => state.setActivePanel);

  return (
    <motion.section className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="modal-panel slim" initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }}>
        <span className="eyebrow">Factory Paused</span>
        <h2>Run on hold</h2>
        <button className="primary-button" type="button" onClick={resume}>
          <Play size={21} />
          Resume
        </button>
        <button className="glass-button full" type="button" onClick={restart}>
          <RotateCcw size={18} />
          Restart
        </button>
        <button className="glass-button full" type="button" onClick={() => setActivePanel('settings')}>
          <Settings size={18} />
          Settings
        </button>
        <button className="glass-button full" type="button" onClick={goToMenu}>
          <Home size={18} />
          Menu
        </button>
      </motion.div>
    </motion.section>
  );
}
