import { useEffect, useRef } from 'react';
import { resolveSwipeGesture, type SwipeDirection } from '../game/input';
import { useRunnerStore } from '../game/runnerStore';

/** pixels of travel before a swipe fires — crossing this MID-GESTURE triggers instantly */
const SWIPE_FIRE_PX = 26;
/** smaller fallback threshold for quick flicks resolved on release */
const SWIPE_RELEASE_PX = 18;

interface GestureState {
  x: number;
  y: number;
  id: number;
  fired: boolean;
}

export function useRunnerInput() {
  const gesture = useRef<GestureState | null>(null);

  useEffect(() => {
    const apply = (direction: SwipeDirection | null) => {
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
      if (key === 'f' || key === 'enter') store.attack();
      if (key === 'p' || key === 'escape') {
        if (store.status === 'running') store.pause();
        else if (store.status === 'paused') store.resume();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId, fired: false };
    };

    // fire the action the moment the swipe is unambiguous — no waiting for lift
    const onPointerMove = (event: PointerEvent) => {
      const start = gesture.current;
      if (!start || start.fired || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_FIRE_PX) return;
      start.fired = true;
      apply(resolveSwipeGesture(start, { x: event.clientX, y: event.clientY }, SWIPE_FIRE_PX));
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      gesture.current = null;
      if (start.fired) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      // a release without meaningful travel = TAP (attack in boss fights)
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) {
        useRunnerStore.getState().attack();
        return;
      }
      // quick flick fallback: resolved on release with a lower bar
      apply(resolveSwipeGesture(start, { x: event.clientX, y: event.clientY }, SWIPE_RELEASE_PX));
    };

    const onPointerCancel = () => {
      gesture.current = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, []);
}
