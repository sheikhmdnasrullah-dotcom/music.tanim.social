// Honest guitar sound: Karplus-Strong plucked-string synthesis.
// No samples, no fake "analysis" — a real physical string model.
// The guitar is modeled as standard tuning with a capo on the 2nd fret,
// which is exactly how "Before I Learned the Words" is played.

import type { Chord } from '@/data/chords';

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

/** Open-string frequencies WITH capo on the 2nd fret, low E first. */
export const CAPO2_OPEN = [146.83, 196.0, 246.94, 293.66, 369.99, 440.0]; // D3 G3 B3 D4 F#4 A4

export function stringFrequency(string: number, fret: number): number {
  // string 1 = high E ... 6 = low E
  const open = CAPO2_OPEN[6 - string];
  return open * Math.pow(2, fret / 12);
}

const bufferCache = new Map<string, AudioBuffer>();

/**
 * Karplus-Strong: prime a delay line with noise, then repeatedly average
 * neighboring samples. The result is a natural, decaying plucked string.
 */
function karplusBuffer(ac: BaseAudioContext, freq: number, seconds = 3): AudioBuffer {
  const key = `${Math.round(freq * 10)}`;
  const cached = bufferCache.get(key);
  if (cached) return cached;

  const sr = ac.sampleRate;
  const N = Math.max(2, Math.round(sr / freq));
  const len = Math.floor(sr * seconds);
  const data = new Float32Array(len);

  for (let i = 0; i < N; i++) data[i] = Math.random() * 2 - 1;
  const damp = 0.996; // lower = longer ring
  for (let i = N; i < len; i++) {
    const prev = i - N - 1 >= 0 ? data[i - N - 1] : 0;
    data[i] = damp * 0.5 * (data[i - N] + prev);
  }

  const buf = ac.createBuffer(1, len, sr);
  buf.copyToChannel(data, 0);
  bufferCache.set(key, buf);
  return buf;
}

export interface PluckOptions {
  /** When to sound (ctx.currentTime based). Default: now. */
  at?: number;
  /** 0..1, default 1. */
  velocity?: number;
}

export function pluck(freq: number, opts: PluckOptions = {}): void {
  const ac = getAudioContext();
  const at = opts.at ?? ac.currentTime + 0.02;
  const vel = opts.velocity ?? 1;

  const src = ac.createBufferSource();
  src.buffer = karplusBuffer(ac, freq);
  const gain = ac.createGain();
  gain.gain.value = 0.22 * vel;
  // Gentle lowpass keeps six ringing strings from harshly clipping together.
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(9000, freq * 8);
  src.connect(lp).connect(gain).connect(ac.destination);
  src.start(at);
  src.stop(at + 3);
}

/**
 * Strum a chord shape. Strings sound low→high with a realistic fan.
 * Returns the approximate time (seconds) the chord keeps ringing.
 */
export function strumChord(
  chord: Chord,
  opts: PluckOptions & { direction?: 'down' | 'up' } = {},
): number {
  const ac = getAudioContext();
  const at = (opts.at ?? ac.currentTime + 0.02) as number;
  const vel = opts.velocity ?? 1;
  const dir = opts.direction ?? 'down';

  let strings = chord.strum.slice().sort((a, b) => a - b); // low (6) → high (1)
  if (dir === 'up') strings = strings.reverse();

  const step = 0.014; // fan width, seconds
  strings.forEach((s, i) => {
    const fret = chord.frets[6 - s];
    if (fret < 0) return;
    pluck(stringFrequency(s, fret), {
      at: at + i * step,
      velocity: vel * (0.85 + Math.random() * 0.15),
    });
  });

  return 1.6 + strings.length * step;
}

/**
 * Play two chords back to back — the "target" sound for a transition.
 * Seconds between them is the practice target.
 */
export function playChordPair(
  a: Chord,
  b: Chord,
  secondsBetween: number,
  opts: PluckOptions = {},
): number {
  const ac = getAudioContext();
  const at = opts.at ?? ac.currentTime + 0.05;
  strumChord(a, { at, velocity: opts.velocity });
  strumChord(b, { at: at + secondsBetween, velocity: opts.velocity });
  return secondsBetween + 1.8;
}

/** A pure reference tone (tuner). */
export function referenceTone(freq: number, seconds = 1.2, velocity = 0.3): void {
  const ac = getAudioContext();
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const gain = ac.createGain();
  const t = ac.currentTime + 0.02;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(velocity, t + 0.04);
  gain.gain.setValueAtTime(velocity, t + seconds - 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + seconds);
}
