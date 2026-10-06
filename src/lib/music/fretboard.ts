import type { GuitarString, Tuning } from '@/types/guitar';
import { STANDARD_TUNING } from '@/types/guitar';
import { frequencyToMidi, midiToNoteName, NOTE_NAMES } from '@/lib/music/notes';

/** Highest fret we are willing to call playable. A 24-fret neck reaches two full octaves. */
export const MAX_FRET = 24;

/**
 * `Tuning.notes` is stored lowest-first: index 0 is the low string (string 6 on a
 * standard-tuned guitar), index 5 is the high string (string 1).
 *
 * Converting between the two is the single most common source of string-identification
 * bugs, so both directions live here and nowhere else.
 */
export function stringFromNotesIndex(index: number): GuitarString {
  return (6 - index) as GuitarString;
}

export function notesIndexFromString(string: GuitarString): number {
  return 6 - string;
}

/** MIDI number of the open string, e.g. `openMidiForString(STANDARD_TUNING, 6) === 40` (E2). */
export function openMidiForString(tuning: Tuning, string: GuitarString): number {
  return tuning.notes[notesIndexFromString(string)];
}

export function noteNameForString(tuning: Tuning, string: GuitarString): string {
  return midiToNoteName(openMidiForString(tuning, string));
}

/** All six open-string note names, ordered string 1 (high) → string 6 (low) for display. */
export function openNoteNames(tuning: Tuning): string[] {
  return [1, 2, 3, 4, 5, 6].map((s) => noteNameForString(tuning, s as GuitarString));
}

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th'];

