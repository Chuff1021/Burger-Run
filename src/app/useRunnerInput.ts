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
  holdTimer: number;
  blocking: boolean;
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
      if (key === 'b') store.blockStart();
      if (key === 'g') store.fatalBlow();
      if (key === 'p' || key === 'escape') {
        if (store.status === 'running') store.pause();
        else if (store.status === 'paused') store.resume();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      const state: GestureState = { x: event.clientX, y: event.clientY, id: event.pointerId, fired: false, holdTimer: 0, blocking: false };
      // MK block: holding a finger still raises the guard
      state.holdTimer = window.setTimeout(() => {
        if (gesture.current === state && !state.fired) {
          state.blocking = true;
          useRunnerStore.getState().blockStart();
        }
      }, 240);
      gesture.current = state;
    };

    // fire the action the moment the swipe is unambiguous — no waiting for lift
    const onPointerMove = (event: PointerEvent) => {
      const start = gesture.current;
      if (!start || start.fired || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_FIRE_PX) return;
      start.fired = true;
      window.clearTimeout(start.holdTimer);
      if (start.blocking) {
        // moving while guarding drops the block into the swipe action
        start.blocking = false;
        useRunnerStore.getState().blockEnd();
      }
      apply(resolveSwipeGesture(start, { x: event.clientX, y: event.clientY }, SWIPE_FIRE_PX));
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      gesture.current = null;
      window.clearTimeout(start.holdTimer);
      if (start.blocking) {
        // releasing the hold drops the guard — no tap fires
        useRunnerStore.getState().blockEnd();
        return;
      }
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
      if (gesture.current) {
        window.clearTimeout(gesture.current.holdTimer);
        if (gesture.current.blocking) useRunnerStore.getState().blockEnd();
      }
      gesture.current = null;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'b') useRunnerStore.getState().blockEnd();
    };
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });

    return () => {
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, []);
}
