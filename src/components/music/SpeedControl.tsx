'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function SpeedControl() {
  const { tempo, setTempo, guideSpeed, setGuideSpeed } = useSongPlayer();

  const presets = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-400">Current Tempo</span>
        <span className="font-mono font-bold text-amber-400">
          {Math.round(tempo * 80)} BPM ({Math.round(tempo * 100)}%)
        </span>
      </div>

      <input
        type="range"
        min="0.5"
        max="1.2"
        step="0.05"
        value={tempo}
        onChange={(e) => {
          setTempo(parseFloat(e.target.value));
          setGuideSpeed('normal');
        }}
        className="w-full accent-amber-500 cursor-pointer"
      />

      <div className="grid grid-cols-4 gap-1.5">
        {presets.map((p) => {
          const active = Math.abs(tempo - p) < 0.02 && guideSpeed === 'normal';
          return (
            <button
              key={p}
              onClick={() => {
                setTempo(p);
                setGuideSpeed('normal');
              }}
              className={cn(
                'text-xs py-1.5 px-2 rounded-lg font-medium transition border',
                active
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
              )}
            >
              {Math.round(p * 100)}%
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 italic">
        ✓ Pitch is 100% preserved when slowing down for learning.
      </p>
    </div>
  );
}