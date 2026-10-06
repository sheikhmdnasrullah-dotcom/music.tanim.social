import type { SongSection, LyricLine, Syllable } from '@/types/song';
import { SECTION_TIMINGS } from '@/data/timings';

export interface TimedSyllable extends Syllable {
  absoluteStart: number;
  absoluteEnd: number;
}

export interface TimedLine extends LyricLine {
  /** Content start, relative to the section audio. */
  absoluteStart: number;
  /** Content end (last syllable release), relative to the section audio. */
  absoluteEnd: number;
  /**
   * Highlight/loop end: runs through the breath up to the next line's start,
   * so the current line stays lit while the singer resets.
   */
  activeEnd: number;
  timedSyllables: TimedSyllable[];
}

export interface SectionTiming {
  section: SongSection;
  duration: number;
  songOffset: number;
  lines: TimedLine[];
}

/**
 * Build the runtime timing view for a section from the audio-derived data in
 * `@/data/timings`. Falls back to scaling the authored relative times when a
 * section has no derived timing (defensive — every section ships with one).
 */
export function buildSectionTiming(section: SongSection): SectionTiming {
  const data = SECTION_TIMINGS[section.id];
  const duration = data?.duration || section.duration || 1;

  const lines: TimedLine[] = section.lines.map((line, i) => {
    const lineData = data?.lines[i];

    const timedSyllables: TimedSyllable[] = line.syllables.map((syl, j) => {
      const sylData = lineData?.syllables[j];
      if (sylData) {
        return { ...syl, absoluteStart: sylData.start, absoluteEnd: sylData.end };
      }
      const raw = syl.startTime + syl.duration;
      const scale = lineData ? lineData.end / Math.max(raw, 0.001) : 1;
      return {
        ...syl,
        absoluteStart: lineData ? lineData.start + syl.startTime * scale : syl.startTime,
        absoluteEnd: lineData ? lineData.start + raw * scale : raw,
      };
    });

    const absoluteStart = lineData?.start ?? timedSyllables[0]?.absoluteStart ?? 0;
    const absoluteEnd =
      lineData?.end ?? timedSyllables[timedSyllables.length - 1]?.absoluteEnd ?? absoluteStart;

    return {
      ...line,
      startTime: absoluteStart,
      duration: absoluteEnd - absoluteStart,
      absoluteStart,
      absoluteEnd,
      activeEnd: absoluteEnd,
      timedSyllables,
    };
  });

  // Each line owns the breath that follows it, so highlighting never drops out.
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1];
    lines[i].activeEnd = next ? next.absoluteStart : duration;
  }

  return { section, duration, songOffset: data?.songOffset ?? 0, lines };
}

/** Index of the line active at `time`, or -1 before the first line. */
export function findLineIndex(timing: SectionTiming, time: number): number {
  const lines = timing.lines;
  for (let i = 0; i < lines.length; i++) {
    if (time < lines[i].activeEnd) return i;
  }
  return lines.length - 1;
}

export function findLineAtTime(timing: SectionTiming, time: number): TimedLine | null {
  const i = findLineIndex(timing, time);
  return i >= 0 ? timing.lines[i] : null;
}

/**
 * Index of the syllable active at `time`: the last one that has started.
 * Returns -1 only for an empty line.
 */
export function findSyllableIndex(line: TimedLine, time: number): number {
  const syls = line.timedSyllables;
  let idx = -1;
  for (let i = 0; i < syls.length; i++) {
    if (time >= syls[i].absoluteStart) idx = i;
    else break;
  }
  return idx;
}

export function findSyllableAtTime(line: TimedLine, time: number): TimedSyllable | null {
  const i = findSyllableIndex(line, time);
  return i >= 0 ? line.timedSyllables[i] : null;
}

/**
 * Loop bounds for the musical phrase containing `lineIndex`. Lines are paired
 * into couplets (two lines per phrase) — the natural phrasing of this song.
 */
export function getPhraseBounds(
  timing: SectionTiming,
  lineIndex: number
): { start: number; end: number } {
  const lines = timing.lines;
  const groupStart = Math.floor(lineIndex / 2) * 2;
  const start = lines[groupStart]?.absoluteStart ?? 0;
  const last = Math.min(groupStart + 1, lines.length - 1);
  const end = lines[last]?.activeEnd ?? timing.duration;
  return { start, end };
}
