'use client';

import Link from 'next/link';
import { SONG } from '@/data/song';
import { CURRICULUM_IDS, getMilestones } from '@/lib/practice/plan';
import { masteryCounts } from '@/lib/practice/progress-store';
import { useProgress } from '@/state/ProgressContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const { state, changeLevel } = useProgress();
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
          <p className="text-muted-foreground max-w-xl leading-relaxed">
            Everything is stored on this device. A thing becomes solid after three clean
            attempts in a row, then it returns as spaced reviews — 1, 3, 7, and 14 days out.
          </p>
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Level">
          <button
            onClick={() => changeLevel('beginner')}
            aria-pressed={state.level === 'beginner'}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              state.level === 'beginner' ? 'bg-foreground text-white' : 'bg-muted',
            )}
          >
            Beginner
          </button>
          <button
            onClick={() => changeLevel('advanced')}
            aria-pressed={state.level === 'advanced'}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              state.level === 'advanced' ? 'bg-foreground text-white' : 'bg-muted',
            )}
          >
            Advanced
          </button>
        </div>
      </header>

      {/* Overall */}
      <section className="border border-border rounded-2xl p-5 bg-white">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-bold text-lg">Overall</h2>
          <span className="text-sm font-mono text-muted-foreground">
            {totalSolid}/{total} solid
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-all"
            style={{ width: `${total > 0 ? (totalSolid / total) * 100 : 0}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          <span>
            learning: <span className="font-mono text-foreground">{counts.learning}</span>
          </span>
          <span>
            mastered: <span className="font-mono text-foreground">{counts.mastered}</span>
          </span>
          <span>
            solid: <span className="font-mono text-foreground">{counts.solid}</span>
          </span>
          <span>
            not started: <span className="font-mono text-foreground">{counts.new}</span>
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
            <div key={g.prefix} className="border border-border rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{g.label}</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {done}/{ids.length}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${ids.length ? (done / ids.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          );
        })}
        <div className="text-xs text-muted-foreground">
          {SONG.sections.length} sections · {lineIds.length} lines in the curriculum · progress
          applies to this song only.
        </div>
      </section>

      {/* Milestones */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Milestones
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={cn(
                'border rounded-xl p-4',
                m.reached ? 'border-foreground bg-white' : 'border-border bg-muted/30',
              )}
            >
              <div className={cn('font-semibold text-sm', !m.reached && 'text-muted-foreground')}>
                {m.label}
              </div>
              <div className="text-xs mt-1 text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">
            No finished sessions yet. Practice a few lines or chords and come back — this page
            keeps the last 20 sessions, on this device only.
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-xl bg-white">
            {state.sessions.slice(0, 6).map((s, i) => (
              <li key={i} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">
                    {new Date(s.endedAt).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.lines.length} item{s.lines.length === 1 ? '' : 's'} touched
                  </div>
                </div>
                <Badge>{s.minutes} min</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Back to next action */}
      <div className="border-2 border-foreground rounded-2xl p-5 bg-white flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          Ready for the next thing?
        </div>
        <Link href="/">
          <Button>What do I do next?</Button>
        </Link>
      </div>
    </div>
  );
}

