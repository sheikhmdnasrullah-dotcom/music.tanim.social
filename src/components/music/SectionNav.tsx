'use client';

import { SONG } from '@/data/song';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function SectionNav() {
  const { currentSong, sectionId, setSection } = useSongPlayer();

  const sections = currentSong ? currentSong.sections : SONG.sections;

  return (
    <nav className="flex gap-0.5 overflow-x-auto no-scrollbar" aria-label="Song sections">
      {sections.map((section) => {
        const active = section.id === sectionId;
        return (
          <button
            key={section.id}
            onClick={() => setSection(section.id)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 text-xs font-medium tracking-wide transition-colors whitespace-nowrap rounded-md',
              active
                ? 'bg-foreground text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
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
