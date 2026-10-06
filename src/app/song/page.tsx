'use client';

import Link from 'next/link';
import { SONG, FULL_SONG_AUDIO_DURATION } from '@/data/song';
import { FULL_SONG_DURATION } from '@/data/timings';
import { CHORDS } from '@/data/chords';
import {
  SECTION_PROGRESSIONS,
  TRANSITION_MAP,
  STRUM_STAGE_MAP,
  sectionRequirements,
} from '@/data/song-guitar';
import { useProgress } from '@/state/ProgressContext';
import { cn } from '@/lib/utils';
import { FullSongPlayer } from '@/components/music/FullSongPlayer';

/** Seconds -> "m:ss". */
function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

      {SONG.fullSongAudioFile && (
        <div className="mb-10">
          <FullSongPlayer
            src={SONG.fullSongAudioFile}
            title={`${SONG.title} — full song`}
            durationLabel={formatClock(FULL_SONG_AUDIO_DURATION)}
            note={`A standalone AI-generated take of the whole song, ${formatClock(FULL_SONG_AUDIO_DURATION)} long. It is a separate arrangement from the practice stems — whose timeline runs ${formatClock(FULL_SONG_DURATION)} — so it plays start to finish without lyric highlighting. The section timings below belong to those practice stems, not to this recording.`}
          />
        </div>
      )}

      <div className="space-y-8">
        <section className="space-y-5 border-b border-border pb-8" aria-labelledby="song-context">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              About the song
            </p>
            <h2 id="song-context" className="font-display text-2xl tracking-tight mt-1">
              A memory you did not realize was becoming a goodbye
            </h2>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
            <p>
              “Before I Learned the Words” is an intimate, melancholic acoustic song about
              losing someone before you are emotionally ready to understand that they are
              leaving. It is not dramatic heartbreak or anger. It is the quiet aftermath:
              ordinary life continuing while someone who once filled every ordinary moment is
              suddenly gone.
            </p>
            <p>
              The song begins in a quiet room on a rainy morning — cold coffee by the window,
              an empty chair across the table, and the instinct to almost say their name. From
              there, small fragments surface: rain, hands held, a familiar song, and
              conversations that never finished. The narrator is not trying to erase the
              person or move on quickly. He is learning that the final ordinary moment was
              already a goodbye.
            </p>
            <p>
              Keep the vocal close, vulnerable, and conversational. Let the verses breathe,
              let the chorus open without becoming theatrical, and strip the bridge back to
              the most exposed realization: <em>“I didn’t know the last time was the last.”</em>
              Warm fingerpicked or lightly strummed acoustic guitar should lead, with subtle
              piano, bass, and restrained organic percussion widening the emotional moments.
            </p>
          </div>

          <p className="border-l-2 border-accent pl-4 text-sm italic text-foreground leading-relaxed max-w-lg">
            The final line, “I still sit across from you,” should feel almost whispered —
            leaving the listener with the rain, the room, and the empty chair.
          </p>
        </section>

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

        <div className="pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Want to write your own song in this key? The structure above is a
            complete template.
          </p>
          <Link
            href="/your-song"
            className="inline-block mt-2 text-sm font-medium underline underline-offset-2"
          >
            Steal this structure →
          </Link>
        </div>
      </div>
    </div>
  );
}
