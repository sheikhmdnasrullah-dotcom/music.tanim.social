'use client';

import { SONG } from '@/data/song';
import { StudioPlayer } from '@/components/music/StudioPlayer';
import { SongStage } from '@/components/music/SongStage';
import { SectionNav } from '@/components/music/SectionNav';
import { LineList } from '@/components/music/LineList';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        <div className="max-w-2xl mx-auto px-4 pt-16 pb-24">
          {/* Song Header */}
          <div className="mb-14 text-center space-y-1">
            <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground text-balance">
              {SONG.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {SONG.sections[0]?.name} · {SONG.bpm} BPM · {SONG.key}
            </p>
          </div>

          <div className="space-y-10">
            {/* Song Stage */}
            <SongStage />

            {/* Player */}
            <StudioPlayer />

            {/* Sections */}
            <div className="space-y-4">
              <SectionNav />
            </div>

            {/* Lines */}
            <div className="space-y-1">
              <LineList />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
