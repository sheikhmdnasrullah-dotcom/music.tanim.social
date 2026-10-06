export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Continuous MIDI value for a frequency. Unlike `frequencyToNote` this keeps the
 * fractional part, so callers can compute cent-level error against a target.
 */
export function frequencyToMidi(freq: number): number | null {
  if (!Number.isFinite(freq) || freq <= 0) return null;
  return 12 * Math.log2(freq / 440) + 69;
}

/** Note name including octave, e.g. `A2`, `C#4`. Rounds to the nearest semitone. */
export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

/** Signed cent deviation of `freq` from `targetFreq`. Positive = sharp. */
export function centsBetween(freq: number, targetFreq: number): number | null {
  if (!Number.isFinite(freq) || !Number.isFinite(targetFreq) || freq <= 0 || targetFreq <= 0) {
    return null;
  }
  return 1200 * Math.log2(freq / targetFreq);
}

export function frequencyToNote(freq: number): { name: string; midi: number; cents: number } | null {
  if (freq <= 0) return null;
  const midi = 12 * Math.log2(freq / 440) + 69;
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  return { name, midi: rounded, cents };
}

export function noteToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
