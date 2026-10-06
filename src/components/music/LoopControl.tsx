'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';
import type { LoopMode } from '@/state/SongPlayerContext';

export function LoopControl() {
  const { loopMode, setLoopMode, section, activeLineId, lines } = useSongPlayer();

  const activeLine = lines.find((l) => l.id === activeLineId) || lines[0];

  const modes: { id: LoopMode; label: string; desc: string }[] = [
    { id: 'off', label: 'Off', desc: 'Play through once' },
    { id: 'line', label: 'Phrase / Line', desc: `Repeat "${activeLine?.text?.slice(0, 24)}..."` },
    { id: 'section', label: 'Full Section', desc: `Repeat ${section.name}` },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-400">Loop Mode</span>
        <span className="font-mono font-bold text-amber-400 uppercase">{loopMode}</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {modes.map((m) => {
          const active = loopMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setLoopMode(m.id)}
              className={cn(
                'text-xs py-2 px-2 rounded-lg font-medium transition border text-center',
                active
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 italic">
        {loopMode === 'line' && '🔁 Current line will seamlessly loop forever for muscle memory.'}
        {loopMode === 'section' && `🔁 Entire ${section.name} will loop upon finishing.`}
        {loopMode === 'off' && 'Playback stops naturally at the end of the section.'}
      </p>
    </div>
  );
}