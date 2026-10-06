'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CHORD_MAP } from '@/data/chords';
import { TRANSITIONS, TRANSITION_MAP, type Transition } from '@/data/song-guitar';
import { playChordPair, strumChord, getAudioContext } from '@/lib/audio/guitar-synth';
import { useProgress } from '@/state/ProgressContext';
import { ChordDiagram } from '@/components/learner/ChordDiagram';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Target time for a clean switch: two beats at 60 BPM. */
const TARGET_SECONDS = 2.0;
const GOOD_SECONDS = 3.0;

function prettyChord(id: string): string {
  const map: Record<string, string> = {
    cadd9: 'Cadd9',
    em7: 'Em7',
    am7: 'Am7',
    fmaj7: 'Fmaj7',
    dm7: 'Dm7',
    gb: 'G/B',
    gsus4: 'Gsus4',
    am: 'Am',
    em: 'Em',
  };
  return map[id] ?? id.toUpperCase();
}

function click(accent = false): void {
  const ac = getAudioContext();
  const t = ac.currentTime + 0.01;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = accent ? 1660 : 1050;
  gain.gain.setValueAtTime(accent ? 0.5 : 0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.07);
}

function Trainer({ transition }: { transition: Transition }) {
  const { state, record } = useProgress();
  const from = CHORD_MAP[transition.from];
  const to = CHORD_MAP[transition.to];
  const [measuring, setMeasuring] = useState(false);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [runningMs, setRunningMs] = useState<number | null>(null);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  const itemId = `transition:${transition.id}`;
  const rec = state.items[itemId];
  const done = rec && (rec.mastery === 'mastered' || rec.mastery === 'solid');
  const best = rec?.best ? (rec.best * 1000).toFixed(0) : null;

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const start = () => {
    if (!from || !to) return;
    strumChord(from, { velocity: 0.9 });
    click(true);
    startRef.current = performance.now();
    setLastMs(null);
    setMeasuring(true);
    const tick = () => {
      setRunningMs(performance.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopped = () => {
    cancelAnimationFrame(rafRef.current);
    const ms = performance.now() - startRef.current;
    setRunningMs(null);
    setLastMs(ms);
    setMeasuring(false);
    const seconds = ms / 1000;
    const score = seconds <= TARGET_SECONDS ? 1 : seconds <= GOOD_SECONDS ? 0.6 : 0;
    click(false);
    record(itemId, 'transition', {
      score,
      value: seconds,
      label: score >= 0.9 ? 'Clean switch' : score >= 0.6 ? 'Mostly there' : 'Rushed out',
    });
  };

  if (!from || !to) return null;
  const cleanLeft = rec ? Math.max(0, 3 - rec.cleanStreak) : 3;
  const lastSeconds = lastMs !== null ? (lastMs / 1000).toFixed(2) : null;

  return (
    <section className="border-2 border-foreground rounded-2xl bg-white p-5 md:p-7 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm font-mono text-muted-foreground">
          Target: under {TARGET_SECONDS.toFixed(1)}s · Best: {best ? `${best}ms` : '—'}
        </div>
        <div className="text-sm font-mono text-muted-foreground">
          {done ? 'Solid — spaced review' : `Clean in a row: ${rec?.cleanStreak ?? 0}/3`}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-3 flex flex-col items-center">
          <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
            From
          </div>
          <ChordDiagram chord={from} />
        </div>
        <div className="border border-border rounded-xl p-3 flex flex-col items-center">
          <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
            To
          </div>
          <ChordDiagram chord={to} />
        </div>
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-4">
        <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
          Coach
        </div>
        <p className="text-sm leading-relaxed">{transition.coach}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => playChordPair(from, to, TARGET_SECONDS)} variant="secondary">
          Hear the target ({TARGET_SECONDS.toFixed(0)}s apart)
        </Button>
        <Button onClick={() => strumChord(from)} variant="secondary">
          Play &ldquo;from&rdquo;
        </Button>
        <Button onClick={() => strumChord(to)} variant="secondary">
          Play &ldquo;to&rdquo;
        </Button>
      </div>
      <div className="border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            Press start, then make the switch on your guitar and press the big button the moment
            you land.
          </p>
          {!measuring ? (
            <Button size="lg" onClick={start}>
              Start
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={stopped}
              className="min-w-[180px] bg-danger hover:bg-red-700"
            >
              Switched!
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full',
                runningMs !== null && runningMs / 1000 > TARGET_SECONDS
                  ? 'bg-danger'
                  : 'bg-foreground',
              )}
              style={{
                width: `${Math.min(100, ((runningMs ?? 0) / 1000 / GOOD_SECONDS) * 100)}%`,
              }}
            />
          </div>
          <div className="font-mono text-sm w-24 text-right">
            {runningMs !== null
              ? `${(runningMs / 1000).toFixed(2)}s`
              : lastSeconds
                ? `${lastSeconds}s`
                : ''}
          </div>
        </div>
        {lastSeconds && !measuring && (
          <p className="text-sm">
            That took <span className="font-mono font-semibold">{lastSeconds}s</span>.{' '}
            {Number(lastSeconds) <= TARGET_SECONDS
              ? 'Clean. '
              : Number(lastSeconds) <= GOOD_SECONDS
                ? 'Close — a little rushed. '
                : 'No rush: the song waits for your hand. '}
            {done || cleanLeft === 0
              ? 'This switch is solid.'
              : `${cleanLeft} more clean to make it solid.`}
          </p>
        )}
      </div>
    </section>
  );
}

function TransitionsPage() {
  const params = useSearchParams();
  const { state } = useProgress();

  const a = params.get('a') ?? '';
  const b = params.get('b') ?? '';
  const requestedId = a && b ? `${a}-to-${b}` : '';
  const selected = useMemo(() => {
    const byId = requestedId ? TRANSITION_MAP[requestedId] : undefined;
    if (byId) return byId;
    return (
      TRANSITIONS.find((t) => {
        const r = state.items[`transition:${t.id}`];
        return !r || (r.mastery !== 'mastered' && r.mastery !== 'solid');
      }) ?? TRANSITIONS[0]
    );
  }, [requestedId, state.items]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <Link href="/guitar" className="hover:underline">
            Guitar
          </Link>{' '}
          / Transitions
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Chord switches</h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          Every switch the song asks for, in the order you should learn it. The timer is honest:
          it measures the real seconds between chords. Three clean switches in a row make one
          solid.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-2">
        {TRANSITIONS.map((t, i) => {
          const r = state.items[`transition:${t.id}`];
          const solid = r && (r.mastery === 'mastered' || r.mastery === 'solid');
          const learning = r && r.attempts > 0 && !solid;
          const active = t.id === selected.id;
          return (
            <Link
              key={t.id}
              href={`/guitar/transitions?a=${t.from}&b=${t.to}`}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'border rounded-xl p-3 text-sm transition-colors',
                active ? 'border-foreground bg-foreground text-white' : 'border-border bg-white hover:border-neutral-400',
              )}
            >
              <div className={cn('font-semibold', active ? 'text-white' : 'text-foreground')}>
                <span className={cn('font-mono text-xs mr-1', active ? 'text-white/60' : 'text-muted-foreground')}>
                  {i + 1}.
                </span>
                {prettyChord(t.from)} → {prettyChord(t.to)}
              </div>
              <div className={cn('text-xs mt-0.5', active ? 'text-white/60' : 'text-muted-foreground')}>
                {solid
                  ? `solid · best ${r.best ? (r.best * 1000).toFixed(0) + 'ms' : ''}`
                  : learning
                    ? `learning · ${r.cleanStreak}/3 clean`
                    : t.section}
              </div>
            </Link>
          );
        })}
      </div>

      <Trainer transition={selected} />
    </div>
  );
}

export default function GuitarTransitionsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-8" />}>
      <TransitionsPage />
    </Suspense>
  );
}

