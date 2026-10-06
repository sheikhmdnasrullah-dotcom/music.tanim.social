import type { TimedLine } from '@/lib/music/timing';
import { midiToNoteName } from '@/lib/music/notes';

/**
 * Music theory for "Before I Learned the Words", grounded in the song's real
 * key (D minor) and its actual progressions (see src/data/song-guitar.ts).
 * Every helper returns facts computed from the data — no decorative copy.
 */

/** Scale-degree names for chord roots as they appear in this song. */
export const CHORD_DEGREES: Record<string, string> = {
  D: 'i',
  E: 'ii',
  F: 'III',
  G: 'IV',
  A: 'v',
  C: 'VII',
};

/** One-line role of each degree in this song. */
export const DEGREE_ROLES: Record<string, string> = {
  i: 'the home chord of D minor',
  ii: 'the step toward the dominant — the song uses it to build tension',
  III: 'the relative major — the brightest color in the song',
  IV: 'the lifted subdominant — it leans toward the dominant',
  v: 'the subdominant — the resting place between home and the lift',
  VII: 'the dominant-side chord — the one the verse keeps circling back to',
};

/** Pitch classes of D natural minor: C D E F G A Bb. */
const D_MINOR_SCALE = new Set([0, 2, 4, 5, 7, 9, 10]);

export interface NoteSpan {
  lowMidi: number;
  highMidi: number;
  spanSemitones: number;
  lowName: string;
  highName: string;
}

/** The lowest and highest melody note of a line. */
export function lineNoteSpan(line: TimedLine): NoteSpan | null {
  const midis = line.timedSyllables.map((s) => s.note.midi);
  if (midis.length === 0) return null;
  const lowMidi = Math.min(...midis);
  const highMidi = Math.max(...midis);
  return {
    lowMidi,
    highMidi,
    spanSemitones: highMidi - lowMidi,
    lowName: midiToNoteName(lowMidi),
    highName: midiToNoteName(highMidi),
  };
}

/** Whether a note belongs to D natural minor. */
export function isInDmScale(midi: number): boolean {
  return D_MINOR_SCALE.has(((midi % 12) + 12) % 12);
}

/**
 * Out-of-scale melody notes, with the honest reason they are in the song:
 * B natural (pitch class 11) is the raised 7th — the leading tone that
 * pulls toward C and gives the song its harmonic-minor lift.
 */
export function outOfScaleNotes(line: TimedLine): string[] {
  const out = new Set<string>();
  for (const syl of line.timedSyllables) {
    if (!isInDmScale(syl.note.midi)) {
      const pc = ((syl.note.midi % 12) + 12) % 12;
      out.add(
        pc === 11
          ? `${syl.note.name} — the leading tone (B natural), which pulls toward C`
          : syl.note.name,
      );
    }
  }
  return [...out];
}

/** Parse a chord name like 'Cadd9' / 'Em7' into its root letter. */
export function chordRoot(name: string): string | null {
  const match = name.match(/^([A-G])([#b]?)/);
  return match ? match[1] + (match[2] ?? '') : null;
}

/** Scale degree for a chord name, e.g. 'Fmaj7' → 'III'. */
export function chordDegree(chordName: string): string | null {
  const root = chordRoot(chordName);
  return root ? CHORD_DEGREES[root] ?? null : null;
}

/**
 * Short, verifiable theory statements about one line, for the
 * "Why this works" panel. `chordName` is the chord under the line.
 */
export function describeLine(line: TimedLine, chordName?: string): string[] {
  const statements: string[] = [];
  const span = lineNoteSpan(line);
  if (span) {
    statements.push(
      `The melody moves ${span.lowName} → ${span.highName}, a span of ${span.spanSemitones} semitone${
        span.spanSemitones === 1 ? '' : 's'
      }.`,
    );
  }
  const outside = outOfScaleNotes(line);
  if (outside.length > 0) {
    statements.push(`Out of the D minor scale here: ${outside.join('; ')}.`);
  } else {
    statements.push('Every melody note in this line is inside the D minor scale.');
  }
  if (chordName) {
    const degree = chordDegree(chordName);
    if (degree) {
      statements.push(
        `It sits over ${chordName} — the ${degree} chord, ${DEGREE_ROLES[degree]}.`,
      );
    }
  }
  return statements;
}
