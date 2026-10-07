'use client';

import { Suspense, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { Play, Mic2, Guitar } from 'lucide-react';
import { getSongById } from '@/data/song';
import { useSongPlayer } from '@/state/SongPlayerContext';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function SongDetail({ songId }: { songId: string }) {
  const player = useSongPlayer();
  const song = getSongById(songId);

  useEffect(() => {
    if (song && songId !== player.currentSongId) {
      player.setCurrentSong(songId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  if (!song) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Song not found.</p>
      </div>
    );
  }

  const totalDuration = song.sections.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        <div className="max-w-2xl mx-auto px-6 pt-20 pb-32">
          <header className="mb-20">
            <Link
              href="/"
              className="inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-10"
            >
              Home
            </Link>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-foreground text-balance leading-[1.1]">
              {song.title}
            </h1>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {formatTime(totalDuration)}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {song.bpm} BPM
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {song.key}
              </span>
            </div>
          </header>

          <div className="space-y-14">
            {song.sections.map((section) => (
              <section key={section.id} className="space-y-6">
                <h2 className="text-[11px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">
                  {section.name}
                </h2>
                <div className="space-y-4">
                  {section.lines.map((line) => (
                    <p
                      key={line.id}
                      className="text-lg leading-[1.9] text-foreground"
                    >
                      {line.text}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-24 pt-8 border-t border-border">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/player?song=${song.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 active:scale-[0.98]"
              >
                <Play className="h-4 w-4" fill="currentColor" />
                Play
              </Link>
              <Link
                href={`/practice?song=${song.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
              >
                <Mic2 className="h-4 w-4" />
                Practice Singing
              </Link>
              <Link
                href={`/guitar?song=${song.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
              >
                <Guitar className="h-4 w-4" />
                Practice Guitar
              </Link>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default function SongDetailPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const resolved = use(params);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SongDetail songId={resolved.songId} />
    </Suspense>
  );
}
