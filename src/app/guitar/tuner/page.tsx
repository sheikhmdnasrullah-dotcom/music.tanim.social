'use client';

import { useCallback, useState } from 'react';
import { useTuner } from '@/components/guitar/Tuner';
import { TunerStringRow } from '@/components/guitar/TunerStringRow';
import { TUNINGS } from '@/types/guitar';
import { openNoteNames } from '@/lib/music/fretboard';

type TuningKey = keyof typeof TUNINGS;

const TUNING_ORDER: TuningKey[] = ['standard', 'drop-d', 'dadgad', 'open-g', 'open-d'];

const TOLERANCE_CENTS = 10;

export default function GuitarTunerPage() {
  const [tuningKey, setTuningKey] = useState<TuningKey>('standard');

  const {
    isListening,
    toggleListening,
    stringStatuses,
    instruction,
    activeStatus,
    pitch,
    confidence,
    activeCents,
    inTune,
    error,
  } = useTuner({ tuning: tuningKey, toleranceCents: TOLERANCE_CENTS });

  const tuning = TUNINGS[tuningKey];
  const openNotes = openNoteNames(tuning);

  const handleToggle = useCallback(() => {
    toggleListening();
  }, [toggleListening]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Guitar Tuner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tuning.name} ({openNotes.join(' ')})
        </p>
      </header>

      {/* Big plain-language readout: the note, then what to do about it. */}
      <div className="mb-6 rounded-xl border border-border bg-background p-6 text-center">
        <div className="text-5xl font-mono font-bold mb-2">
          {activeStatus ? activeStatus.note : isListening ? '—' : '—'}
        </div>
        <div
          className={
            inTune
              ? 'text-2xl font-semibold text-success'
              : isListening && activeStatus
                ? 'text-2xl font-semibold text-danger'
                : 'text-2xl font-semibold text-muted-foreground'
          }
        >
          {isListening ? instruction : 'Press Start Tuning'}
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {activeStatus
            ? `Playing near ${activeStatus.note} on string ${activeStatus.string}`
            : isListening
              ? 'Pluck a single string and let it ring'
              : 'Allow microphone access when prompted'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {stringStatuses.map((status) => (
          <TunerStringRow key={status.string} status={status} toleranceCents={TOLERANCE_CENTS} />
        ))}
      </div>

      <div className="mb-6">
        <button
          onClick={handleToggle}
          className={`w-full py-3 rounded-md font-medium transition-colors ${
            isListening
              ? 'bg-danger text-white hover:bg-red-700'
              : 'bg-foreground text-white hover:bg-neutral-800'
          }`}
        >
          {isListening ? 'Stop Tuning' : 'Start Tuning'}
        </button>
        {error && <p className="mt-2 text-sm text-danger text-center">{error}</p>}
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium mb-2">Tuning</p>
        <div className="flex flex-wrap gap-2">
          {TUNING_ORDER.map((key) => (
            <button
              key={key}
              onClick={() => setTuningKey(key)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                key === tuningKey
                  ? 'border-accent bg-accent-light text-foreground'
                  : 'border-border text-muted-foreground hover:border-accent'
              }`}
            >
              {TUNINGS[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced detail — kept out of the beginner's way but always available. */}
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="text-sm font-semibold mb-2">Detection detail</h3>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div>Detected: {pitch !== null ? `${pitch.toFixed(2)} Hz` : '—'}</div>
          <div>
            Target: {activeStatus ? `${activeStatus.targetFreq.toFixed(2)} Hz` : '—'}
          </div>
          <div>Cents: {activeCents !== null ? `${activeCents > 0 ? '+' : ''}${activeCents}¢` : '—'}</div>
          <div>Confidence: {confidence !== null ? confidence.toFixed(2) : '—'}</div>
          <div>Status: {isListening ? 'Listening' : 'Not listening'}</div>
          <div>Tolerance: ±{TOLERANCE_CENTS}¢</div>
        </div>
      </div>
    </div>
  );
}
