import { useEffect, useRef } from 'react';
import { useRunnerStore } from '../game/runnerStore';

export function useRunnerInput() {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useRunnerStore.getState();
      const key = event.key.toLowerCase();

      if (key === 'arrowleft' || key === 'a') store.moveLane(-1);
      if (key === 'arrowright' || key === 'd') store.moveLane(1);
      if (key === 'arrowup' || key === 'w' || key === ' ') store.jump();
      if (key === 'arrowdown' || key === 's') store.slide();
      if (key === 'p' || key === 'escape') {
        if (store.status === 'running') store.pause();
        else if (store.status === 'paused') store.resume();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (event: TouchEvent) => {
      const start = touchStart.current;
      const touch = event.changedTouches[0];
      if (!start || !touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const threshold = 32;
      const store = useRunnerStore.getState();

      if (Math.max(absX, absY) < threshold) return;
      if (absX > absY) store.moveLane(dx > 0 ? 1 : -1);
      else if (dy < 0) store.jump();
      else store.slide();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);
}
