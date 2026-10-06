// A real Web Audio metronome: lookahead scheduler, accent, subdivision.
// Shared by the Metronome page and the Strumming trainer.

import { getAudioContext } from '@/lib/audio/guitar-synth';

export interface MetronomeCallbacks {
  /** Fired (roughly) when a beat sounds. `inBar` is 0-based. */
  onBeat?: (inBar: number, at: number) => void;
}

export class Metronome {
  private timer: number | null = null;
  private nextNoteTime = 0;
  private beatInBar = 0;
  private subdivisionIndex = 0;
  private running = false;

  bpm = 80;
  /** Subdivision: 1 = quarter notes, 2 = eighth notes. */
  subdivision: 1 | 2 = 1;
  /** Number of beats per bar. */
  beatsPerBar = 4;
  accent = true;
  soundOn = true;

  private callbacks: MetronomeCallbacks = {};

  constructor(callbacks: MetronomeCallbacks = {}) {
    this.callbacks = callbacks;
  }

  get secondsPerBeat(): number {
    return 60 / this.bpm;
  }

  start(): void {
    if (this.running) return;
    const ac = getAudioContext();
    this.running = true;
    this.beatInBar = 0;
    this.subdivisionIndex = 0;
    this.nextNoteTime = ac.currentTime + 0.12;
    this.timer = window.setInterval(() => this.scheduler(), 25);
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private scheduler(): void {
    const ac = getAudioContext();
    while (this.nextNoteTime < ac.currentTime + 0.12) {
      this.click(this.nextNoteTime, this.beatInBar, this.subdivisionIndex);
      this.advance();
    }
  }

  private advance(): void {
    const beatsPerSubdivision = this.beatsPerBar / this.subdivision;
    this.subdivisionIndex += 1;
    if (this.subdivisionIndex >= beatsPerSubdivision) this.subdivisionIndex = 0;
    if (this.subdivision === 1 || this.subdivisionIndex % 2 === 0) {
      this.beatInBar = (this.beatInBar + 1) % this.beatsPerBar;
    }
    this.nextNoteTime += this.secondsPerBeat / this.subdivision;
  }

  private click(time: number, inBar: number, subdivisionIndex: number): void {
    const isBeat = this.subdivision === 1 || subdivisionIndex % 2 === 0;
    const isAccent = this.accent && isBeat && inBar === 0;
    if (this.soundOn) this.scheduleClick(time, isAccent);
    if (isBeat) {
      const delay = Math.max(0, (time - getAudioContext().currentTime) * 1000);
      window.setTimeout(() => {
        this.callbacks.onBeat?.(inBar, time);
      }, delay);
    }
  }

  private scheduleClick(time: number, accent: boolean): void {
    const ac = getAudioContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1660 : 1050;
    const peak = accent ? 0.5 : 0.28;
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    osc.connect(gain).connect(ac.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}

/**
 * Tap-tempo math. Returns a BPM if there are at least 3 taps, else null.
 * Uses the average of the last up-to-6 intervals.
 */
export function tapTempoBpm(taps: number[]): number | null {
  if (taps.length < 3) return null;
  const recent = taps.slice(-7);
  const intervals: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const dt = (recent[i] - recent[i - 1]) / 1000;
    if (dt > 0.12 && dt < 3) intervals.push(dt); // ignore accidental double-taps
  }
  if (intervals.length < 2) return null;
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return Math.round(60 / avg);
}
