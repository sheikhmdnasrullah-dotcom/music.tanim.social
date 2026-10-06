'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { STRUM_STAGES, STRUM_STAGE_MAP } from '@/data/song-guitar';
import { Metronome, tapTempoBpm } from '@/lib/audio/metronome';
import { getAudioContext } from '@/lib/audio/guitar-synth';
import { useProgress } from '@/state/ProgressContext';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { AudioPlayer } from '@/components/music/AudioPlayer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CLEAN_WINDOW_MS = 150;

function StrummingTrainer() {
  const params = useSearchParams();
  const { state, record } = useProgress();
  const player = useSongPlayer();

  const requested = params.get('stage') ?? 'stage-1';
  const stage = STRUM_STAGE_MAP[requested] ?? STRUM_STAGES[0];

  const [bpm, setBpm] = useState(60);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [offset, setOffset] = useState<{ ms: number; text: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [taps, setTaps] = useState<number[]>([]);

  const metroRef = useRef<Metronome | null>(null);
  const anchorRef = useRef<{ perf: number } | null>(null);
  const beatCountRef = useRef(0);

  const itemId = `strum:${stage.id}`;
  const rec = state.items[itemId];
  const done = rec && (rec.mastery === 'mastered' || rec.mastery === 'solid');

  useEffect(() => {
    const metro = new Metronome({
      onBeat: (inBar, at) => {
        const ac = getAudioContext();
        const perf = performance.now() + (at - ac.currentTime) * 1000;
        if (beatCountRef.current === 0) anchorRef.current = { perf };
        beatCountRef.current += 1;
        setBeat(inBar);
      },
    });
    metro.bpm = 60;
    metroRef.current = metro;
    return () => metro.stop();
  }, []);

  useEffect(() => {
    if (metroRef.current) metroRef.current.bpm = bpm;
  }, [bpm]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setStreak(0);
      setOffset(null);
      setBeat(-1);
    });
    return () => cancelAnimationFrame(frame);
  }, [stage.id]);

  const start = () => {
    beatCountRef.current = 0;
    anchorRef.current = null;
    setStreak(0);
    setOffset(null);
    metroRef.current?.start();
    setRunning(true);
    if (stage.id === 'stage-3' && !player.isPlaying) {
      // Follow-the-guide: load the 60 BPM verse and let it play.
      if (player.sectionId !== 'verse-1') player.setSection('verse-1');
      player.setGuideSpeed('slow');
      player.setVoiceSource('male');
      player.play();
    }
  };

  const stop = () => {
    metroRef.current?.stop();
    setRunning(false);
    setBeat(-1);
    if (stage.id === 'stage-3') player.pause();
  };

  const strumPressed = () => {
    const metro = metroRef.current;
    if (!metro || !running) return;
    const interval = 60000 / metro.bpm;
    const anchor = anchorRef.current;
    const now = performance.now();
    if (!anchor) {
      setOffset({ ms: 0, text: 'Wait for the first click.' });
      return;
    }
    const elapsed = now - anchor.perf;
    const nearestIdx = Math.max(0, Math.round(elapsed / interval));
    const expected = anchor.perf + nearestIdx * interval;
    const ms = Math.round(now - expected); // negative = early
    const onBeatMark = stage.pattern[nearestIdx % 4] !== '';
    const clean = onBeatMark && Math.abs(ms) <= CLEAN_WINDOW_MS;

    if (clean) {
      const next = streak + 1;
      setStreak(next);
      setOffset({ ms, text: `${Math.abs(ms)}ms ${ms < 0 ? 'early' : 'late'} — clean` });
      if (next >= stage.targetStreak) {
        record(itemId, 'strum', { score: 1, value: Math.abs(ms) / 1000, label: 'On time' });
      }
    } else {
      setStreak(0);
      setOffset({
        ms,
        text: onBeatMark
          ? `${Math.abs(ms)}ms ${ms < 0 ? 'early' : 'late'} — outside the window`
          : 'That was a rest beat — the hand stays still.',
      });
      record(itemId, 'strum', { score: 0, value: Math.abs(ms) / 1000, label: 'Off beat' });
    }
  };

  const tap = () => {
    const now = performance.now();
    const next = [...taps, now];
    if (next.length > 8) next.shift();
    setTaps(next);
    const bpmGuess = tapTempoBpm(next);
    if (bpmGuess) setBpm(Math.max(40, Math.min(120, bpmGuess)));
  };

  return (
    <div className="space-y-8">
      {/* Stage picker */}
      <div className="grid md:grid-cols-3 gap-2">
        {STRUM_STAGES.map((s) => {
          const r = state.items[`strum:${s.id}`];
          const solid = r && (r.mastery === 'mastered' || r.mastery === 'solid');
          const active = s.id === stage.id;
          return (
            <Link
              key={s.id}
              href={`/guitar/strumming?stage=${s.id}`}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'border rounded-xl p-4 transition-colors',
                active ? 'border-foreground bg-foreground text-white' : 'border-border bg-white hover:border-neutral-400',
              )}
            >
              <div className="text-xs font-mono opacity-60">Stage {s.order}</div>
              <div className="font-bold">{s.name}</div>
              <div className={cn('text-xs mt-1', active ? 'text-white/60' : 'text-muted-foreground')}>
                {solid ? 'solid' : r && r.attempts > 0 ? 'learning' : 'new'}
              </div>
            </Link>
          );
        })}
      </div>

      <section className="border-2 border-foreground rounded-2xl bg-white p-5 md:p-7 space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{stage.explain}</p>

        {/* Pattern */}
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => {
            const mark = stage.pattern[i];
            const activeBeat = running && beat === i;
            return (
              <div
                key={i}
                className={cn(
                  'w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-colors',
                  activeBeat
                    ? 'border-foreground bg-foreground text-white'
                    : mark
                      ? 'border-foreground bg-white'
                      : 'border-border bg-muted/40 text-muted-foreground',
                )}
              >
                <span className="text-xs font-mono">{i + 1}</span>
                <span className={cn('text-xl font-bold', mark === '' && !activeBeat && 'opacity-30')}>
                  {mark === 'D' ? '↓' : mark === 'U' ? '↑' : '·'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {!running ? (
            <Button size="lg" onClick={start}>
              Start metronome
            </Button>
          ) : (
            <Button size="lg" variant="secondary" onClick={stop}>
              Stop
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">BPM</span>
            <input
              type="range"
              min={40}
              max={120}
              step={1}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="accent-black"
              aria-label="Metronome BPM"
            />
            <span className="font-mono text-sm w-10">{bpm}</span>
          </div>
          <Button variant="ghost" onClick={tap}>
            Tap tempo
          </Button>
        </div>


        {/* Strum button */}
        {stage.id !== 'stage-3' && (
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Button size="lg" onClick={strumPressed} disabled={!running} className="min-w-[220px]">
                STRUM
              </Button>
              <div className="text-sm font-mono text-muted-foreground">
                Streak: {streak}/{stage.targetStreak}
              </div>
            </div>
            {offset && <p className="text-sm">{offset.text}</p>}
            <p className="text-xs text-muted-foreground">
              Window: ±{CLEAN_WINDOW_MS}ms around each click. {stage.targetStreak} clean strums in
              a row records a solid attempt.
            </p>
          </div>
        )}

        {stage.id === 'stage-3' && (
          <div className="space-y-3">
            <AudioPlayer />
            <p className="text-xs text-muted-foreground">
              Start the metronome and the 60 BPM guide together, then follow the recording for a
              full loop.
            </p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  record(itemId, 'strum', { score: 1, label: 'Sounds like the guide' });
                }}
              >
                Sounds like the guide
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  record(itemId, 'strum', { score: 0, label: 'Not yet' });
                }}
              >
                Not yet
              </Button>
            </div>
          </div>
        )}

        {done && (
          <p className="text-sm font-medium text-success">
            Stage {stage.order} is solid — {stage.targetStreak} clean strums in a row.
          </p>
        )}
      </section>
    </div>
  );
}

export default function GuitarStrummingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <Link href="/guitar" className="hover:underline">
            Guitar
          </Link>{' '}
          / Strumming
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Strumming</h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          Three stages from the workbook: one strum, steady downs, then following the real 60 BPM
          guide. The metronome is exact and the timing window is fixed — no rubber-stamping.
        </p>
      </header>
      <Suspense fallback={<div className="py-8" />}>
        <StrummingTrainer />
      </Suspense>
    </div>
  );
}
