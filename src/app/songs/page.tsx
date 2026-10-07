'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { songs } from '@/data/song';

export default function SongsPage() {
  const router = useRouter();
  const { playSong } = useSongPlayer();

  const handlePlay = (songId: string) => {
    playSong(songId);
    router.push(`/player?song=${songId}`);
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
              <div
                key={song.id}
                className="group flex items-center justify-between gap-6 py-5 border-b border-border last:border-0 transition-colors hover:bg-muted/30 -mx-6 px-6"
              >
                <Link
                  href={`/songs/${song.id}`}
                  className="min-w-0 flex-1"
                >
                  <h2 className="text-xl font-medium text-foreground truncate group-hover:text-foreground transition-colors">
                    {song.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {song.sections.length} sections
                  </p>
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  <button
                    onClick={() => handlePlay(song.id)}
                    aria-label={`Play ${song.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-foreground hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                  </button>
                  <span className="text-sm text-muted-foreground font-mono tabular-nums">
                    {song.bpm}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
