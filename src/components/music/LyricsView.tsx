'use client';

import { useEffect, useRef } from 'react';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function LyricsView() {
  const {
    lines,
    section,
    currentLineId,
    activeLineId,
    isPlaying,
    playLineOnly,
  } = useSongPlayer();

  const highlighted = isPlaying
    ? currentLineId
    : activeLineId ?? currentLineId ?? lines[0]?.id ?? null;

  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!highlighted) return;
    const el = itemRefs.current.get(highlighted);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  return (
    <div className="space-y-1" role="list" aria-label={`${section.name} lyrics`}>
      {lines.map((line) => {
        const active = line.id === highlighted;
        return (
          <div
            key={line.id}
            ref={(el) => {
              if (el) itemRefs.current.set(line.id, el);
              else itemRefs.current.delete(line.id);
            }}
            role="listitem"
          >
            <button
              onClick={() => playLineOnly(line.id)}
              className={cn(
                'w-full text-left rounded-lg px-4 py-3 transition-all duration-300',
                active ? 'bg-muted/70' : 'hover:bg-muted/30',
              )}
            >
              <span
                className={cn(
                  'block transition-all duration-300',
                  active
                    ? 'font-display text-2xl md:text-[1.65rem] leading-snug tracking-tight text-foreground'
                    : 'text-base leading-relaxed text-muted-foreground',
                )}
              >
                {line.text}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
