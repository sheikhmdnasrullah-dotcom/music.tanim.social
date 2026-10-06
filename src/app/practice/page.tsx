'use client';

import { Suspense, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SONG } from '@/data/song';
import { SECTION_PROGRESSIONS, chordForSectionLine } from '@/data/song-guitar';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { useProgress } from '@/state/ProgressContext';
import { StudioPlayer } from '@/components/music/StudioPlayer';
import { SongStage } from '@/components/music/SongStage';
import { SectionNav } from '@/components/music/SectionNav';
import { LineList } from '@/components/music/LineList';
import { SingCheck } from '@/components/music/SingCheck';
import { WhyItWorks } from '@/components/learner/WhyItWorks';
import { Button } from '@/components/ui/button';

function PracticeRoom() {
  const params = useSearchParams();
  const player = useSongPlayer();
  const { state, record, endCurrentSession } = useProgress();

  const sectionId = params.get('section') ?? SONG.sections[0].id;
  const section = SONG.sections.find((s) => s.id === sectionId) ?? SONG.sections[0];
  const lineIndex = Math.max(
    0,
    Math.min((Number(params.get('line')) || 0), section.lines.length - 1),
  );
  const line = section.lines[lineIndex];

  useEffect(() => {
    if (player.sectionId !== section.id) {
      player.setSection(section.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);

  useEffect(() => {
    player.seekToLine(line.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id, line.id]);

  const endRef = useCallback(() => endCurrentSession(), [endCurrentSession]);
  useEffect(() => endRef, [endRef]);

  const itemId = `line:${section.id}:${lineIndex}`;
  const rec = state.items[itemId];
  const done = rec && (rec.mastery === 'mastered' || rec.mastery === 'solid');
  const cleanLeft = rec ? Math.max(0, 3 - rec.cleanStreak) : 3;

  const report = (score: number, label: string) => {
    record(itemId, 'line', { score, label });
  };

  const goToLine = (sid: string, index: number) => {
    const s = SONG.sections.find((x) => x.id === sid);
    if (!s || index >= s.lines.length) return;
    const url = `/practice?section=${sid}&line=${index}`;
    window.history.replaceState(null, '', url);
    if (sid !== player.sectionId) player.setSection(sid);
    player.seekToLine(s.lines[index].id);
  };

  const nextLine = () => {
    if (lineIndex < section.lines.length - 1) {
      goToLine(section.id, lineIndex + 1);
      return;
    }
    const i = SONG.sections.findIndex((s) => s.id === section.id);
    const nextSection = SONG.sections[i + 1];
    if (nextSection) goToLine(nextSection.id, 0);
  };

  const prevLine = () => {
    if (lineIndex > 0) {
      goToLine(section.id, lineIndex - 1);
      return;
    }
    const i = SONG.sections.findIndex((s) => s.id === section.id);
    const prevSection = SONG.sections[i - 1];
    if (prevSection) goToLine(prevSection.id, prevSection.lines.length - 1);
  };

  const prog = SECTION_PROGRESSIONS[section.id];
  const lineChord = chordForSectionLine(section.id, lineIndex + 1);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-12 pb-24">
      <div className="mb-10">
        <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-1">
          Practice
        </p>
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          {section.name}
        </h1>
      </div>

      <div className="space-y-8">
        <SongStage />

        <StudioPlayer />

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevLine}
            disabled={section.id === SONG.sections[0].id && lineIndex === 0}
            aria-label="Previous line"
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Line {lineIndex + 1} of {section.lines.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextLine}
            disabled={
              section.id === SONG.sections[SONG.sections.length - 1].id &&
              lineIndex === section.lines.length - 1
            }
            aria-label="Next line"
          >
            Next
          </Button>
        </div>

        <SectionNav />

        <LineList />

        <div className="space-y-3 pt-6 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground">How did that go?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sing the line with the guide, then with it muted. Be honest — three clean sings in a
            row make the line solid.
          </p>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => report(1, 'Nailed it')}
            >
              Nailed
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => report(0.6, 'Mostly')}
            >
              Mostly
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => report(0, 'Again')}
            >
              Again
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Clean in a row:{' '}
              <span className="font-mono text-foreground">{rec?.cleanStreak ?? 0}/3</span>
            </span>
            {done ? (
              <span className="text-xs font-medium text-foreground">solid</span>
            ) : (
              cleanLeft > 0 && <span>{cleanLeft} to go</span>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-6 border-t border-border">
          <SingCheck />
        </div>

        <WhyItWorks />

        {lineChord && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Guitar under this line</p>
            <p className="text-sm">
              {prog?.name} line {lineIndex + 1} plays{' '}
              <span className="font-medium">
                {lineChord.name}
                <span className="text-muted-foreground font-normal">
                  {' '}(sounds {lineChord.soundsAs})
                </span>
              </span>
              .
            </p>
            <Link
              href={`/guitar/chords?chord=${lineChord.id}`}
              className="inline-block text-sm font-medium underline underline-offset-2"
            >
              Open the chord
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8" />}>
      <PracticeRoom />
    </Suspense>
  );
}
