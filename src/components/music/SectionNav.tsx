'use client';

import { SONG } from '@/data/song';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function SectionNav() {
  const { sectionId, setSection } = useSongPlayer();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" aria-label="Song sections">
      {SONG.sections.map((section) => (
        <button
          key={section.id}
          onClick={() => setSection(section.id)}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap',
            section.id === sectionId
              ? 'bg-foreground text-white'
              : 'bg-muted text-foreground hover:bg-neutral-200',
          )}
          aria-current={section.id === sectionId ? 'true' : 'false'}
        >
          {section.name}
        </button>
      ))}
    </nav>
  );
}
