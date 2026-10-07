'use client';

import Link from 'next/link';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { songs } from '@/data/song';

export default function SongsPage() {
  const { setCurrentSong } = useSongPlayer();

  const handleSongClick = (songId: string) => {
    setCurrentSong(songId);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        <div className="max-w-2xl mx-auto px-4 pt-16 pb-24">
          <div className="mb-12">
            <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground">
              My Songs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {songs.length} {songs.length === 1 ? 'song' : 'songs'} in your library
            </p>
          </div>

          <div className="space-y-0">
            {songs.map((song) => (
              <Link
                key={song.id}
                href={`/songs/${song.id}`}
                onClick={() => handleSongClick(song.id)}
                className="group flex items-baseline justify-between gap-4 py-4 border-b border-border last:border-0 transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset -mx-4 px-4"
              >
                <div className="min-w-0">
                  <h2 className="text-base font-medium text-foreground truncate group-hover:text-foreground transition-colors">
                    {song.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Song · {song.sections.length} sections
                  </p>
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                  {song.bpm} BPM
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
