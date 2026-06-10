import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { BurgerRunnerScene } from '../components/scene/BurgerRunnerScene';
import { CharacterSelect } from '../components/ui/CharacterSelect';
import { GameOverScreen } from '../components/ui/GameOverScreen';
import { HUD } from '../components/ui/HUD';
import { PauseMenu } from '../components/ui/PauseMenu';
import { SettingsPanel } from '../components/ui/SettingsPanel';
import { ShopPanel } from '../components/ui/ShopPanel';
import { StartScreen } from '../components/ui/StartScreen';
import { useRunnerStore } from '../game/runnerStore';
import { useRunnerInput } from './useRunnerInput';

export default function GameShell() {
  useRunnerInput();
  const status = useRunnerStore((state) => state.status);
  const activePanel = useRunnerStore((state) => state.activePanel);

  return (
    <main className="game-root" data-game-status={status}>
      <Canvas
        shadows={false}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: [0, 3.6, -6.6], fov: 62, near: 0.1, far: 150 }}
      >
        <Suspense fallback={null}>
          <BurgerRunnerScene />
        </Suspense>
      </Canvas>

      <HUD />
      {status === 'menu' && <StartScreen />}
      {status === 'paused' && <PauseMenu />}
      {status === 'gameOver' && <GameOverScreen />}
      {activePanel === 'characters' && <CharacterSelect />}
      {activePanel === 'shop' && <ShopPanel />}
      {activePanel === 'settings' && <SettingsPanel />}
    </main>
  );
}
