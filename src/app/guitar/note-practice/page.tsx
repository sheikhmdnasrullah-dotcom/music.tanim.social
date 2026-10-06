'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePitchTracker, type StringIdentification } from '@/hooks/use-pitch-tracker';
import { SONG } from '@/data/song';
import { useProgress } from '@/state/ProgressContext';
import { midiToNoteName } from '@/lib/music/notes';
import { positionLabel } from '@/lib/music/fretboard';
import {
  evaluateNote,
  type NoteEvaluation,
  type PracticeTarget,
} from '@/lib/practice/note-evaluator';

interface PracticeState {
  isListening: boolean;
  attempts: number;
  correctStreak: number;
  evaluation: NoteEvaluation | null;
  identification: StringIdentification | null;
}

const INITIAL_STATE: PracticeState = {
  isListening: false,
  attempts: 0,
  correctStreak: 0,
  evaluation: null,
  identification: null,
};

export default function NotePracticePage() {
  const { record } = useProgress();
  const [sectionId, setSectionId] = useState(SONG.sections[0].id);
  const [lineIndex, setLineIndex] = useState(0);
  const [syllableIndex, setSyllableIndex] = useState(0);
  const [practiceState, setPracticeState] = useState<PracticeState>(INITIAL_STATE);

  const section = SONG.sections.find((s) => s.id === sectionId) ?? SONG.sections[0];
  const line = section.lines[lineIndex] ?? section.lines[0];
  const syllable = line?.syllables[syllableIndex];

  // The target comes straight from the song's melody — the same timeline everything
  // else on this page is anchored to. No frequency/MIDI conversion happens here.
  const target: PracticeTarget | null = useMemo(() => {
    if (!syllable) return null;
    return {
      noteName: midiToNoteName(syllable.note.midi),
      midi: syllable.note.midi,
      frequency: syllable.note.frequency,
    };
  }, [syllable]);

  const pitchTracker = usePitchTracker({
    clarityThreshold: 0.85,
    minVolumeAbsolute: 0.01,
    maxInputAmplitude: 1.0,
  });
  const { start, stop, setEvents } = pitchTracker;

  // The detector fires from inside requestAnimationFrame, so anything the handler needs
  // is read through refs rather than closed over (which would go stale immediately).
  const targetRef = useRef(target);
  const recordRef = useRef(record);
  const itemIdRef = useRef(`line:${section.id}:${lineIndex}`);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);
  useEffect(() => {
    itemIdRef.current = `line:${section.id}:${lineIndex}`;
  }, [section.id, lineIndex]);

  // Register the handler once. `setEvents` merges into a ref and is referentially
  // stable, so depending on the whole tracker object would re-run this every render.
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
          { toleranceCents: 50, minClarity: 0.85, minRms: 0.012 },
        );

        // Only settled judgements feed the progress store; a quiet or unclear reading
        // is not evidence about how well the line is learned.
        if (evaluation.verdict === 'correct' || evaluation.verdict === 'incorrect') {
          recordRef.current(itemIdRef.current, 'line', {
            score: evaluation.isCorrect ? 1 : 0,
            label: evaluation.verdict,
          });
        }

        setPracticeState((prev) => ({
          ...prev,
          evaluation,
          identification,
          attempts: prev.attempts + 1,
          correctStreak: evaluation.isCorrect ? prev.correctStreak + 1 : 0,
        }));
      },
    });
  }, [setEvents]);

  // Start/stop the microphone. `start` and `stop` are stable callbacks, so this runs
  // only when the learner actually toggles listening — not on every render.
  useEffect(() => {
    if (practiceState.isListening) {
      void start();
    } else {
      stop();
    }
  }, [practiceState.isListening, start, stop]);

  // Release the microphone when the learner navigates away.
  useEffect(() => () => stop(), [stop]);

  const toggleListening = useCallback(() => {
    setPracticeState((prev) => ({ ...prev, isListening: !prev.isListening }));
  }, []);

  const resetPractice = useCallback(() => {
    stop();
    setPracticeState({ ...INITIAL_STATE });
  }, [stop]);

  const goToSyllable = useCallback(
    (nextSectionId: string, nextLineIndex: number, nextSyllableIndex: number) => {
      const nextSection = SONG.sections.find((s) => s.id === nextSectionId);
      const nextLine = nextSection?.lines[nextLineIndex];
      if (!nextLine) return;
      const clampedSyllable = Math.min(nextSyllableIndex, nextLine.syllables.length - 1);
      setSectionId(nextSectionId);
      setLineIndex(nextLineIndex);
      setSyllableIndex(clampedSyllable);
      setPracticeState((prev) => ({ ...prev, evaluation: null, identification: null }));
    },
    [],
  );

  const nextSyllable = useCallback(() => {
    if (syllableIndex + 1 < (line?.syllables.length ?? 0)) {
      goToSyllable(section.id, lineIndex, syllableIndex + 1);
    } else if (lineIndex + 1 < section.lines.length) {
      goToSyllable(section.id, lineIndex + 1, 0);
    }
  }, [syllableIndex, lineIndex, section.id, section.lines.length, line, goToSyllable]);

  const previousSyllable = useCallback(() => {
    if (syllableIndex > 0) {
      goToSyllable(section.id, lineIndex, syllableIndex - 1);
    } else if (lineIndex > 0) {
      const previousLine = section.lines[lineIndex - 1];
      goToSyllable(section.id, lineIndex - 1, previousLine.syllables.length - 1);
    }
  }, [syllableIndex, lineIndex, section, goToSyllable]);

  const { evaluation, identification, attempts, correctStreak, isListening } = practiceState;
  const sample = pitchTracker.sample;
  const accuracy = attempts > 0 ? Math.round((correctStreak / Math.max(1, attempts)) * 100) : 0;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <header className="border-b border-border pb-4 mb-6">
        <h1 className="text-2xl font-bold">Note Practice</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {section.name} — {line?.id}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Section</span>
          <select
            value={sectionId}
            onChange={(event) => goToSyllable(event.target.value, 0, 0)}
            className="mt-1 w-full border border-border rounded-md px-3 py-2 bg-background text-sm"
          >
            {SONG.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Line</span>
          <select
            value={lineIndex}
            onChange={(event) => goToSyllable(section.id, Number(event.target.value), 0)}
            className="mt-1 w-full border border-border rounded-md px-3 py-2 bg-background text-sm"
          >
            {section.lines.map((l, index) => (
              <option key={l.id} value={index}>
                {l.id} — {l.text.slice(0, 24)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* TARGET */}
      <div className="mb-4 rounded-lg border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Target
        </p>
        <p className="text-xl font-mono font-semibold mt-1">
          {syllable ? `"${syllable.text}" → ${target?.noteName}` : '—'}
        </p>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          {target ? `${target.frequency.toFixed(2)} Hz · MIDI ${target.midi}` : 'No syllable selected'}
        </p>
      </div>

      <div className="mb-4">
        <button
          onClick={toggleListening}
          className={`w-full py-3 rounded-md font-medium transition-colors ${
            isListening
              ? 'bg-danger text-white hover:bg-red-700'
              : 'bg-foreground text-white hover:bg-neutral-800'
          }`}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
        {pitchTracker.error && (
          <p className="mt-2 text-sm text-danger text-center">{pitchTracker.error}</p>
        )}
      </div>

      {/* DETECTED — live reading while listening */}
      {isListening && (
        <div className="mb-4 rounded-lg border border-border bg-muted p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Detected
          </p>
          <p className="text-xl font-mono font-semibold mt-1">
            {identification
              ? `${identification.noteName} · ${identification.frequency.toFixed(1)} Hz`
              : sample && sample.frequency > 0
                ? `${sample.noteName ?? '—'} · ${sample.frequency.toFixed(1)} Hz`
                : 'Listening… pluck a note'}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            clarity {sample ? sample.clarity.toFixed(2) : '—'} · rms{' '}
            {sample ? sample.rms.toFixed(3) : '—'} · analysis{' '}
            {sample ? `${sample.analysisMs.toFixed(1)} ms` : '—'}
          </p>
        </div>
      )}

      {/* Feedback */}
      {evaluation && (
        <div
          className={`mb-4 rounded-lg border p-4 ${
            evaluation.isCorrect
              ? 'border-success bg-success/10'
              : 'border-danger bg-danger/10'
          }`}
        >
          <p className="font-medium">
            {evaluation.isCorrect ? 'Correct' : evaluation.verdict === 'too-quiet' || evaluation.verdict === 'uncertain' ? 'Keep going' : 'Not yet'}
          </p>
          <p className="text-sm mt-1">{evaluation.message}</p>
        </div>
      )}

      {/* String identification, shown honestly with its ambiguity */}
      {identification && (
        <div className="mb-4 rounded-lg border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            String
          </p>
          <p className="text-sm mt-1">
            {identification.best
              ? `${positionLabel(identification.best)} · ${Math.round(
                  identification.stringConfidence * 100,
                )}% confident`
              : 'Not on this tuning'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{identification.explanation}</p>
        </div>
      )}

      {/* Confidence detail — TARGET / DETECTED / CONFIDENCE */}
      {evaluation && (
        <details className="mb-6 rounded-lg border border-border bg-muted p-4">
          <summary className="text-xs font-semibold cursor-pointer text-muted-foreground">
            Technical detail
          </summary>
          <pre className="mt-2 text-xs font-mono whitespace-pre-wrap">{evaluation.detail}</pre>
        </details>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6 text-center text-sm">
        <div className="border border-border rounded-md p-2">
          <div className="text-muted-foreground text-xs">Attempts</div>
          <div className="font-semibold">{attempts}</div>
        </div>
        <div className="border border-border rounded-md p-2">
          <div className="text-muted-foreground text-xs">Streak</div>
          <div className="font-semibold">{correctStreak}</div>
        </div>
        <div className="border border-border rounded-md p-2">
          <div className="text-muted-foreground text-xs">Accuracy</div>
          <div className="font-semibold">{attempts > 0 ? `${accuracy}%` : '—'}</div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={previousSyllable}
          className="flex-1 py-2 rounded-md bg-muted text-foreground hover:bg-neutral-200 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={resetPractice}
          className="flex-1 py-2 rounded-md bg-muted text-foreground hover:bg-neutral-200 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={nextSyllable}
          disabled={!syllable}
          className="flex-1 py-2 rounded-md bg-foreground text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
