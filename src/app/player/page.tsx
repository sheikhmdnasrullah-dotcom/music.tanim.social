'use client';

import { StudioPlayer } from '@/components/music/StudioPlayer';
import { SongStage } from '@/components/music/SongStage';
import { SectionNav } from '@/components/music/SectionNav';
import { LineList } from '@/components/music/LineList';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import Link from 'next/link';

function PlayerContent() {
  const params = useSearchParams();
  const player = useSongPlayer();
  const songId = params.get('song');

  useEffect(() => {
    if (songId && songId !== player.currentSongId) {
      player.setCurrentSong(songId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  const song = player.currentSong;

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        <div className="max-w-2xl mx-auto px-6 pt-12 pb-32">
          <div className="mb-16">
            <Link
              href="/"
              className="inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-10"
            >
              Home
            </Link>
            <div className="text-center space-y-2">
              <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground text-balance">
                {song.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {song.sections[0]?.name} · {song.bpm} BPM · {song.key}
              </p>
            </div>
          </div>

          <div className="space-y-12">
            <SongStage />

            <StudioPlayer />

            <div className="space-y-4">
              <SectionNav />
            </div>

            <div className="space-y-1">
              <LineList />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PlayerContent />
    </Suspense>
  );
}
