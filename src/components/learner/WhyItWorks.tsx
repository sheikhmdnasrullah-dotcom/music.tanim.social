'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { chordForSectionLine } from '@/data/song-guitar';
import { describeLine } from '@/lib/music/theory';
import type { TimedLine } from '@/lib/music/timing';

function activeLineAt(lines: TimedLine[], time: number): TimedLine | null {
  for (const line of lines) {
    if (time < line.activeEnd) return line;
  }
  return lines[lines.length - 1] ?? null;
}

/**
 * "Why this works" — short theory statements computed from the actual notes
 * of the active line and the chord under it. Nothing here is decorative:
 * every number and degree comes from the song data.
 */
export function WhyItWorks() {
  const { section, lines, currentTime } = useSongPlayer();
  const line = activeLineAt(lines, currentTime);
  if (!line) return null;

  const lineIndex = lines.findIndex((l) => l.id === line.id);
  const chord = lineIndex >= 0 ? chordForSectionLine(section.id, lineIndex + 1) : undefined;
  const statements = describeLine(line, chord?.name);

  return (
    <details className="pt-4 border-t border-border">
      <summary className="text-xs font-medium text-muted-foreground cursor-pointer">
        Why this line works
      </summary>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc pl-4 leading-relaxed">
        {statements.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </details>
  );
}