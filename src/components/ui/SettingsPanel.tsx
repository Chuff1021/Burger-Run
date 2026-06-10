import { motion } from 'framer-motion';
import { Volume2, Smartphone, Sparkles, X } from 'lucide-react';
import { useRunnerStore } from '../../game/runnerStore';
import type { VisualQuality } from '../../game/types';

export function SettingsPanel() {
  const close = useRunnerStore((state) => state.setActivePanel);
  const settings = useRunnerStore((state) => state.save.settings);
  const updateSettings = useRunnerStore((state) => state.updateSettings);

  return (
    <motion.section className="modal-layer panel-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="modal-panel slim" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="close-button" type="button" onClick={() => close('none')} aria-label="Close settings">
          <X size={20} />
        </button>
        <span className="eyebrow">Settings</span>
        <h2>Run Feel</h2>
        <label className="toggle-row">
          <Volume2 size={20} />
          <span>Audio</span>
          <input type="checkbox" checked={settings.audio} onChange={(event) => updateSettings({ audio: event.target.checked })} />
        </label>
        <label className="toggle-row">
          <Smartphone size={20} />
          <span>Haptics</span>
          <input type="checkbox" checked={settings.haptics} onChange={(event) => updateSettings({ haptics: event.target.checked })} />
        </label>
        <label className="toggle-row">
          <Sparkles size={20} />
          <span>Reduced effects</span>
          <input
            type="checkbox"
            checked={settings.reducedEffects}
            onChange={(event) => updateSettings({ reducedEffects: event.target.checked })}
          />
        </label>
        <div className="segmented-control" role="group" aria-label="Visual quality">
          {(['low', 'medium', 'high'] as VisualQuality[]).map((quality) => (
            <button
              key={quality}
              type="button"
              className={settings.quality === quality ? 'selected' : ''}
              onClick={() => updateSettings({ quality })}
            >
              {quality}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
