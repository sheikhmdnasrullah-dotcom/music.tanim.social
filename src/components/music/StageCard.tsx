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
    <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="text-center space-y-4 relative z-10">
        <div className="inline-block text-xs font-bold tracking-widest uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          {section.name} · Vocal Focus
        </div>

        <div className="text-2xl md:text-3xl font-extrabold text-white leading-tight min-h-[3.5rem] flex items-center justify-center">
          &ldquo;{line.text}&rdquo;
        </div>

        {line.pronunciation && (
          <div className="text-sm md:text-base italic text-amber-300 font-mono">
            🗣 {line.pronunciation}
          </div>
        )}

        {line.voiceDirection && (
          <div className="text-xs md:text-sm text-slate-300 max-w-2xl mx-auto px-4 py-2 bg-slate-950/60 rounded-xl border border-slate-800">
            {line.voiceDirection}
          </div>
        )}

        <SyllablePills lineId={line.id} />

        <PitchVisualizer lineId={line.id} height={130} />
      </div>
    </div>
  );
}
