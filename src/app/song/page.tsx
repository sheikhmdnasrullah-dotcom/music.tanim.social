'use client';

import Link from 'next/link';
import { SONG } from '@/data/song';
import { CHORDS } from '@/data/chords';
import {
  SECTION_PROGRESSIONS,
  sectionRequirements,
} from '@/data/song-guitar';
import { useProgress } from '@/state/ProgressContext';
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

export default function SongPage() {
  const { state } = useProgress();

  const isSolidOf = (id: string) => {
    const r = state.items[id];
    return !!r && (r.mastery === 'mastered' || r.mastery === 'solid');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-12 pb-24">
      <div className="mb-12">
        <h1 className="font-display text-3xl tracking-tight mb-2">The song</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
          {SONG.bpm} BPM in {SONG.key}, 4/4. Eight sections that loop: verse → pre-chorus →
          chorus, twice, then bridge, final chorus, and outro.
        </p>
      </div>

      <div className="space-y-8">
        {SONG.sections.map((section) => {
          const prog = SECTION_PROGRESSIONS[section.id];
          const req = sectionRequirements(section.id);
          const missing: string[] = [];
          for (const c of req.chords) {
            if (!isSolidOf(`chord:${c}`)) missing.push(`chord ${prettyChord(c)}`);
          }
          for (const t of req.transitions) {
            const tr = TRANSITION_MAP[t];
            if (!isSolidOf(`transition:${t}`) && tr) {
              missing.push(`switch ${prettyChord(tr.from)}→${prettyChord(tr.to)}`);
            }
          }
          const strumStage = STRUM_STAGE_MAP[req.strumStage];
          if (!isSolidOf(`strum:${req.strumStage}`)) {
            missing.push(strumStage ? `strumming: ${strumStage.name}` : req.strumStage);
          }

          const linesSolid = section.lines.filter(
            (_, i) => isSolidOf(`line:${section.id}:${i}`),
          ).length;
          const ready = missing.length === 0;
          const progChords = prog?.chords ?? [];

          return (
            <section key={section.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl tracking-tight">{section.name}</h2>
                  {ready ? (
                    <p className="text-xs text-foreground mt-0.5">Ready to play</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {missing.length === 0
                        ? 'Ready to play'
                        : `${missing.length} thing${missing.length === 1 ? '' : 's'} to learn`}
                    </p>
                  )}
                </div>
                <Link
                  href={`/practice?section=${section.id}&line=0`}
                  className="text-xs font-medium underline underline-offset-2"
                >
                  Practice
                </Link>
              </div>

              <div className="space-y-3">
                {section.lines.map((line, i) => (
                  <div
                    key={line.id}
                    className="group flex items-start justify-between gap-3 py-2 border-b border-border last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-mono text-muted-foreground tabular-nums w-4 pt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-foreground">{line.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {progChords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  {progChords.map((step, i) => {
                    const c = CHORDS.find((x) => x.id === step.chord);
                    const solid = isSolidOf(`chord:${step.chord}`);
                    return (
                      <span key={i} className="flex items-center gap-1.5">
                        <Link
                          href={`/guitar/chords?chord=${step.chord}`}
                          className={cn(
                            'text-xs font-medium px-2 py-1 rounded transition-colors',
                            solid
                              ? 'bg-foreground text-white'
                              : 'bg-muted text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {c?.name ?? step.chord}
                          <span className="ml-1 text-[10px] opacity-60">L{step.line}</span>
                        </Link>
                        {i < progChords.length - 1 && (
                          <span className="text-muted-foreground text-xs">→</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
