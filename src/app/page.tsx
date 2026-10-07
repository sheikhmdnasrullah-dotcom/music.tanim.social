'use client';

import { useRouter } from 'next/navigation';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { Play, Mic2, Music2, Guitar } from 'lucide-react';

const AREAS = [
  {
    label: 'Player',
    hint: 'Listen',
    icon: Play,
    href: '/player',
    description: 'Playback with stems, mix, and line-by-line scrubbing.',
  },
  {
    label: 'Practice',
    hint: 'Sing / Play',
    icon: Mic2,
    href: '/practice',
    description: 'Line-by-line singing practice with pitch feedback.',
  },
  {
    label: 'My Songs',
    hint: 'Your music',
    icon: Music2,
    href: '/songs',
    description: 'Your song library. Open any song to read lyrics or practice.',
  },
  {
    label: 'Guitar',
    hint: 'Learn guitar',
    icon: Guitar,
    href: '/guitar',
    description: 'Chords, transitions, strumming, tuner, and more.',
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const { currentSong } = useSongPlayer();

  const handleAreaClick = (href: string) => {
    if (href === '/player' && currentSong) {
      router.push(`/player?song=${currentSong.id}`);
      return;
    }
    if (href === '/practice' && currentSong) {
      router.push(`/practice?song=${currentSong.id}`);
      return;
    }
    if (href === '/guitar' && currentSong) {
      router.push(`/guitar?song=${currentSong.id}`);
      return;
    }
    router.push(href);
  };

  return (
    <div className="h-screen w-full bg-background">
      <div className="grid h-full grid-cols-1 md:grid-cols-2">
        {AREAS.map((area, index) => {
          const Icon = area.icon;
          const isLastRow = index >= 2;
          const isLastCol = index % 2 === 1;

          return (
            <button
              key={area.label}
              onClick={() => handleAreaClick(area.href)}
              className={[
                'group relative flex flex-col justify-between text-left transition-colors',
                'hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                isLastRow ? 'border-b-0' : 'border-b',
                isLastCol ? 'border-r-0' : 'border-r',
                'p-8 md:p-12 lg:p-16',
              ].join(' ')}
            >
              <div className="space-y-8">
                <span className="block text-[11px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">
                  {area.label}
                </span>
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                    {area.hint}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground/70 max-w-xs">
                {area.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
