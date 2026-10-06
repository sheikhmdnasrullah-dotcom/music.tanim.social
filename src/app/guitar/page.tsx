'use client';

import Link from 'next/link';
import { CHORDS, difficultyLabel } from '@/data/chords';
import { GUITAR_SETUP, SONG_CHORD_ORDER } from '@/data/song-guitar';
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

const TOOLS = [
  {
    href: '/guitar/chords',
    title: 'Chords',
    desc: 'All 12 chords of the song — see the shape, hear it, place it finger by finger.',
  },
  {
    href: '/guitar/transitions',
    title: 'Transitions',
    desc: 'Every chord switch in the song, in learning order, with honest timing.',
  },
  {
    href: '/guitar/strumming',
    title: 'Strumming',
    desc: 'Three stages with the metronome, from one strum to following the guide.',
  },
  {
    href: '/guitar/tuner',
    title: 'Tuner',
    desc: 'Get the guitar in standard tuning before you clip on the capo.',
  },
  {
    href: '/guitar/metronome',
    title: 'Metronome',
    desc: 'A clean click for any tempo, with tap tempo.',
  },
];

export default function GuitarHubPage() {
  const { state } = useProgress();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Guitar</h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          &ldquo;Before I Learned the Words&rdquo; is played with a capo on the 2nd fret. The
          guitar side is a pillar of the workbook, not an add-on: 12 chords, one strum pattern,
          and a verse chain you can carry into the whole song.
        </p>
      </header>

      {/* Setup */}
      <section className="border border-border rounded-2xl p-5 bg-muted/30 space-y-3">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Before you start
        </h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm leading-relaxed">
          <div>
            <div className="font-semibold mb-1">Capo</div>
            <p className="text-muted-foreground">{GUITAR_SETUP.capo}</p>
          </div>
          <div>
            <div className="font-semibold mb-1">Tuning</div>
            <p className="text-muted-foreground">{GUITAR_SETUP.strings}</p>
          </div>
          <div>
            <div className="font-semibold mb-1">Strum hand</div>
            <p className="text-muted-foreground">{GUITAR_SETUP.strumHand}</p>
          </div>
        </div>
      </section>

      {/* Chord strip */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          The 12 chords, in learning order
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {SONG_CHORD_ORDER.map((id, i) => {
            const chord = CHORDS.find((c) => c.id === id);
            if (!chord) return null;
            const rec = state.items[`chord:${id}`];
            const done = rec && (rec.mastery === 'mastered' || rec.mastery === 'solid');
            const started = rec && rec.attempts > 0 && !done;
            return (
              <Link
                key={id}
                href={`/guitar/chords?chord=${id}`}
                className={cn(
                  'border rounded-xl p-3 text-center transition-colors',
                  done
                    ? 'border-foreground bg-foreground text-white'
                    : started
                      ? 'border-foreground bg-white'
                      : 'border-border bg-white hover:border-neutral-400',
                )}
              >
                <div className="text-[10px] font-mono opacity-60">{i + 1}</div>
                <div className="font-bold text-base">{prettyChord(id)}</div>
                <div className={cn('text-[11px] mt-0.5', done ? 'text-white/70' : 'text-muted-foreground')}>
                  {done ? 'solid' : started ? 'learning' : difficultyLabel(chord.difficulty)}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tools */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Tools
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="border border-border rounded-2xl p-5 bg-white hover:border-foreground transition-colors"
            >
              <div className="font-bold text-lg mb-1">{tool.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
