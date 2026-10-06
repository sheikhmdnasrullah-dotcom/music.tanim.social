'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CHORDS, difficultyLabel, type Chord } from '@/data/chords';
import { SONG_CHORD_ORDER, sectionRequirements } from '@/data/song-guitar';
import { strumChord } from '@/lib/audio/guitar-synth';
import { useProgress } from '@/state/ProgressContext';
import { ChordDiagram } from '@/components/learner/ChordDiagram';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

function chordUsedIn(chordId: string): string[] {
  const parts: string[] = [];
  for (const [sectionId, req] of Object.entries(sectionRequirements)) {
    if (req.chords.includes(chordId)) parts.push(sectionId.split('-').join(' '));
  }
  return parts;
}

function ChordLearner() {
  const params = useSearchParams();
  const { state, record } = useProgress();

  const requested = params.get('chord') ?? SONG_CHORD_ORDER[0];
  const chord: Chord | undefined = useMemo(
    () => CHORDS.find((c) => c.id === requested),
    [requested],
  );

  const [step, setStep] = useState<number | null>(null); // finger to spotlight
  const [lastResult, setLastResult] = useState<string | null>(null);

  if (!chord) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Unknown chord &ldquo;{requested}&rdquo;.</p>
      </div>
    );
  }

  const itemId = `chord:${chord.id}`;
  const rec = state.items[itemId];
  const cleanLeft = rec ? Math.max(0, 3 - rec.cleanStreak) : 3;
  const done = rec && (rec.mastery === 'mastered' || rec.mastery === 'solid');

  const selfReport = (score: number, label: string) => {
    record(itemId, 'chord', { score, label });
    setLastResult(label);
  };

  const usedIn = chordUsedIn(chord.id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-3">
        <div className="text-xs text-muted-foreground">
          <Link href="/guitar" className="hover:underline">
            Guitar
          </Link>{' '}
          / Chords / {prettyChord(chord.id)}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight">{chord.name}</h1>
          <Badge>{difficultyLabel(chord.difficulty)}</Badge>
          <Badge variant="accent">Sounds as {chord.soundsAs} with capo 2</Badge>
          {done && <Badge variant="success">Solid</Badge>}
        </div>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">{chord.feel}</p>
        {usedIn.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Used in: {usedIn.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
          </p>
        )}
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Diagram + hear */}
        <section className="border border-border rounded-2xl p-5 bg-white">
          <div className="flex flex-col items-center gap-4">
            <ChordDiagram chord={chord} highlightFinger={step} />
            <Button onClick={() => strumChord(chord)} className="w-full">
              Hear this chord
            </Button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              A synthesized pluck of the real shape — the same notes your strings make with capo 2.
            </p>
          </div>
        </section>

        {/* How to place it */}

        <section className="border border-border rounded-2xl p-5 bg-white space-y-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Place it, finger by finger
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{chord.explain}</p>

          <ol className="space-y-2">
            {chord.fingers.map((f, i) => (
              <li key={i}>
                <button
                  onClick={() => setStep(step === f.finger ? null : f.finger)}
                  aria-pressed={step === f.finger}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                    step === f.finger
                      ? 'border-accent bg-accent-light'
                      : 'border-border bg-muted/40 hover:bg-muted',
                  )}
                >
                  <span className="w-7 h-7 rounded-full bg-foreground text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm">
                    Finger {f.finger} → string {f.string}, fret {f.fret}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Tap a step to spotlight that finger on the diagram.
          </p>

          {chord.advanced && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Advanced note
              </summary>
              <p className="mt-2 text-muted-foreground leading-relaxed">{chord.advanced}</p>
            </details>
          )}
        </section>
      </div>

      {/* Honest self-check */}
      <section className="border-2 border-foreground rounded-2xl p-5 bg-white space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-lg">Practice this shape</h2>
          <div className="text-sm font-mono text-muted-foreground">
            {done ? 'Solid — keep reviewing' : `Clean in a row: ${rec?.cleanStreak ?? 0}/3`}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Strum it a few times. Be honest: if any string buzzed or a finger slid off, it is a
          miss — that information is what makes the 3-in-a-row rule work.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" onClick={() => selfReport(1, 'Nailed it')}>
            Nailed it
          </Button>
          <Button variant="secondary" onClick={() => selfReport(0.6, 'Mostly there')}>
            Mostly there
          </Button>
          <Button variant="secondary" onClick={() => selfReport(0, 'Missed')}>
            Missed
          </Button>
        </div>
        {lastResult && (
          <p className="text-sm font-medium">
            Recorded: {lastResult}.{' '}
            {done || (rec && rec.cleanStreak >= 3)
              ? 'This chord is solid. It will come back as a spaced review.'
              : cleanLeft > 0
                ? `Keep going — ${cleanLeft} more clean${cleanLeft > 1 ? ' attempts' : ''} to make it solid.`
                : ''}
          </p>
        )}
      </section>

      {/* All chords */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          All 12, in learning order
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {SONG_CHORD_ORDER.map((id, i) => {
            const c = CHORDS.find((x) => x.id === id);
            if (!c) return null;
            const r = state.items[`chord:${id}`];
            const solid = r && (r.mastery === 'mastered' || r.mastery === 'solid');
            const active = id === chord.id;
            return (
              <Link
                key={id}
                href={`/guitar/chords?chord=${id}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'border rounded-xl p-3 text-center transition-colors',
                  active
                    ? 'border-foreground bg-foreground text-white'
                    : solid
                      ? 'border-foreground bg-white'
                      : 'border-border bg-white hover:border-neutral-400',
                )}
              >
                <div className="text-[10px] font-mono opacity-60">{i + 1}</div>
                <div className="font-bold">{prettyChord(id)}</div>
                <div className={cn('text-[11px] mt-0.5', active ? 'text-white/70' : 'text-muted-foreground')}>
                  {solid ? 'solid' : r && r.attempts > 0 ? 'learning' : 'new'}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function GuitarChordsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-8" />}>
      <ChordLearner />
    </Suspense>
  );
}
