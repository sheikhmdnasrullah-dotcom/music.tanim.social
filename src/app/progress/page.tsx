'use client';

import Link from 'next/link';
import { SONG } from '@/data/song';
import { CURRICULUM_IDS, getMilestones } from '@/lib/practice/plan';
import { masteryCounts } from '@/lib/practice/progress-store';
import { useProgress } from '@/state/ProgressContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GROUPS: { label: string; prefix: string }[] = [
  { label: 'Chords', prefix: 'chord:' },
  { label: 'Chord switches', prefix: 'transition:' },
  { label: 'Strumming', prefix: 'strum:' },
  { label: 'Sung lines', prefix: 'line:' },
];

function groupIds(prefix: string): string[] {
  return CURRICULUM_IDS.filter((id) => id.startsWith(prefix));
}

export default function ProgressPage() {
  const { state } = useProgress();
  const counts = masteryCounts(state, CURRICULUM_IDS);
  const milestones = getMilestones(state);
  const totalSolid = counts.mastered + counts.solid;
  const total = CURRICULUM_IDS.length;
  const lineIds = groupIds('line:');

  const fmtDate = (ts: number | null) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-12 pb-24">
      <div className="mb-10">
        <h1 className="font-display text-3xl tracking-tight mb-2">Progress</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
          Everything is stored on this device. A thing becomes solid after three clean attempts
          in a row, then it returns as spaced reviews — 1, 3, 7, and 14 days out.
        </p>
      </div>

      <div className="space-y-10">
        {/* Overall */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Overall</h2>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {totalSolid}/{total} solid
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: `${total > 0 ? (totalSolid / total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
            <span>
              learning: <span className="font-mono text-foreground tabular-nums">{counts.learning}</span>
            </span>
            <span>
              mastered: <span className="font-mono text-foreground tabular-nums">{counts.mastered}</span>
            </span>
            <span>
              solid: <span className="font-mono text-foreground tabular-nums">{counts.solid}</span>
            </span>
            <span>
              not started: <span className="font-mono text-foreground tabular-nums">{counts.new}</span>
            </span>
          </div>
        </section>

        {/* Groups */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            By area
          </h2>
          {GROUPS.map((g) => {
            const ids = groupIds(g.prefix);
            const c = masteryCounts(state, ids);
            const done = c.mastered + c.solid;
            return (
              <div key={g.prefix} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{g.label}</span>
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {done}/{ids.length}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all"
                    style={{ width: `${ids.length ? (done / ids.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="text-xs text-muted-foreground pt-1">
            {SONG.sections.length} sections · {lineIds.length} lines in the curriculum · progress
            applies to this song only.
          </div>
        </section>

        {/* Milestones */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Milestones
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {milestones.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'px-4 py-3 rounded-lg border transition-colors',
                  m.reached ? 'border-foreground bg-white' : 'border-border bg-muted/30',
                )}
              >
                <div className={cn('text-sm font-medium', !m.reached && 'text-muted-foreground')}>
                  {m.label}
                </div>
                <div className="text-xs mt-0.5 text-muted-foreground">
                  {m.reached ? fmtDate(m.when) : 'not yet'}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sessions */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Recent sessions
          </h2>
          {state.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No finished sessions yet. Practice a few lines or chords and come back — this page
              keeps the last 20 sessions, on this device only.
            </p>
          ) : (
            <div className="border border-border rounded-lg divide-y divide-border">
              {state.sessions.slice(0, 6).map((s, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      {new Date(s.endedAt).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.lines.length} item{s.lines.length === 1 ? '' : 's'} touched
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {s.minutes} min
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Back to next action */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">Ready for the next thing?</div>
            <Link href="/player">
              <Button size="sm">What do I do next?</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
