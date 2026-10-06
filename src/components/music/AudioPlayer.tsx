'use client';

// Waveform + main transport. Mounts the shared WaveSurfer instance
// provided by <SongPlayerProvider> — this is the app's only audio engine.

import { useEffect } from 'react';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { Button } from '@/components/ui/button';

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ onReady }: { onReady?: () => void }) {
  const {
    attachWaveform,
    isReady,
    isPlaying,
    togglePlay,
    currentTime,
    duration,
    section,
    seekToTime,
    voiceSource,
    guideSpeed,
    tempo,
  } = useSongPlayer();

  useEffect(() => {
    if (isReady && onReady) onReady();
  }, [isReady, onReady]);

  return (
    <div className="bg-white border-2 border-foreground rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            {section.name}
          </div>
          <div className="text-sm font-mono text-muted-foreground mt-0.5">
            {fmt(currentTime)} / {fmt(duration)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => seekToTime(0)}
            aria-label="Back to start"
            className="px-3"
          >
            ⏮
          </Button>
          <Button
            size="lg"
            onClick={togglePlay}
            disabled={!isReady}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="min-w-[120px]"
          >
            {isPlaying ? '❚❚ Pause' : '▶ Play'}
          </Button>
        </div>
      </div>

      <div ref={(el) => attachWaveform(el)} className="w-full" />

      {!isReady && (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Preparing the player…
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span className="px-2 py-0.5 rounded bg-muted">
          {voiceSource === 'male' ? 'Male guide' : 'My voice'}
        </span>
        <span className="px-2 py-0.5 rounded bg-muted">
          {guideSpeed === 'slow' ? 'Slow practice' : 'Full speed'}
        </span>
        {tempo !== 1 && (
          <span className="px-2 py-0.5 rounded bg-muted">
            {Math.round(tempo * 100)}% speed · pitch preserved
          </span>
        )}
      </div>
    </div>
  );
}

