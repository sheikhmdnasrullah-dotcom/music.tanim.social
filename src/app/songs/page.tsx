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
        <div className="max-w-2xl mx-auto px-6 pt-20 pb-32">
          <header className="mb-16">
            <Link
              href="/"
              className="inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              Home
            </Link>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-foreground">
              My Songs
            </h1>
            <p className="text-sm text-muted-foreground mt-3">
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </p>
          </header>

          <div>
            {songs.map((song) => (
              <Link
                key={song.id}
                href={`/songs/${song.id}`}
                onClick={() => handleSongClick(song.id)}
                className="group flex items-baseline justify-between gap-6 py-5 border-b border-border last:border-0 transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset -mx-6 px-6"
              >
                <div className="min-w-0">
                  <h2 className="text-xl font-medium text-foreground truncate group-hover:text-foreground transition-colors">
                    {song.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {song.sections.length} sections
                  </p>
                </div>
                <span className="text-sm text-muted-foreground font-mono tabular-nums shrink-0">
                  {song.bpm}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
