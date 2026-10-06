'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { useProgress } from '@/state/ProgressContext';
import { usePitchTracker } from '@/hooks/use-pitch-tracker';
import { findSyllableAtTime, type TimedLine } from '@/lib/music/timing';
import { midiToNoteName } from '@/lib/music/notes';
import { evaluateNote, type NoteEvaluation, type PracticeTarget } from '@/lib/practice/note-evaluator';

interface CheckState {
  isChecking: boolean;
  attempts: number;
  correctStreak: number;
  evaluation: NoteEvaluation | null;
}

const INITIAL: CheckState = {
  isChecking: false,
  attempts: 0,
  correctStreak: 0,
  evaluation: null,
};

/** The line that owns `time` (each line owns the breath that follows it). */
function activeLineAt(lines: TimedLine[], time: number): TimedLine | null {
  for (const line of lines) {
    if (time < line.activeEnd) return line;
  }
  return lines[lines.length - 1] ?? null;
}

function verdictCopy(evaluation: NoteEvaluation): string {
  const target = evaluation.target.noteName;
  switch (evaluation.verdict) {
    case 'correct': {
      const cents = evaluation.centsError ?? 0;
      if (Math.abs(cents) <= 15) return `That was it — your pitch matched ${target}.`;
      return `Correct — that is ${target}, ${Math.abs(Math.round(cents))}¢ ${cents > 0 ? 'sharp' : 'flat'} of the target.`;
    }
    case 'incorrect': {
      const cents = evaluation.centsError ?? 0;
      const detected = evaluation.detected.noteName ?? 'a different note';
      return `You landed on ${detected} — ${Math.abs(Math.round(cents))}¢ ${cents > 0 ? 'sharp' : 'flat'} of ${target}. Follow the pill that lights up.`;
    }
    case 'too-quiet':
      return 'I could not hear you clearly. Sing a little closer to the microphone.';
    case 'uncertain':
      return 'That note was not clear enough to judge. Try one clean, sustained note.';
  }
}

/**
 * Real singing feedback: microphone pitch analysis (pitchy/MPM) judged against
 * the melody note that is active in the timeline at the moment of detection.
 * The verdict is measured, not self-reported — and only settled judgements
 * (correct/incorrect) are written to the progress store.
 */
export function SingCheck() {
  const { section, lines, currentTime } = useSongPlayer();
  const { record } = useProgress();
  const [check, setCheck] = useState<CheckState>(INITIAL);

  const activeLine = activeLineAt(lines, currentTime);
  const activeSyllable = activeLine ? findSyllableAtTime(activeLine, currentTime) : null;

  const target: PracticeTarget | null = useMemo(() => {
    if (!activeSyllable) return null;
    return {
      noteName: midiToNoteName(activeSyllable.note.midi),
      midi: activeSyllable.note.midi,
      frequency: activeSyllable.note.frequency,
    };
  }, [activeSyllable]);

  const lineIndex = activeLine ? lines.findIndex((l) => l.id === activeLine.id) : -1;

  const tracker = usePitchTracker({
    clarityThreshold: 0.75,
    minVolumeAbsolute: 0.008,
  });
  const { start, stop, setEvents } = tracker;

  // The detector fires inside requestAnimationFrame, so handler inputs are
  // read through refs (same pattern as the note-practice page).
  const targetRef = useRef(target);
  const recordRef = useRef(record);
  const itemRef = useRef('');
  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);
  useEffect(() => {
    itemRef.current = lineIndex >= 0 ? `line:${section.id}:${lineIndex}` : '';
  }, [section.id, lineIndex]);

  useEffect(() => {
    setEvents({
      onNoteDetected: (identification, sample) => {
        const currentTarget = targetRef.current;
        if (!currentTarget) return;

        const evaluation = evaluateNote(
          currentTarget,
          {
            frequency: identification.frequency,
            clarity: identification.pitchConfidence,
            rms: sample.rms,
          },
          // Singing is less stable than plucked strings: slightly wider
          // tolerance and a lower clarity bar than the guitar room.
          { toleranceCents: 60, minClarity: 0.75, minRms: 0.01 },
        );

        if (evaluation.verdict === 'correct' || evaluation.verdict === 'incorrect') {
          const itemId = itemRef.current;
          if (itemId) {
            recordRef.current(itemId, 'line', {
              score: evaluation.isCorrect ? 1 : 0,
              label: evaluation.verdict,
              value: evaluation.centsError !== null ? Math.abs(evaluation.centsError) : undefined,
            });
          }
        }

        setCheck((prev) => ({
          ...prev,
          evaluation,
          attempts: prev.attempts + 1,
          correctStreak: evaluation.isCorrect ? prev.correctStreak + 1 : 0,
        }));
      },
    });
  }, [setEvents]);

  const toggleChecking = useCallback(() => {
    setCheck((prev) => {
      if (prev.isChecking) stop();
      else void start();
      return { ...prev, isChecking: !prev.isChecking };
    });
  }, [start, stop]);

  // Never leave the microphone open when the component unmounts.
  useEffect(() => stop, [stop]);

  const { evaluation, isChecking, attempts, correctStreak } = check;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Check my pitch</p>
          <p className="text-xs text-muted-foreground">
            Real microphone analysis against the active melody note.
          </p>
        </div>
        <button
          onClick={toggleChecking}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            isChecking ? 'bg-danger text-white hover:bg-red-700' : 'bg-foreground text-white hover:bg-neutral-800'
          }`}
        >
          {isChecking ? '■ Stop' : '🎤 Start'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-border bg-muted p-2">
          <p className="text-muted-foreground">Target</p>
          <p className="font-mono font-semibold text-sm mt-0.5">
            {target ? target.noteName : '—'}
            {activeSyllable && (
              <span className="text-muted-foreground font-normal"> · “{activeSyllable.text}”</span>
            )}
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted p-2">
          <p className="text-muted-foreground">Detected</p>
          <p className="font-mono font-semibold text-sm mt-0.5">
            {evaluation
              ? evaluation.detected.frequency > 0
                ? `${evaluation.detected.noteName ?? '?'} · ${
                    evaluation.centsError !== null
                      ? `${evaluation.centsError > 0 ? '+' : ''}${Math.round(evaluation.centsError)}¢`
                      : '—'
                  }`
                : 'no pitch'
              : isChecking
                ? 'listening…'
                : '—'}
          </p>
        </div>
      </div>

      {evaluation && (
        <div
          className={`rounded-md border p-3 text-sm ${
            evaluation.verdict === 'correct'
              ? 'border-success bg-success/10'
              : evaluation.verdict === 'incorrect'
                ? 'border-danger bg-danger/10'
                : 'border-border bg-muted'
          }`}
        >
          <p className="font-medium">{verdictCopy(evaluation)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            confidence {evaluation.confidence.toFixed(2)}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {attempts} attempt{attempts === 1 ? '' : 's'} · streak {correctStreak}
        </span>
        <details>
          <summary className="cursor-pointer">Technical detail</summary>
          {evaluation && (
            <pre className="mt-2 text-xs font-mono whitespace-pre-wrap">{evaluation.detail}</pre>
          )}
        </details>
      </div>
    </div>
  );
}
