'use client';

import { useState } from 'react';
import { SONG } from '@/data/song';
import { AudioPlayer } from '@/components/music/AudioPlayer';
import { StageCard } from '@/components/music/StageCard';
import { SectionNav } from '@/components/music/SectionNav';
import { LineList } from '@/components/music/LineList';
import { ModeSelector } from '@/components/music/ModeSelector';
import { SpeedControl } from '@/components/music/SpeedControl';
import { LoopControl } from '@/components/music/LoopControl';
import { PracticeControls } from '@/components/music/PracticeControls';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const [isAudioReady, setIsAudioReady] = useState(false);

  const handleAudioReady = () => {
    setIsAudioReady(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Before I Learned the Words
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Interactive Vocal Learning System
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="accent">Phase 1: Core Player</Badge>
              <Badge>80 BPM</Badge>
              <Badge>D minor</Badge>
              <a
                href="/guitar"
                className="px-3 py-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Guitar Practice
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {!isAudioReady && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span>Loading audio…</span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AudioPlayer onReady={handleAudioReady} />
            
            <StageCard />

            <section aria-labelledby="sections-heading" className="space-y-3">
              <h2 id="sections-heading" className="sr-only">Song Sections</h2>
              <SectionNav />
            </section>

            <section aria-labelledby="lines-heading" className="space-y-3">
              <h2 id="lines-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Lines
              </h2>
              <LineList />
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <section aria-labelledby="mode-heading" className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
              <h2 id="mode-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Practice Mode
              </h2>
              <ModeSelector />
            </section>

            <section aria-labelledby="tempo-heading" className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
              <h2 id="tempo-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tempo
              </h2>
              <SpeedControl />
            </section>

            <section aria-labelledby="loop-heading" className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
              <h2 id="loop-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Loop
              </h2>
              <LoopControl />
            </section>

            <section aria-labelledby="controls-heading" className="space-y-3 p-4 bg-white border-2 border-foreground rounded-xl shadow-sm">
              <h2 id="controls-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Controls
              </h2>
              <PracticeControls />
            </section>

            <section className="p-4 bg-muted/30 rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Song Info
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Title</dt>
                  <dd className="font-medium">{SONG.title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">BPM</dt>
                  <dd className="font-medium">{SONG.bpm}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Key</dt>
                  <dd className="font-medium">{SONG.key}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Time Signature</dt>
                  <dd className="font-medium">{SONG.timeSignature}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Sections</dt>
                  <dd className="font-medium">{SONG.sections.length}</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </main>

      <footer className="border-t border-border py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Personal music learning application — Built with Next.js, wavesurfer.js, and pitchy</p>
        </div>
      </footer>
    </div>
  );
}