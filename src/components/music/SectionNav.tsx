'use client';

import { SONG } from '@/data/song';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function SectionNav() {
  const { sectionId, setSection } = useSongPlayer();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Song sections">
      {SONG.sections.map((section) => {
        const active = section.id === sectionId;
        return (
          <button
            key={section.id}
            onClick={() => setSection(section.id)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border',
              active
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white',
            )}
            aria-current={active ? 'true' : 'false'}
          >
            {section.name}
          </button>
        );
      })}
    </nav>
  );
}
