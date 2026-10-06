'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function SyllablePills({ lineId }: { lineId?: string }) {
  const { lines, currentLineId, activeLineId, isPlaying, currentTime } = useSongPlayer();

  const targetId = lineId ?? (isPlaying ? currentLineId : activeLineId ?? currentLineId);
  const line = lines.find((l) => l.id === targetId) ?? lines[0];
  if (!line) return null;

  const dur = Math.max(0.01, line.duration);
  const lineRelTime = currentTime >= line.startTime ? currentTime - line.startTime : currentTime;

  let activeIdx = -1;
  line.syllables.forEach((syl, i) => {
    const sStart = syl.startTime >= line.startTime ? syl.startTime - line.startTime : syl.startTime;
    if (lineRelTime >= sStart && lineRelTime < sStart + syl.duration) {
      activeIdx = i;
    }
  });

  return (
    <div className="flex flex-wrap gap-1.5 justify-center mt-4" aria-label="Syllables" aria-live="polite">
      {line.syllables.map((syl, i) => (
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
