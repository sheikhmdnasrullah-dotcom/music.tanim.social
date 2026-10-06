'use client';

import Link from 'next/link';
import { SONG } from '@/data/song';
import { CHORDS } from '@/data/chords';
import {
  SECTION_PROGRESSIONS,
  TRANSITION_MAP,
  STRUM_STAGE_MAP,
  sectionRequirements,
} from '@/data/song-guitar';
import { useProgress } from '@/state/ProgressContext';
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

export default function SongPage() {
  const { state } = useProgress();

  const isSolidOf = (id: string) => {
    const r = state.items[id];
    return !!r && (r.mastery === 'mastered' || r.mastery === 'solid');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">The song</h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          Eight sections, one loop: verse → pre-chorus → chorus, twice, then bridge, final
          chorus, and outro. {SONG.bpm} BPM in {SONG.key}, 4/4. This page shows what each part
          asks of you and whether you can play it yet — from the chords you actually know.
        </p>
      </header>

      <div className="space-y-4">
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
            <section
              key={section.id}
              className={cn(
                'rounded-2xl border p-5 space-y-4 bg-white',
                ready ? 'border-foreground' : 'border-border',
              )}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-lg">{section.name}</h2>
                  {ready ? (
                    <Badge variant="success">ready to play</Badge>
                  ) : (
                    <Badge>
                      {missing.length} thing{missing.length === 1 ? '' : 's'} to go
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    lines solid:{' '}
                    <span className="font-mono text-foreground">
                      {linesSolid}/{section.lines.length}
                    </span>
                  </span>
                  <Link
                    href={`/practice?section=${section.id}&line=0`}
                    className="text-sm font-medium underline underline-offset-2"
                  >
                    Practice this part →
                  </Link>
                </div>
              </div>

              {progChords.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {progChords.map((step, i) => {
                    const c = CHORDS.find((x) => x.id === step.chord);
                    const solid = isSolidOf(`chord:${step.chord}`);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <Link
                          href={`/guitar/chords?chord=${step.chord}`}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors',
                            solid
                              ? 'border-foreground bg-foreground text-white'
                              : 'border-border bg-muted/40 hover:border-neutral-400',
                          )}
                          title={c?.soundsAs ? `Sounds as ${c.soundsAs} with capo 2` : undefined}
                        >
                          {c?.name ?? step.chord}
                          <span
                            className={cn(
                              'ml-1.5 text-[10px] font-mono',
                              solid ? 'text-white/60' : 'text-muted-foreground',
                            )}
                          >
                            L{step.line}
                          </span>
                        </Link>
                        {i < progChords.length - 1 && (
                          <span className="text-muted-foreground">→</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!ready && (
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Still needed: {missing.slice(0, 5).join(' · ')}
                  {missing.length > 5 ? ` · +${missing.length - 5} more` : ''}.{' '}
                  <Link href="/guitar" className="underline underline-offset-2">
                    Work on them in the guitar room →
                  </Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

