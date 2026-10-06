'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function LineList() {
  const {
    lines,
    currentLineId,
    activeLineId,
    isPlaying,
    loopMode,
    setLoopMode,
    seekToLine,
    section,
  } = useSongPlayer();

  const highlighted = isPlaying
    ? currentLineId
    : (activeLineId ?? currentLineId ?? lines[0]?.id ?? null);
  const loopingLineId = loopMode === 'line' ? (activeLineId ?? currentLineId) : null;

  return (
    <div className="space-y-2" role="list" aria-label={`${section.name} lines`}>
      {lines.map((line, i) => (
        <div
          key={line.id}
          className={cn(
            'flex items-center justify-between gap-3 p-3 rounded-lg transition-colors border',
            line.id === highlighted
              ? 'bg-neutral-100 border-foreground'
              : 'bg-muted/50 hover:bg-muted border-transparent',
          )}
          role="listitem"
        >
          <button className="flex-1 min-w-0 text-left" onClick={() => seekToLine(line.id)}>
            <p
              className={cn(
                'font-medium text-sm truncate',
                line.id === highlighted ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <span className="text-xs font-mono text-muted-foreground mr-2">{i + 1}</span>
              {line.text}
            </p>
            {line.id === highlighted && line.pronunciation && (
              <p className="text-xs italic text-muted-foreground mt-0.5 truncate font-mono">
                {line.pronunciation}
              </p>
            )}
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => seekToLine(line.id)}
              aria-label={`Play line: ${line.text}`}
              className="px-2 py-1 rounded text-sm hover:bg-neutral-200"
            >
              ▶
            </button>
            <button
              onClick={() => {
                const on = loopingLineId === line.id;
                setLoopMode(on ? 'off' : 'line');
                if (!on) seekToLine(line.id);
              }}
              aria-label={
                loopingLineId === line.id ? `Stop looping line: ${line.text}` : `Loop line: ${line.text}`
              }
              aria-pressed={loopingLineId === line.id}
              className={cn(
                'px-2 py-1 rounded text-sm transition-colors',
                loopingLineId === line.id ? 'bg-foreground text-white' : 'hover:bg-neutral-200',
              )}
            >
              ↻
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
