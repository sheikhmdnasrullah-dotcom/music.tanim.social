'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { SyllablePills } from './SyllablePills';
import { PitchVisualizer } from './PitchVisualizer';

export function StageCard() {
  const { lines, currentLineId, activeLineId, isPlaying, section } = useSongPlayer();

  const targetId = isPlaying ? currentLineId : activeLineId ?? currentLineId;
  const line = lines.find((l) => l.id === targetId) ?? lines[0];
  if (!line) return null;

  return (
    <div className="bg-white border-2 border-foreground rounded-2xl p-6 md:p-8">
      <div className="text-center space-y-4">
        <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          {section.name}
        </div>

        <div className="text-2xl md:text-3xl font-bold text-foreground leading-tight min-h-[3rem]">
          &ldquo;{line.text}&rdquo;
        </div>

        {line.pronunciation && (
          <div className="text-base italic text-muted-foreground font-mono">
            {line.pronunciation}
          </div>
        )}

        {line.voiceDirection && (
          <div className="text-sm text-muted-foreground max-w-2xl mx-auto px-4">
            {line.voiceDirection}
          </div>
        )}

        <SyllablePills lineId={line.id} />

        <PitchVisualizer lineId={line.id} height={140} />
      </div>
    </div>
  );
}
