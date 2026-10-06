import { SONG } from '@/data/song';
import { SECTION_PROGRESSIONS } from '@/data/song-guitar';
import { SECTION_TIMINGS } from '@/data/timings';
import type { CompositionPlan } from './types';

export function canonicalComposition(): CompositionPlan {
  return {
    id: `${SONG.id}-canonical`,
    version: SONG.canonicalSongVersion,
    songId: SONG.id,
    bpm: SONG.bpm,
    key: SONG.key,
    timeSignature: SONG.timeSignature,
    source: 'canonical',
    immutable: true,
    sections: SONG.sections.map((section) => {
      const timing = SECTION_TIMINGS[section.id];
      return {
        id: section.id,
        name: section.name,
        chordProgression: (SECTION_PROGRESSIONS[section.id]?.chords ?? []).map(
          ({ chord }) => chord,
        ),
        melody: section.lines.flatMap((line) =>
          line.syllables.map((syllable) => ({
            syllable: syllable.text,
            note: syllable.note.name,
            midi: syllable.note.midi,
            startTime: (timing?.songOffset ?? 0) + line.startTime + syllable.startTime,
            duration: syllable.duration,
          })),
        ),
      };
    }),
  };
}
