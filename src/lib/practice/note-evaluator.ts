import type { GuitarString } from '@/types/guitar';
import { centsBetween, frequencyToMidi, midiToNoteName } from '@/lib/music/notes';

export type NoteVerdict =
  | 'correct'
  | 'incorrect'
  | 'too-quiet'
  | 'uncertain';

export type TimingVerdict = 'on-time' | 'too-early' | 'too-late' | 'not-timed';

export interface PracticeTarget {
  noteName: string;
  midi: number;
  frequency: number;
  string?: GuitarString;
  fret?: number;
}

export interface DetectedNote {
  /** Detected fundamental in Hz. `0` when the detector found nothing. */
  frequency: number;
  /** Detector confidence in the pitch (MPM clarity), 0-1. */
  clarity: number;
  /** Signal RMS of the analysis window, 0-1. */
  rms: number;
}

export interface NoteEvaluation {
  verdict: NoteVerdict;
  /** Convenience flag — only true for `correct`. */
  isCorrect: boolean;
  /**
   * Confidence in the *recognition* (0-1). This is the detector's clarity, not a
   * claim that the verdict itself is certainly right.
   */
  confidence: number;
  /** Signed deviation of detected pitch from target pitch, in cents. `null` if unmeasurable. */
  centsError: number | null;
  target: PracticeTarget;
  detected: {
    noteName: string | null;
    frequency: number;
    clarity: number;
    rms: number;
  };
  /** Beginner-facing copy. */
  message: string;
  /** Machine-readable TARGET / DETECTED / CONFIDENCE block for the advanced view. */
  detail: string;
}

export interface EvaluateNoteOptions {
  /** How far off the target pitch may be and still count as correct. Default 50¢ (a quarter-tone). */
  toleranceCents?: number;
  /** Minimum detector clarity before we trust the reading. Default 0.8. */
  minClarity?: number;
  /** Minimum RMS before we call the input too quiet. Default 0.012. */
  minRms?: number;
}

const DEFAULTS: Required<EvaluateNoteOptions> = {
  toleranceCents: 50,
  minClarity: 0.8,
  minRms: 0.012,
};

/**
 * Compare one detected note against the note the lesson asked for.
 *
 * Correctness is decided by *pitch error against the target*, never by assuming the
 * expected note was played. String/fret identity is reported as context, but it is
 * deliberately not part of the pass/fail decision, because the same pitch is reachable
 * from several places on the neck.
 */
export function evaluateNote(
  target: PracticeTarget,
  detected: DetectedNote,
  options: EvaluateNoteOptions = {},
): NoteEvaluation {
  const { toleranceCents, minClarity, minRms } = { ...DEFAULTS, ...options };

  const detectedMidi = frequencyToMidi(detected.frequency);
  const detectedNoteName = detectedMidi === null ? null : midiToNoteName(detectedMidi);
  const centsError = centsBetween(detected.frequency, target.frequency);

  const targetBlock = targetLabel(target);
  const detectedBlock =
    detected.frequency > 0
      ? `${detectedNoteName ?? '?'} · ${detected.frequency.toFixed(1)} Hz · ${
          centsError === null ? '—' : `${round1(centsError)}¢`
        } · clarity ${detected.clarity.toFixed(2)}`
      : 'no pitch detected';
  const confidence = clamp01(detected.clarity);

  let verdict: NoteVerdict;
  let message: string;

  if (detected.rms < minRms || detected.frequency <= 0) {
    verdict = 'too-quiet';
    message = detected.rms < minRms
      ? 'Too quiet — I could not hear that clearly. Play closer to the microphone or strike the string harder.'
      : 'I could not hear a clear note. Try again.';
  } else if (detected.clarity < minClarity || centsError === null) {
    verdict = 'uncertain';
    message = 'That note was not clear enough to judge. Play one clean note and let it ring.';
  } else if (Math.abs(centsError) <= toleranceCents) {
    verdict = 'correct';
    message =
      Math.abs(centsError) <= 15
        ? `Correct — you played ${target.noteName}.`
        : `Correct — that is ${target.noteName}, though ${Math.abs(
            Math.round(centsError),
          )}¢ ${centsError > 0 ? 'sharp' : 'flat'} of the target pitch.`;
  } else {
    verdict = 'incorrect';
    const direction = centsError > 0 ? 'sharp' : 'flat';
    message = `That is ${detectedNoteName ?? 'an unclear note'}, ${Math.abs(
      Math.round(centsError),
    )}¢ ${direction} of the target ${target.noteName}. Aim for the target pitch.`;
  }

  return {
    verdict,
    isCorrect: verdict === 'correct',
    confidence,
    centsError,
    target,
    detected: {
      noteName: detectedNoteName,
      frequency: detected.frequency,
      clarity: detected.clarity,
      rms: detected.rms,
    },
    message,
    detail: [
      `TARGET: ${targetBlock}`,
      `DETECTED: ${detectedBlock}`,
      `CONFIDENCE: ${confidence.toFixed(2)}`,
    ].join('\n'),
  };
}

export interface TimingTarget {
  /** Beat-anchored start time of the target note, seconds. */
  start: number;
  /** Note length, seconds. */
  duration: number;
}

export interface TimingEvaluation {
  verdict: TimingVerdict;
  /** Signed offset from the ideal onset, milliseconds. Positive = late. */
  offsetMs: number | null;
  message: string;
}

/**
 * Judge when a note arrived relative to its place on the song timeline.
 * Kept separate from pitch evaluation so either can be used on its own.
 */
export function evaluateTiming(
  target: TimingTarget,
  detectedAt: number,
  options: { toleranceMs?: number } = {},
): TimingEvaluation {
  const toleranceMs = options.toleranceMs ?? 80;
  const offsetMs = (detectedAt - target.start) * 1000;

  if (Math.abs(offsetMs) <= toleranceMs) {
    return { verdict: 'on-time', offsetMs, message: 'On time.' };
  }

  if (offsetMs < 0) {
    return {
      verdict: 'too-early',
      offsetMs,
      message: `Came in early by ${Math.abs(Math.round(offsetMs))} ms.`,
    };
  }

  return {
    verdict: 'too-late',
    offsetMs,
    message: `Came in late by ${Math.round(offsetMs)} ms.`,
  };
}

function targetLabel(target: PracticeTarget): string {
  const where =
    target.string !== undefined && target.fret !== undefined
      ? ` · string ${target.string} fret ${target.fret}`
      : '';
  return `${target.noteName}${where} · ${target.frequency.toFixed(1)} Hz`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
