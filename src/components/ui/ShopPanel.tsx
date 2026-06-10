import { motion } from 'framer-motion';
import { Coins, Magnet, Shield, Sparkles, X, Zap } from 'lucide-react';
import { useRunnerStore } from '../../game/runnerStore';

const upgrades = [
  { label: 'Magnet Range', icon: Magnet, level: 1 },
  { label: 'Shield Charge', icon: Shield, level: 1 },
  { label: 'Boost Heat', icon: Zap, level: 1 },
  { label: 'Coin Value', icon: Coins, level: 1 }
];

export function ShopPanel() {
  const close = useRunnerStore((state) => state.setActivePanel);
  const wallet = useRunnerStore((state) => state.save.wallet);

  return (
    <motion.section className="modal-layer panel-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="modal-panel wide" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="close-button" type="button" onClick={() => close('none')} aria-label="Close upgrades">
          <X size={20} />
        </button>
        <span className="eyebrow">Upgrade Lab</span>
        <h2>Factory Tuning</h2>
        <div className="wallet-pill">
          <Coins size={18} />
          {wallet.toLocaleString('en-US')} coins
        </div>
        <div className="upgrade-grid">
          {upgrades.map(({ label, icon: Icon, level }) => (
            <article key={label} className="upgrade-card">
              <Icon size={24} />
              <strong>{label}</strong>
              <span>Level {level}</span>
              <button type="button">
                <Sparkles size={16} />
                Soon
              </button>
            </article>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
