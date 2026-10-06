'use client';

import { useSyncExternalStore, useState } from 'react';
import { SONG } from '@/data/song';
import { SECTION_TIMINGS, SECTION_ORDER } from '@/data/timings';
import { SECTION_PROGRESSIONS } from '@/data/song-guitar';
import { chordDegree } from '@/lib/music/theory';

const NOTES_KEY = 'your-song-notes';

/**
 * Notes are kept in localStorage and read through useSyncExternalStore so the
 * component is SSR-safe (no `window` at render time) and re-renders when the
 * store changes.
 */
function subscribeNotes(callback: () => void) {
  window.addEventListener('your-song-notes', callback);
  return () => window.removeEventListener('your-song-notes', callback);
}

function readNotes() {
  return window.localStorage.getItem(NOTES_KEY) ?? '';
}

/** verse-2 / pre-chorus-2 repeat the first occurrences (per the workbook). */
const PROGRESSION_ALIAS: Record<string, string> = {
  'verse-2': 'verse-1',
  'pre-chorus-2': 'pre-chorus-1',
};

function barsAt80Bpm(durationSec: number): number {
  // 80 BPM in 4/4: one bar = 3 seconds.
  return Math.round((durationSec / 3) * 10) / 10;
}

export default function YourSongPage() {
  const notes = useSyncExternalStore(subscribeNotes, readNotes, () => '');
  const [saved, setSaved] = useState(false);

  const updateNotes = (value: string) => {
    window.localStorage.setItem(NOTES_KEY, value);
    window.dispatchEvent(new Event('your-song-notes'));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-12 pb-24">
      <div className="mb-10">
        <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-1">
          Songwriting
        </p>
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          Steal this structure
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          The shape of “{SONG.title}” — its sections, bar counts, and chord logic in D minor —
          is a complete container for a new song. Fill your own words into the same bars, and
          keep the same degree motion so it stays singable.
        </p>
      </div>

      <div className="space-y-3">
        {SECTION_ORDER.map((sectionId) => {
          const section = SONG.sections.find((s) => s.id === sectionId);
          if (!section) return null;
          const timing = SECTION_TIMINGS[sectionId];
          const prog =
            SECTION_PROGRESSIONS[sectionId] ??
            SECTION_PROGRESSIONS[PROGRESSION_ALIAS[sectionId]];
          return (
            <div key={sectionId} className="rounded-lg border border-border p-4 space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-sm">{section.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {timing.duration.toFixed(1)}s · {barsAt80Bpm(timing.duration)} bars ·{' '}
                  {section.lines.length} lines
                </p>
              </div>
              {prog && (
                <p className="text-xs font-mono text-muted-foreground">
                  {prog.chords
                    .map(({ chord }) => {
                      const degree = chordDegree(chord);
                      return degree ? `${chord} (${degree})` : chord;
                    })
                    .join(' → ')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 space-y-2">
        <p className="text-sm font-semibold">Why this shape works</p>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5 leading-relaxed">
          <li>
            The verse circles VII → ii → v → III — dominant-side and subdominant chords only, so
            it feels like walking, never resolving.
          </li>
          <li>
            The pre-chorus lifts through IV (G) and lands on i (Dm7), handing the chorus its
            home position.
          </li>
          <li>
            The chorus keeps the same family (VII → III → v → IV) but starts on the brightest
            chord of the verse, which is what makes it feel like arrival.
          </li>
        </ul>
      </div>

      <div className="mt-8 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Your song — notes</p>
          <span className="text-xs text-muted-foreground">
            {saved ? 'saved locally' : 'autosaves on this device'}
          </span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => updateNotes(e.target.value)}
          rows={8}
          placeholder={
            'Title: \nVerse 1 line 1 (over Cadd9, VII): \nVerse 1 line 2 (over Em7, ii): \n…'
          }
          className="w-full rounded-lg border border-border bg-muted/40 p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <p className="text-xs text-muted-foreground">
          Saved in your browser&apos;s local storage only — nothing is uploaded. The degree in
          each parenthesis tells you which emotional role the bar plays, so your lines land in
          the right place.
        </p>
      </div>
    </div>
  );
}
