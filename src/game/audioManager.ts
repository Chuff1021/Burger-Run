type SoundCue = 'coin' | 'powerup' | 'crash' | 'jump' | 'slide' | 'start';

const cueFrequency: Record<SoundCue, number> = {
  coin: 880,
  powerup: 520,
  crash: 90,
  jump: 440,
  slide: 220,
  start: 660
};

let audioContext: AudioContext | null = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

export function playCue(cue: SoundCue, enabled: boolean) {
  if (!enabled) return;
  const context = getContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = cueFrequency[cue];
  oscillator.type = cue === 'crash' ? 'sawtooth' : 'triangle';
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(cue === 'crash' ? 0.12 : 0.05, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
}
