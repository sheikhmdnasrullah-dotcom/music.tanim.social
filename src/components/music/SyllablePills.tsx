'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function SyllablePills({ lineId }: { lineId?: string }) {
  const { lines, currentLineId, activeLineId, isPlaying, currentTime } = useSongPlayer();

  const targetId = lineId ?? (isPlaying ? currentLineId : activeLineId ?? currentLineId);
  const line = lines.find((l) => l.id === targetId) ?? lines[0];
  if (!line) return null;

  const lineRelTime = Math.max(0, currentTime - line.absoluteStart);

  const syls = line.timedSyllables;
  let activeIdx = -1;
  syls.forEach((syl, i) => {
    const sStart = Math.max(0, syl.absoluteStart - line.absoluteStart);
    const sEnd = Math.max(sStart, syl.absoluteEnd - line.absoluteStart);
    if (lineRelTime >= sStart && lineRelTime < sEnd) {
      activeIdx = i;
    }
  });

  return (
    <div className="flex flex-wrap gap-1.5 justify-center mt-4" aria-label="Syllables" aria-live="polite">
      {syls.map((syl, i) => (
        <span
          key={i}
          className={cn(
            'px-2.5 py-1 text-xs font-medium transition-all duration-150',
            i === activeIdx
              ? 'bg-foreground text-white scale-105'
              : 'bg-muted text-muted-foreground',
          )}
          aria-current={i === activeIdx ? 'true' : 'false'}
        >
          {syl.text}
        </span>
      ))}
    </div>
  );
}
