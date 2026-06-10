export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface InputPoint {
  x: number;
  y: number;
}

export function resolveSwipeGesture(start: InputPoint, end: InputPoint, threshold = 32): SwipeDirection | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (Math.max(absX, absY) < threshold) return null;
  if (absX > absY) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
