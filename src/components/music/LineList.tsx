'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function LineList() {
  const {
    lines,
    currentLineId,
    activeLineId,
    isPlaying,
    loopMode,
    playLineOnly,
    loopLine,
    section,
  } = useSongPlayer();

  const highlighted = isPlaying
    ? currentLineId
    : activeLineId ?? currentLineId ?? lines[0]?.id ?? null;
  const loopingLineId = loopMode === 'line' ? (activeLineId ?? currentLineId) : null;

  return (
    <div className="space-y-1" role="list" aria-label={`${section.name} lines`}>
      {lines.map((line, i) => (
        <div
          key={line.id}
          className={cn(
            'group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors',
            line.id === highlighted
              ? 'bg-muted'
              : 'hover:bg-muted/50',
          )}
          role="listitem"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono font-medium text-muted-foreground tabular-nums w-4">
                {i + 1}
              </span>
              <p
                className={cn(
                  'text-sm truncate',
                  line.id === highlighted ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {line.text}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => playLineOnly(line.id)}
              className="h-7 w-7 p-0"
              aria-label={`Play line ${i + 1}`}
            >
              <span className="sr-only">Play</span>
              <svg className="h-3.5 w-3.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loopLine(line.id)}
              className={cn(
                'h-7 w-7 p-0',
                loopingLineId === line.id && 'text-foreground',
              )}
              aria-label={`Loop line ${i + 1}`}
            >
              <span className="sr-only">Loop</span>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 2l4 4-4 4" />
                <path d="M3 11v-1a4 4 0 014-4h14" />
                <path d="M7 22l-4-4 4-4" />
                <path d="M21 13v1a4 4 0 01-4 4H3" />
              </svg>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
