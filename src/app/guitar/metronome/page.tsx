'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Metronome, tapTempoBpm } from '@/lib/audio/metronome';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRESETS = [50, 60, 70, 80, 90, 100, 120];

export default function GuitarMetronomePage() {
  const [bpm, setBpm] = useState(60);
  const [subdivision, setSubdivision] = useState<1 | 2>(1);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [taps, setTaps] = useState<number[]>([]);

  const metroRef = useRef<Metronome | null>(null);

  useEffect(() => {
    const metro = new Metronome({
      onBeat: (inBar) => setBeat(inBar),
    });
    metroRef.current = metro;
    return () => metro.stop();
  }, []);

  useEffect(() => {
    if (metroRef.current) {
      metroRef.current.bpm = bpm;
      metroRef.current.subdivision = subdivision;
    }
  }, [bpm, subdivision]);

  const toggle = () => {
    const metro = metroRef.current;
    if (!metro) return;
    if (running) {
      metro.stop();
      setRunning(false);
      setBeat(-1);
    } else {
      metro.bpm = bpm;
      metro.subdivision = subdivision;
      metro.start();
      setRunning(true);
    }
  };

  const tap = () => {
    const now = performance.now();
    const next = [...taps, now];
    if (next.length > 8) next.shift();
    setTaps(next);
    const guess = tapTempoBpm(next);
    if (guess) setBpm(Math.max(30, Math.min(208, guess)));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <Link href="/guitar" className="hover:underline">
            Guitar
          </Link>{' '}
          / Metronome
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Metronome</h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          A clean click for any tempo. The song sits at 80 BPM; its practice version at 60.
        </p>
      </header>

      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'w-16 h-16 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-colors',
              running && beat === i
                ? i === 0
                  ? 'bg-accent border-accent text-white'
                  : 'bg-foreground border-foreground text-white'
                : 'border-border text-muted-foreground',
            )}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button size="lg" onClick={() => setBpm(Math.max(30, bpm - 1))} aria-label="Slower">
          −
        </Button>
        <div className="text-5xl font-bold font-mono tabular-nums w-40 text-center">{bpm}</div>
        <Button size="lg" onClick={() => setBpm(Math.min(208, bpm + 1))} aria-label="Faster">
          +
        </Button>
      </div>

      <div className="flex justify-center gap-1.5 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setBpm(p)}
            aria-pressed={bpm === p}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
              bpm === p ? 'bg-foreground text-white' : 'bg-muted hover:bg-neutral-200',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex justify-center items-center gap-2">
        <button
          onClick={() => setSubdivision(1)}
          aria-pressed={subdivision === 1}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium',
            subdivision === 1 ? 'bg-foreground text-white' : 'bg-muted hover:bg-neutral-200',
          )}
        >
          Quarter notes
        </button>
        <button
          onClick={() => setSubdivision(2)}
          aria-pressed={subdivision === 2}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium',
            subdivision === 2 ? 'bg-foreground text-white' : 'bg-muted hover:bg-neutral-200',
          )}
        >
          Eighth notes
        </button>
      </div>

      <div className="flex justify-center gap-3">
        <Button size="lg" onClick={toggle} className="min-w-[160px]">
          {running ? '❚❚ Stop' : '▶ Start'}
        </Button>
        <Button size="lg" variant="secondary" onClick={tap} className="min-w-[120px]">
          Tap tempo
        </Button>
      </div>
    </div>
  );
}
