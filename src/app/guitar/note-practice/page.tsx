'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePitchTracker, StringIdentification, GuitarString } from '@/hooks/use-pitch-tracker';
import { SONG } from '@/data/song';
import { useProgress } from '@/state/ProgressContext';

interface NotePracticeState {
  isListening: boolean;
  detectedNote: string | null;
  detectedString: GuitarString | null;
  detectedFret: number | null;
  confidence: number;
  isCorrect: boolean | null;
  feedback: string;
  attempts: number;
  correctStreak: number;
}

export default function NotePracticePage() {
  const { state } = useProgress();
  const [sectionId, setSectionId] = useState(SONG.sections[0].id);
  const [lineIndex, setLineIndex] = useState(0);
  const [syllableIndex, setSyllableIndex] = useState(0);

  const section = SONG.sections.find((s) => s.id === sectionId);
  const line = section?.lines[lineIndex];
  const syllable = line?.syllables[syllableIndex];

  if (!syllable) {
    return <div>No syllable available</div>;
  }

  const pitchRef = useRef<number | null>(null);
  const [practiceState, setPracticeState] = useState<NotePracticeState>({
    isListening: false,
    detectedNote: null,
    detectedString: null,
    detectedFret: null,
    confidence: 0,
    isCorrect: null,
    feedback: 'Select a section and line to begin practice',
    attempts: 0,
    correctStreak: 0,
  });

  const pitchTracker = usePitchTracker({
    clarityThreshold: 0.85,
    minVolumeAbsolute: 0.01,
    maxInputAmplitude: 1.0,
  });

  // Register the note detection event handler
  useEffect(() => {
    pitchTracker.setEvents({
      onNoteDetected: (ident) => {
        if (!ident) return;

        // Determine target string/fret from the current syllable
        const targetNoteName = syllable.note.name;
        const targetFreq = syllable.note.frequency;

        // Map MIDI to string/fret using standard tuning
        const STANDARD_TUNING_NOTES = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4
        let targetString: number | null = null;
        let targetFret = 0;

        for (let s = 0; s < 6; s++) {
          const openNote = STANDARD_TUNING_NOTES[s];
          const openFreq = targetFreq ? targetFreq : 440;
          const fretsFromOpen = Math.round((targetFreq || 440 - openNote) / 12);
          if (Math.abs(fretsFromOpen) >= 0 && Math.abs(fretsFromOpen) <= 24) {
            targetString = s + 1;
            targetFret = fretsFromOpen;
            break;
          }
        }

        const isMatch = ident.string === targetString && ident.fret === targetFret;
        const confidence = ident.confidence;
        let feedback = '';
        let isCorrect: boolean | null = false;

        if (confidence > 0.7) {
          if (isMatch) {
            feedback = 'Great! You played ' + (ident.noteName || '?') + ' on string ' + ident.string + ' fret ' + ident.fret + '.';
            isCorrect = true;
          } else {
            feedback = 'Detected ' + (ident.noteName || '?') + ' on string ' + ident.string + ' fret ' + ident.fret + ', but target was string ' + targetString + ' fret ' + targetFret + '. Keep trying!';
            isCorrect = false;
          }
        } else {
          feedback = 'Detected ' + (ident.noteName || '?') + ' — low confidence. Play clearer.';
          isCorrect = null;
        }

        setPracticeState((prev) => ({
          ...prev,
          detectedNote: ident.noteName || '?',
          detectedString: ident.string,
          detectedFret: ident.fret,
          confidence: ident.confidence,
          isCorrect,
          feedback,
          attempts: prev.attempts + 1,
          correctStreak: isCorrect ? (prev.correctStreak + 1) : 0,
        }));
      },
    });
  }, [pitchTracker, syllable]);

  // Sync isListening state with pitchTracker
  useEffect(() => {
    if (practiceState.isListening) {
      pitchTracker.start();
    } else {
      pitchTracker.stop();
    }
  }, [practiceState.isListening, pitchTracker]);

  const toggleListening = useCallback(() => {
    setPracticeState((prev) => ({ ...prev, isListening: !prev.isListening }));
  }, [practiceState.isListening]);

  // Re-apply listening state after state update
  useEffect(() => {
    if (practiceState.isListening) {
      pitchTracker.start();
    } else {
      pitchTracker.stop();
    }
  }, [practiceState.isListening, pitchTracker]);

  const nextSyllable = useCallback(() => {
    if (syllableIndex + 1 < (line?.syllables?.length || 0)) {
      setSyllableIndex(syllableIndex + 1);
    } else if (lineIndex + 1 < (section?.lines?.length || 0)) {
      setLineIndex(lineIndex + 1);
      setSyllableIndex(0);
    } else {
      setPracticeState((prev) => ({
        ...prev,
        feedback: 'Completed ' + (section?.name || 'section') + '! ' + prev.attempts + ' attempts, ' + prev.correctStreak + ' consecutive correct.',
      }));
    }
  }, [syllableIndex, lineIndex, section, line]);

  const resetPractice = useCallback(() => {
    pitchTracker.stop();
    setPracticeState({
      isListening: false,
      detectedNote: null,
      detectedString: null,
      detectedFret: null,
      confidence: 0,
      isCorrect: null,
      feedback: 'Select a section and line to begin practice',
      attempts: 0,
      correctStreak: 0,
    });
    setSyllableIndex(0);
    setLineIndex(0);
  }, [pitchTracker]);

  useEffect(() => {
    return () => {
      pitchTracker.stop();
    };
  }, [pitchTracker]);

  return (
    <div className='p-8 max-w-2xl mx-auto'>
      <header className='border-b pb-4 mb-6'>
        <h1 className='text-2xl font-bold'>
          {(section?.name || 'Section')} — {(line?.id || 'Line')}
        </h1>
        <p className='text-muted-foreground'>
          {syllable.text} — {syllable.note.name ? syllable.note.name + ' (@ ' + syllable.note.frequency.toFixed(1) + ' Hz)' : ''}
        </p>
      </header>

      <div className='mb-6'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 rounded-lg border border-border bg-background flex items-center justify-center font-medium'>
            {pitchTracker.identification?.string ? pitchTracker.identification.string + '/6' : '—'}
          </div>
          <div>
            <p className='text-sm font-medium'>Target: string {pitchTracker.identification?.string || 'any'} fret {pitchTracker.identification?.fret || 0}</p>
            <p className='text-xs text-muted-foreground'>Open note frequency: {syllable.note.frequency.toFixed(1) || '—'} Hz</p>
          </div>
        </div>

        <button
          onClick={toggleListening}
          disabled={practiceState.isListening || !syllable}
          className='mt-2 py-2 rounded-md transition-colors'>
          {practiceState.isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>

      <div className='bg-muted p-4 rounded-lg mb-6'>
        <p className='font-medium text-primary'>{practiceState.feedback}</p>
      </div>

      {practiceState.isCorrect !== null && practiceState.isCorrect && practiceState.confidence > 0.7 && (
        <div className='bg-primary/10 border border-primary rounded-md p-3 mb-4'>
          <p className='text-primary font-medium'>Correct!</p>
          <p className='text-sm'>{practiceState.feedback}</p>
        </div>
      )}

      {!practiceState.isCorrect && practiceState.attempts > 0 && (
        <div className='bg-destructive/10 border border-destructive rounded-md p-3 mb-4'>
          <p className='text-destructive font-medium'>Try again</p>
          <p className='text-sm'>{practiceState.feedback}</p>
        </div>
      )}

      <div className='mt-8 flex gap-3'>
        <button
          onClick={resetPractice}
          className='flex-1 py-2 rounded-md transition-colors bg-muted text-foreground'>
          Reset
        </button>
        <button
          onClick={nextSyllable}
          className='flex-1 py-2 rounded-md transition-colors bg-primary text-primary-foreground'
          disabled={!syllable}>
          Next →
        </button>
      </div>
    </div>
  );
}
