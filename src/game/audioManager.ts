/**
 * All audio is synthesized with WebAudio — no asset downloads, instant load.
 * Cues are short layered envelopes; music is a looping synthwave bass/arp
 * pattern scheduled ahead of time on the AudioContext clock.
 */

export type SoundCue =
  | 'coin'
  | 'powerup'
  | 'crash'
  | 'jump'
  | 'slide'
  | 'start'
  | 'goal'
  | 'shieldBreak'
  | 'nearMiss'
  | 'uiClick';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let nextBarTime = 0;
let coinPitchStep = 0;
let coinPitchResetAt = 0;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.85;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.0;
    musicGain.connect(masterGain);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; slideTo?: number; out?: AudioNode } = {}
) {
  const audio = getContext();
  if (!audio || !masterGain) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = opts.type ?? 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + duration);
  const peak = opts.gain ?? 0.06;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(opts.out ?? masterGain);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noiseBurst(start: number, duration: number, gainValue: number) {
  const audio = getContext();
  if (!audio || !masterGain) return;
  const length = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2600, start);
  filter.frequency.exponentialRampToValueAtTime(180, start + duration);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(masterGain);
  source.start(start);
}

export function playCue(cue: SoundCue, enabled: boolean) {
  if (!enabled) return;
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;

  switch (cue) {
    case 'coin': {
      // ascending pitch run while you keep collecting
      if (now > coinPitchResetAt) coinPitchStep = 0;
      coinPitchResetAt = now + 0.55;
      const freq = 780 * Math.pow(1.06, Math.min(coinPitchStep, 12));
      coinPitchStep += 1;
      tone(freq, now, 0.09, { type: 'square', gain: 0.035 });
      tone(freq * 1.5, now + 0.04, 0.1, { type: 'sine', gain: 0.04 });
      break;
    }
    case 'powerup':
      tone(420, now, 0.3, { type: 'sawtooth', gain: 0.05, slideTo: 1260 });
      tone(630, now + 0.08, 0.28, { type: 'triangle', gain: 0.05, slideTo: 1680 });
      break;
    case 'jump':
      tone(300, now, 0.18, { type: 'sine', gain: 0.06, slideTo: 620 });
      break;
    case 'slide':
      noiseBurst(now, 0.22, 0.05);
      tone(220, now, 0.16, { type: 'sine', gain: 0.035, slideTo: 120 });
      break;
    case 'crash':
      noiseBurst(now, 0.5, 0.2);
      tone(160, now, 0.4, { type: 'sawtooth', gain: 0.1, slideTo: 50 });
      tone(90, now + 0.05, 0.5, { type: 'square', gain: 0.07, slideTo: 38 });
      break;
    case 'shieldBreak':
      noiseBurst(now, 0.25, 0.1);
      tone(900, now, 0.22, { type: 'square', gain: 0.05, slideTo: 240 });
      break;
    case 'goal':
      tone(523, now, 0.14, { type: 'triangle', gain: 0.06 });
      tone(659, now + 0.11, 0.14, { type: 'triangle', gain: 0.06 });
      tone(784, now + 0.22, 0.3, { type: 'triangle', gain: 0.07 });
      break;
    case 'nearMiss':
      tone(980, now, 0.1, { type: 'sine', gain: 0.035, slideTo: 1400 });
      break;
    case 'start':
      tone(392, now, 0.12, { type: 'square', gain: 0.045 });
      tone(523, now + 0.1, 0.12, { type: 'square', gain: 0.045 });
      tone(659, now + 0.2, 0.24, { type: 'square', gain: 0.055 });
      break;
    case 'uiClick':
      tone(660, now, 0.06, { type: 'sine', gain: 0.03 });
      break;
  }
}

/* ------------------------------ music ------------------------------ */

const BPM = 132;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
// minor groove: A1 root with passing tones, arp on top
const BASS_PATTERN = [55, 55, 65.4, 55, 49, 49, 55, 73.4];
const ARP_NOTES = [220, 261.6, 329.6, 440, 329.6, 261.6];

function scheduleBar(barStart: number) {
  const audio = getContext();
  if (!audio || !musicGain) return;
  for (let i = 0; i < 8; i += 1) {
    const t = barStart + i * (BAR / 8);
    tone(BASS_PATTERN[i], t, BAR / 8 - 0.02, { type: 'sawtooth', gain: 0.045, out: musicGain });
    if (i % 2 === 0) noiseBurstMusic(t, 0.03, 0.012);
  }
  for (let i = 0; i < 6; i += 1) {
    const t = barStart + i * (BAR / 6);
    tone(ARP_NOTES[i], t, 0.11, { type: 'square', gain: 0.018, out: musicGain });
  }
}

function noiseBurstMusic(start: number, duration: number, gainValue: number) {
  const audio = getContext();
  if (!audio || !musicGain) return;
  const length = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.value = gainValue;
  source.connect(gain).connect(musicGain);
  source.start(start);
}

export function startMusic(enabled: boolean) {
  if (!enabled) return;
  const audio = getContext();
  if (!audio || !musicGain || musicTimer !== null) return;
  musicGain.gain.cancelScheduledValues(audio.currentTime);
  musicGain.gain.setTargetAtTime(0.6, audio.currentTime, 0.4);
  nextBarTime = audio.currentTime + 0.05;
  const pump = () => {
    if (!audio) return;
    while (nextBarTime < audio.currentTime + BAR * 2) {
      scheduleBar(nextBarTime);
      nextBarTime += BAR;
    }
  };
  pump();
  musicTimer = window.setInterval(pump, BAR * 500);
}

export function stopMusic() {
  const audio = getContext();
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (audio && musicGain) {
    musicGain.gain.cancelScheduledValues(audio.currentTime);
    musicGain.gain.setTargetAtTime(0, audio.currentTime, 0.25);
  }
}
