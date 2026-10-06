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
    <div className="flex flex-wrap gap-2 justify-center my-3" aria-label="Syllables" aria-live="polite">
      {line.syllables.map((syl, i) => (
        <span
          key={i}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all duration-150 shadow-sm',
            i === activeIdx
              ? 'bg-amber-500 text-slate-950 scale-110 shadow-amber-500/50 shadow-md ring-2 ring-amber-400'
              : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:border-slate-600',
          )}
          aria-current={i === activeIdx ? 'true' : 'false'}
        >
          {syl.text}
          <span className="block text-[10px] font-mono text-slate-400 font-normal">
            {syl.note.name}
          </span>
        </span>
      ))}
    </div>
  );
}
