export function triggerHaptic(pattern: number | number[], enabled: boolean) {
  if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  navigator.vibrate(pattern);
}
