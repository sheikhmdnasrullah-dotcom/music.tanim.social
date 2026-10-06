'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function SyllablePills({ lineId }: { lineId?: string }) {
  const { lines, currentLineId, activeLineId, isPlaying, currentTime } = useSongPlayer();

  const targetId = lineId ?? (isPlaying ? currentLineId : activeLineId ?? currentLineId);
  const line = lines.find((l) => l.id === targetId) ?? lines[0];
  if (!line) return null;

  // Syllable timings are absolute within the section; make them line-relative.
  const offset = currentTime - line.startTime;
  let activeIdx = -1;
  line.syllables.forEach((syl, i) => {
    const start = syl.startTime - line.startTime;
    if (offset >= start && offset < start + syl.duration) activeIdx = i;
  });

  return (
    <div className="flex flex-wrap gap-1.5 justify-center" aria-label="Syllables" aria-live="polite">
      {line.syllables.map((syl, i) => (
        <span
          key={i}
          className={cn(
            'px-3 py-1 rounded-full text-sm font-semibold transition-all duration-100',
            i === activeIdx ? 'bg-foreground text-white scale-105' : 'bg-muted text-muted-foreground',
          )}
          aria-current={i === activeIdx ? 'true' : 'false'}
        >
          {syl.text}
        </span>
      ))}
    </div>
  );
}
