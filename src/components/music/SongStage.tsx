'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { PitchVisualizer } from './PitchVisualizer';

export function SongStage() {
  const { lines, currentLineId, activeLineId, isPlaying, section } = useSongPlayer();

  const targetId = isPlaying ? currentLineId : activeLineId ?? currentLineId;
  const line = lines.find((l) => l.id === targetId) ?? lines[0];
  if (!line) return null;

  return (
    <div className="text-center space-y-5">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          {section.name}
        </p>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground text-balance leading-tight">
          &ldquo;{line.text}&rdquo;
        </h2>
        {line.pronunciation && (
          <p className="text-sm text-muted-foreground italic">
            {line.pronunciation}
          </p>
        )}
      </div>

      <PitchVisualizer lineId={line.id} height={80} />
    </div>
  );
}