function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return `${n}st`;
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`;
  return `${n}th`;
}

/** `5th string open`, `4th string 7th fret`. */
export function positionLabel(position: { string: GuitarString; fret: number }): string {
  const ordinalString = ORDINALS[position.string] ?? `${position.string}`;
  return position.fret === 0
    ? `${ordinalString} string open`
    : `${ordinalString} string ${ordinal(position.fret)} fret`;
}

export interface FretPosition {
  string: GuitarString;
  fret: number;
  openMidi: number;
}

export interface PositionCandidate extends FretPosition {
  /** Unnormalized plausibility weight before priors are applied. */
  prior: number;
  /** Probability mass this position receives once all candidates are normalized. */
  posterior: number;
}

export interface IdentifyOptions {
  /** Detected fundamental in Hz. */
  frequency: number;
  /** Detector confidence for the pitch itself (MPM clarity), 0-1. */
  clarity?: number;
  tuning?: Tuning;
  maxFret?: number;
  /**
   * Lesson context. When the lesson already knows which string/fret is expected,
   * that knowledge dominates the prior — this is what makes target-note practice
   * reliable without pretending pitch alone is unambiguous.
   */
  target?: { string?: GuitarString; fret?: number };
  /** Previous position, used as a weak temporal prior (players tend to stay put). */
  previous?: { string: GuitarString; fret: number } | null;
}

export interface StringIdentification {
  /** Detected fundamental in Hz. */
  frequency: number;
  /** Continuous MIDI derived from the frequency, e.g. 69.03. */
  midi: number;
  /** Nearest semitone MIDI, e.g. 69. */
  noteMidi: number;
  /** Nearest semitone name with octave, e.g. `A4`. */
  noteName: string;
  /** Signed deviation from the nearest semitone, in cents. */
  cents: number;
  /** Confidence that the *pitch* was detected correctly (detector clarity), 0-1. */
  pitchConfidence: number;
  /** Confidence that `string`/`fret` identify where it was played, 0-1. */
  stringConfidence: number;
  /** Every string/fret combination that can physically produce this note. */
  positions: PositionCandidate[];
  /** Highest-ranked position, or `null` when the note is outside the tuning's range. */
  best: PositionCandidate | null;
  /** True when more than one position is plausible and the leader is not decisive. */
  ambiguous: boolean;
  /** Shorthand for `best?.string`. */
  string: GuitarString | null;
  /** Shorthand for `best?.fret`. */
  fret: number | null;
  /** `best` rank plus the ambiguity caveat, e.g. `94%`. */
  confidence: number;
  explanation: string;
}

/**
 * Posterior confidence below which we describe the string identification as
 * ambiguous rather than settled.
 */
const AMBIGUITY_THRESHOLD = 0.9;

/**
 * Plausibility of a fret position *before* context is considered.
 *
 * Pitch alone can never uniquely identify a string: A2 is available at six places on
 * the neck. So we encode a deliberately modest, documented prior — beginners play low
 * frets far more often than high ones — and then let lesson context override it.
 * The posterior is reported honestly rather than rounded up to look certain.
 */
function fretPrior(fret: number): number {
  return 1 / (1 + 0.35 * fret);
}

/**
 * Map a detected frequency onto the fretboard.
 *
 * Returns *every* physically possible position, ranked. When the lesson supplies a
 * target string/fret the ranking collapses onto that position and confidence rises;
 * without context the result stays honestly ambiguous.
 */
export function identifyFretPositions(options: IdentifyOptions): StringIdentification {
  const {
    frequency,
    clarity = 0,
    tuning = STANDARD_TUNING,
    maxFret = MAX_FRET,
    target,
    previous,
  } = options;

  const midi = frequencyToMidi(frequency) ?? 0;
  const noteMidi = Math.round(midi);
  const cents = Math.round((midi - noteMidi) * 100);
  const noteName = midiToNoteName(midi);
  const pitchConfidence = clamp01(clarity);

  const weighted: { position: FretPosition; prior: number }[] = [];

  if (Number.isFinite(frequency) && frequency > 0) {
    for (let index = 0; index < tuning.notes.length; index++) {
      const openMidi = tuning.notes[index];
      const fret = noteMidi - openMidi;
      if (fret < 0 || fret > maxFret) continue;

      const string = stringFromNotesIndex(index);
      let prior = fretPrior(fret);

      if (target?.string !== undefined) {
        prior *= string === target.string ? 6 : 0.08;
        if (target.fret !== undefined) {
          prior *= fret === target.fret ? 4 : 0.6;
        }
      }

      if (previous) {
        if (previous.string === string) prior *= 2;
        if (Math.abs(previous.fret - fret) <= 2) prior *= 1.3;
      }

      weighted.push({ position: { string, fret, openMidi }, prior });
    }
  }

  const total = weighted.reduce((sum, entry) => sum + entry.prior, 0);

  const positions: PositionCandidate[] = weighted
    .sort((a, b) => b.prior - a.prior)
    .map((entry) => ({
      ...entry.position,
      prior: entry.prior,
      posterior: total > 0 ? entry.prior / total : 0,
    }));

  const best = positions[0] ?? null;
  const stringConfidence = best ? round2(best.posterior) : 0;
  // Below 90% we are still guessing between neck positions, so we say so rather than
  // presenting the leader as settled fact.
  const ambiguous = positions.length > 1 && stringConfidence < AMBIGUITY_THRESHOLD;

  return {
    frequency,
    midi,
    noteMidi,
    noteName,
    cents,
    pitchConfidence,
    stringConfidence,
    positions,
    best,
    ambiguous,
    string: best?.string ?? null,
    fret: best?.fret ?? null,
    confidence: stringConfidence,
    explanation: buildExplanation({ noteName, positions, best, ambiguous, stringConfidence, target, frequency }),
  };
}

function buildExplanation(input: {
  noteName: string;
  positions: PositionCandidate[];
  best: PositionCandidate | null;
  ambiguous: boolean;
  stringConfidence: number;
  target?: { string?: GuitarString; fret?: number };
  frequency: number;
}): string {
  const { noteName, positions, best, ambiguous, stringConfidence, target, frequency } = input;
  const pct = Math.round(stringConfidence * 100);

  if (!best) {
    return `Detected ${noteName} (${frequency.toFixed(1)} Hz) — outside the playable range of this tuning.`;
  }

  const targetNote =
    target?.string !== undefined && target?.fret !== undefined
      ? ` Lesson target: ${positionLabel({ string: target.string, fret: target.fret })}.`
      : '';

  if (positions.length === 1) {
    return `Detected ${noteName} (${frequency.toFixed(1)} Hz). ${capitalize(positionLabel(best))}.${targetNote}`;
  }

  const candidates = positions.map((position) => positionLabel(position)).join(', ');
  const verdict = ambiguous ? 'Most likely' : 'Selected';

  return `Detected ${noteName} (${frequency.toFixed(1)} Hz). Possible positions: ${candidates}. ${verdict}: ${positionLabel(
    best,
  )} (${pct}% confident).${targetNote}`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

/** Note names for a tuning, ordered string 6 → string 1 (lowest first). */
export function tuningNoteNames(tuning: Tuning): string[] {
  return tuning.notes.map((midi) => midiToNoteName(midi));
}

export { NOTE_NAMES };
