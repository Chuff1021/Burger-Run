import { useEffect, useRef } from 'react';
import { resolveSwipeGesture } from '../game/input';
import { useRunnerStore } from '../game/runnerStore';

export function useRunnerInput() {
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    const applySwipe = (direction: ReturnType<typeof resolveSwipeGesture>) => {
      if (!direction) return;
      const store = useRunnerStore.getState();
      if (direction === 'left') store.moveLane(-1);
      if (direction === 'right') store.moveLane(1);
      if (direction === 'up') store.jump();
      if (direction === 'down') store.slide();
    };

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

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pointerStart.current;
      if (!start || start.id !== event.pointerId) return;
      pointerStart.current = null;

      applySwipe(resolveSwipeGesture(start, { x: event.clientX, y: event.clientY }));
    };

    const onPointerCancel = () => {
      pointerStart.current = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, []);
}
